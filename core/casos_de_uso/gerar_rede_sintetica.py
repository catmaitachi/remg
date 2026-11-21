"""🌳 GerarRedeSintetica: das ruas e subestações saem os alimentadores, as chaves e as capacidades (T12).

Spec 02 ("Rede de distribuição sintética") e 04 ("Gerar a rede"):
1. cada subestação de distribuição liga no ponto de rua mais perto (o ponto raiz);
2. Dijkstra com várias fontes a partir das raízes divide a cidade em áreas de atendimento;
3. o arco pai de cada ponto vira cabo (a árvore é o alimentador), a rua entre áreas diferentes vira
   chave aberta e as outras ruas ficam sem cabo;
4. Q2 🟡: demanda proporcional à rua em volta do ponto, e cabo = demanda que passa por ele × fator
   aleatório entre 0,8 e 1,5, para gerar gargalos de propósito. Semente fixa (D24).

Entrada: os DadosDaRede da porta FonteDeRede (T10). Saída: as peças do domínio e, com
RedeGerada.montar_rede(), a RedeEletrica (T11) pronta para os outros casos de uso.

Big-O: O(P·S) para achar as raízes (S ≈ 19 subestações) + Dijkstra O((V + E) log V) + ordenar por
distância O(V log V).
"""

import math
from dataclasses import dataclass, field

from core.dominio.elementos import Chave, LinhaAT, Ponto, Subestacao, Trecho
from core.dominio.rede_eletrica import RedeEletrica, distancia_m
from core.grafo.dijkstra import INFINITO, Dijkstra
from core.grafo.grafo import Grafo
from core.portas.fonte_de_rede import DadosDaRede

SEMENTE = 2026
TIPO_DISTRIBUICAO = "distribution"
# 🟡 Q2: com ~35 mil pontos e ~53 mil ruas em BH, isto dá algumas centenas de MVA na cidade inteira.
KVA_POR_METRO = 0.05
FATOR_CABO = (0.8, 1.5)
# A subestação aguenta a demanda da área com folga; quem deve gargalar é o cabo, não ela.
FOLGA_SUBESTACAO = 1.2
CAPACIDADE_MINIMA_KVA = 1.0
# 🟡 O OSM não traz a capacidade da linha AT. Folgada de propósito: quem limita é a subestação.
CAPACIDADE_LINHA_AT_KVA = 100_000.0


class GeradorAleatorio:
    """Congruencial linear de 64 bits (constantes do PCG/Knuth).

    O núcleo não pode usar o módulo random (MODULOS_PERMITIDOS), e a semente fixa precisa dar a
    mesma rede em qualquer máquina e versão do Python.
    """

    _A, _C, _MASCARA = 6364136223846793005, 1442695040888963407, (1 << 64) - 1

    def __init__(self, semente: int) -> None:
        self._x = semente & self._MASCARA

    def uniforme(self, a: float, b: float) -> float:
        self._x = (self._A * self._x + self._C) & self._MASCARA
        return a + (b - a) * ((self._x >> 11) / (1 << 53))


@dataclass
class RedeGerada:
    subestacoes: list[Subestacao] = field(default_factory=list)
    pontos: list[Ponto] = field(default_factory=list)
    trechos: list[Trecho] = field(default_factory=list)
    chaves: list[Chave] = field(default_factory=list)
    linhas_at: list[LinhaAT] = field(default_factory=list)
    pontos_isolados: int = 0     # pontos que nenhuma subestação alcança pelas ruas: ficam fora da rede
    ruas_sem_cabo: int = 0

    def montar_rede(self) -> RedeEletrica:
        return RedeEletrica(self.subestacoes, self.pontos, self.trechos, self.chaves, self.linhas_at)


