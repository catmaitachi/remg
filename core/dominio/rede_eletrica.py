"""⚡ RedeEletrica: o tradutor entre a rede de energia e o Grafo (spec 03, "O grafo").

A camada grafo não sabe o que é subestação. É aqui que subestação, chave, falha e demanda
viram vértices, arestas e capacidades.
"""
import math
from collections import deque
from collections.abc import Iterable

from core.dominio.elementos import Chave, LinhaAT, Ponto, PontoDeSuprimento, Subestacao, Trecho
from core.grafo.grafo import Grafo

ID_S = "S"
ID_T = "T"
# O fluxo trabalha com inteiros e a demanda chega quebrada (12,5 kVA), então o grafo guarda VA.
VA_POR_KVA = 1000
INFINITO = 10**18
RAIO_LIGACAO_AT_M = 200.0
_RAIO_TERRA_M = 6_371_000.0


def kva_para_va(kva: float) -> int:
    return round(kva * VA_POR_KVA)


def va_para_kva(va: int) -> float:
    return va / VA_POR_KVA


def distancia_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine, a mesma fórmula que o prep_osm usa no comprimento dos trechos."""
    f1, f2 = math.radians(lat1), math.radians(lat2)
    df, dl = f2 - f1, math.radians(lon2 - lon1)
    a = math.sin(df / 2) ** 2 + math.cos(f1) * math.cos(f2) * math.sin(dl / 2) ** 2
    return 2 * _RAIO_TERRA_M * math.asin(math.sqrt(a))


class RedeEletrica:
    """Guarda a rede e a tabela de ids, e monta um Grafo novo para cada cenário.

    Vértices, nesta ordem: subestações, pontos de suprimento, pontos, S e T.
    Arestas, nesta ordem: trechos, chaves, linhas AT, transformações (subestação → ponto raiz),
    S → suprimento, S → subestação sem alta tensão (plano B) e ponto → T. A k-ésima aresta é sempre o arco 2k, em qualquer cenário:
    chave aberta e trecho em falha continuam no grafo, só que com capacidade 0.
    """

    def __init__(self, subestacoes: Iterable[Subestacao], pontos: Iterable[Ponto],
                 trechos: Iterable[Trecho] = (), chaves: Iterable[Chave] = (),
                 linhas_at: Iterable[LinhaAT] = ()) -> None:
        self.subestacoes = list(subestacoes)
        self.pontos = list(pontos)
        self.trechos = list(trechos)
        self.chaves = list(chaves)
        self.linhas_at = list(linhas_at)
        self._conferir_ids_unicos()
        self._subestacao = {s.id: s for s in self.subestacoes}
        self._chave = {c.id: c for c in self.chaves}

        self.pontos_de_suprimento: list[PontoDeSuprimento] = []
        ligacoes_at = self._ligar_linhas_at()

        self._ids = ([s.id for s in self.subestacoes] + [sp.id for sp in self.pontos_de_suprimento]
                     + [p.id for p in self.pontos] + [ID_S, ID_T])
        self._indice = {id_: i for i, id_ in enumerate(self._ids)}

        # (tipo, id externo ou None se a aresta é virtual, u, v, elemento)
        self._arestas: list[tuple[str, str | None, int, int, object]] = []
        for t in self.trechos:
            self._nova_aresta("trecho", t.id, self._ponta(t, t.de), self._ponta(t, t.para), t)
        for c in self.chaves:
            self._nova_aresta("chave", c.id, self._ponta(c, c.de), self._ponta(c, c.para), c)
        for linha, a, b in ligacoes_at:
            self._nova_aresta("linha_at", linha.id, self._indice[a], self._indice[b], (linha, a, b))
        for s in self.subestacoes:
            if s.ponto_raiz is not None:
                if s.ponto_raiz not in self._indice or s.ponto_raiz in self._subestacao:
                    raise KeyError(f"subestação {s.id}: ponto raiz {s.ponto_raiz!r} não é um ponto da rede")
                self._nova_aresta("transformacao", None, self._indice[s.id], self._indice[s.ponto_raiz], s)
        # Plano B do spec 03, por subestação: quem não alcança suprimento pela alta tensão liga
        # direto em S. Sem isso, a área dela fica apagada mesmo sem falha nenhuma.
        self.subestacoes_sem_alta_tensao = self._sem_alta_tensao(ligacoes_at)
        for e in self.pontos_de_suprimento + self.subestacoes_sem_alta_tensao:
            self._nova_aresta("fonte", None, self.s, self._indice[e.id], e)
        for p in self.pontos:
            if p.demanda_kva > 0:
                self._nova_aresta("demanda", None, self._indice[p.id], self.t, p)
        self._arco = {id_: 2 * k for k, (_, id_, _, _, _) in enumerate(self._arestas) if id_ is not None}

    # ---------- tabela de ids (D23) ----------

    @property
    def num_vertices(self) -> int:
        return len(self._ids)

    @property
    def s(self) -> int:
        return self._indice[ID_S]

    @property
    def t(self) -> int:
        return self._indice[ID_T]

    def indice(self, id_externo: str) -> int:
        if id_externo not in self._indice:
            raise KeyError(f"vértice desconhecido: {id_externo!r}")
        return self._indice[id_externo]

    def id_externo(self, indice: int) -> str:
        return self._ids[indice]

    def arco(self, id_aresta: str) -> int:
        """Arco de ida da aresta ("t:678" → e). O de volta é e ^ 1."""
        if id_aresta not in self._arco:
            raise KeyError(f"aresta desconhecida: {id_aresta!r}")
        return self._arco[id_aresta]

    def id_do_arco(self, e: int) -> str | None:
        """Id da aresta dona do arco e (ida ou volta). None nas arestas virtuais (S, T e transformação)."""
        return self._arestas[e >> 1][1]

    # ---------- montagem ----------

    def montar_grafo(self, falhas: Iterable[str] = (), chaves_fechadas: Iterable[str] = ()) -> Grafo:
        """Grafo do cenário: o estado de cada peça somado ao pedido (falhas e chaves fechadas).

        Não muda a rede, então pedidos diferentes podem montar grafos ao mesmo tempo.
        """
        falhas = set(falhas)
        fechadas = set(chaves_fechadas)
        podem_falhar = ({x.id for x in self.trechos} | set(self._chave) | set(self._subestacao)
                        | {x.id for x in self.linhas_at})
        for id_ in falhas - podem_falhar:
            raise KeyError(f"falha em algo que não existe ou não pode falhar: {id_!r}")
        for id_ in fechadas - set(self._chave):
            raise KeyError(f"só chave pode ser fechada: {id_!r}")

        g = Grafo(self.num_vertices)
        for tipo, _, u, v, elemento in self._arestas:
            g.add_aresta(u, v, self._capacidade(tipo, elemento, falhas, fechadas))
        return g

    def _capacidade(self, tipo: str, elemento, falhas: set[str], fechadas: set[str]) -> int:
        def caiu(x) -> bool:
            return x.em_falha or x.id in falhas

        if tipo == "trecho":
            return 0 if caiu(elemento) else kva_para_va(elemento.capacidade_kva)
        if tipo == "chave":
            aberta = elemento.aberta and elemento.id not in fechadas
            return 0 if aberta or caiu(elemento) else kva_para_va(elemento.capacidade_kva)
        if tipo == "linha_at":
            linha, a, b = elemento
            subestacao_caida = any(caiu(self._subestacao[x]) for x in (a, b) if x in self._subestacao)
            return 0 if caiu(linha) or subestacao_caida else kva_para_va(linha.capacidade_kva)
        if tipo == "transformacao":
            return 0 if caiu(elemento) else kva_para_va(elemento.capacidade_kva)
        if tipo == "fonte":
            return INFINITO
        return kva_para_va(elemento.demanda_kva)

    # ---------- construção ----------

    def _conferir_ids_unicos(self) -> None:
        vistos: set[str] = {ID_S, ID_T}
        for grupo in (self.subestacoes, self.pontos, self.trechos, self.chaves, self.linhas_at):
            for x in grupo:
                if x.id in vistos:
                    raise ValueError(f"id repetido ou reservado: {x.id!r}")
                vistos.add(x.id)

    def _nova_aresta(self, tipo: str, id_: str | None, u: int, v: int, elemento) -> None:
        self._arestas.append((tipo, id_, u, v, elemento))

    def _ponta(self, aresta: Trecho, id_: str) -> int:
        if id_ not in self._indice or id_ in (ID_S, ID_T):
            raise KeyError(f"{aresta.id}: ponta {id_!r} não é ponto nem subestação da rede")
        return self._indice[id_]

    def _subestacao_perto(self, lat: float, lon: float) -> Subestacao | None:
        melhor, melhor_d = None, RAIO_LIGACAO_AT_M
        for s in self.subestacoes:
            d = distancia_m(lat, lon, s.lat, s.lon)
            if d <= melhor_d:
                melhor, melhor_d = s, d
        return melhor

    def _sem_alta_tensao(self, ligacoes_at: list[tuple[LinhaAT, str, str]]) -> list[Subestacao]:
        """Subestações que não chegam a nenhum ponto de suprimento andando pelas linhas AT.

        Pega dois casos do OSM: a subestação sem nenhuma linha AT a menos de 200 m, e a "ilha" de
        subestações ligadas entre si por linhas AT, mas sem nenhuma linha que venha de fora.
        Sem suprimento nenhum na cidade, todas caem aqui (era o plano B original).
        """
        vizinhos: dict[str, list[str]] = {}
        for _, a, b in ligacoes_at:
            vizinhos.setdefault(a, []).append(b)
            vizinhos.setdefault(b, []).append(a)
        alcancados = {sp.id for sp in self.pontos_de_suprimento}
        fila = deque(alcancados)
        while fila:
            for v in vizinhos.get(fila.popleft(), ()):
                if v not in alcancados:
                    alcancados.add(v)
                    fila.append(v)
        return [s for s in self.subestacoes if s.id not in alcancados]

    def _ligar_linhas_at(self) -> list[tuple[LinhaAT, str, str]]:
        """Cada ponta de linha AT a até 200 m de uma subestação se liga a ela (spec 03).

        A ponta que não tem subestação por perto vira ponto de suprimento. Como os dados são
        recortados na divisa, é ali que a linha que vem de fora entra em BH. Uma ponta solta no meio
        da cidade também vira suprimento: se isso der errado com os dados reais, o plano B é ligar
        S direto nas subestações.
        """
        ligacoes = []
        for linha in self.linhas_at:
            if len(linha.coords) < 2:
                continue
            pontas = (linha.coords[0], linha.coords[-1])
            perto = [self._subestacao_perto(lat, lon) for lat, lon in pontas]
            if perto[0] is None and perto[1] is None:
                continue  # não encosta em subestação nenhuma: não leva energia a lugar algum
            if perto[0] is not None and perto[0] is perto[1]:
                continue  # sai e volta para a mesma subestação
            ids = []
            for (lat, lon), s in zip(pontas, perto):
                if s is None:
                    sp = PontoDeSuprimento(f"sp:{len(self.pontos_de_suprimento) + 1}", lat, lon)
                    self.pontos_de_suprimento.append(sp)
                    ids.append(sp.id)
                else:
                    ids.append(s.id)
            ligacoes.append((linha, ids[0], ids[1]))
        return ligacoes