class GerarRedeSintetica:
    def __init__(self, semente: int = SEMENTE) -> None:
        self._semente = semente

    def executar(self, dados: DadosDaRede) -> RedeGerada:
        pontos = list(dados.pontos)
        indice = {p.id_osm: i for i, p in enumerate(pontos)}
        g = Grafo(len(pontos))
        peso, ruas_validas = [], []
        for r in dados.trechos:
            if r.de in indice and r.para in indice and r.de != r.para:
                g.add_aresta(indice[r.de], indice[r.para], 1)
                peso += [r.comprimento_m, r.comprimento_m]
                ruas_validas.append(r)

        subestacoes = [s for s in dados.subestacoes if s.tipo == TIPO_DISTRIBUICAO]
        raizes = self._raizes(subestacoes, pontos)
        cam = Dijkstra.caminhos(g, raizes, peso)

        # Demanda: metade de cada rua vai para cada ponta (só as ruas dentro da rede).
        demanda = [0.0] * len(pontos)
        for k, r in enumerate(ruas_validas):
            u, v = g.para[2 * k + 1], g.para[2 * k]
            if cam.dist[u] != INFINITO:
                demanda[u] += KVA_POR_METRO * r.comprimento_m / 2
                demanda[v] += KVA_POR_METRO * r.comprimento_m / 2

        # Demanda que passa pelo cabo pai de v = demanda da subárvore de v. Somando das folhas para
        # a raiz (distância decrescente), cada filho já está somado quando o pai é visitado.
        alcancados = [v for v in range(len(pontos)) if cam.dist[v] != INFINITO]
        abaixo = demanda[:]
        for v in sorted(alcancados, key=lambda v: cam.dist[v], reverse=True):
            if cam.pai[v] != -1:
                abaixo[cam.pai[v]] += abaixo[v]

        sorteio = GeradorAleatorio(self._semente)
        cap_cabo_pai = [0.0] * len(pontos)
        rede = RedeGerada()
        for k, r in enumerate(ruas_validas):
            u, v = g.para[2 * k + 1], g.para[2 * k]
            if cam.dist[u] == INFINITO:
                rede.ruas_sem_cabo += 1
            elif cam.arco_pai[v] >> 1 == k or cam.arco_pai[u] >> 1 == k:
                filho = v if cam.arco_pai[v] >> 1 == k else u
                cap = max(abaixo[filho] * sorteio.uniforme(*FATOR_CABO), CAPACIDADE_MINIMA_KVA)
                cap_cabo_pai[filho] = cap
                rede.trechos.append(Trecho(f"t:{r.id}", f"p:{r.de}", f"p:{r.para}", round(cap, 2),
                                                    r.comprimento_m))
            elif cam.fonte[u] != cam.fonte[v]:
                rede.chaves.append((k, r, u, v))  # a capacidade depende dos cabos, que ainda não acabaram
            else:
                rede.ruas_sem_cabo += 1

        # 🟡 A chave aguenta o maior cabo que chega nas suas pontas: fechar a chave não deve virar o
        # gargalo antes do cabo que já existia ali.
        rede.chaves = [Chave(f"c:{r.id}", f"p:{r.de}", f"p:{r.para}",
                                      round(max(cap_cabo_pai[u], cap_cabo_pai[v], CAPACIDADE_MINIMA_KVA), 2),
                                      r.comprimento_m)
                       for k, r, u, v in rede.chaves]

        demanda_area = {}
        for v in alcancados:
            demanda_area[cam.fonte[v]] = demanda_area.get(cam.fonte[v], 0.0) + demanda[v]
        for s, raiz in zip(subestacoes, raizes):
            cap = max(demanda_area.get(raiz, 0.0) * FOLGA_SUBESTACAO, CAPACIDADE_MINIMA_KVA)
            rede.subestacoes.append(Subestacao(f"s:{s.id_osm}", s.nome, s.lat, s.lon, round(cap, 2),
                                                        ponto_raiz=f"p:{pontos[raiz].id_osm}"))
        rede.pontos = [Ponto(f"p:{pontos[v].id_osm}", pontos[v].lat, pontos[v].lon, round(demanda[v], 3))
                       for v in alcancados]
        rede.pontos_isolados = len(pontos) - len(alcancados)
        rede.linhas_at = [LinhaAT(f"at:{l.id_osm}", l.tensao or 0, CAPACIDADE_LINHA_AT_KVA, list(l.coords))
                          for l in dados.linhas_at]
        return rede

    @staticmethod
    def _raizes(subestacoes, pontos) -> list[int]:
        """Ponto mais perto de cada subestação, sem repetir: duas subestações na mesma raiz deixariam
        uma delas sem área (o Dijkstra só guarda uma fonte por ponto)."""
        if subestacoes and not pontos:
            raise ValueError("GerarRedeSintetica: há subestações mas nenhum ponto de rua")
        usados, raizes = set(), []
        for s in subestacoes:
            melhor, melhor_d = -1, math.inf
            for i, p in enumerate(pontos):
                if i not in usados:
                    d = distancia_m(s.lat, s.lon, p.lat, p.lon)
                    if d < melhor_d:
                        melhor, melhor_d = i, d
            if melhor == -1:
                raise ValueError("GerarRedeSintetica: mais subestações do que pontos de rua")
            usados.add(melhor)
            raizes.append(melhor)
        return raizes
