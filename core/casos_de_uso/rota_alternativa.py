"""🔀 RotaAlternativa: depois da falha, quais chaves fechar para religar e quanto da demanda volta (T15).

Spec 04, "Rota alternativa":
1. pega os pontos sem energia (a mesma BFS da SimularFalha);
2. Dijkstra com várias fontes a partir deles, andando pelos trechos de pé e podendo atravessar chave
   aberta. O peso é o comprimento;
3. o ponto com energia mais perto encerra o caminho, e a chave aberta do caminho é a que fecha;
4. fecha, vê quem voltou e repete enquanto sobrar área apagada com caminho até a energia (cada
   falha pode isolar mais de uma área);
5. roda o Dinic com as chaves fechadas: se o cabo não der conta, o religamento é parcial.

A penalidade por chave do 04 (🟡) ficou de fora porque não muda a resposta: como todo ponto sem
energia já é fonte do Dijkstra, o caminho mais curto atravessa exatamente uma chave aberta (do
outro lado dela, ou o ponto tem energia e o caminho acaba, ou não tem e já era fonte com distância 0).

Big-O: O(A·(V + E) log V), com A = número de chaves fechadas (um Dijkstra por rodada), mais um Dinic.
"""

from collections.abc import Callable, Iterable

from core.dominio.rede_eletrica import RedeEletrica, kva_para_va, va_para_kva
from core.grafo.alcance import Alcance
from core.grafo.dijkstra import INFINITO, Dijkstra
from core.grafo.dinic import Dinic
from core.grafo.grafo import Grafo
from core.portas.servico_de_analise import ResultadoRota

# Menos que isso de demanda faltando é arredondamento do kVA ↔ VA, não religamento parcial.
TOLERANCIA_KVA = 1e-6


class RotaAlternativa:
    def __init__(self, rede: RedeEletrica, novo_dinic: Callable[[], Dinic] = Dinic) -> None:
        self._rede = rede
        self._novo_dinic = novo_dinic
        self._trecho = {t.id: t for t in rede.trechos}
        self._chave = {c.id: c for c in rede.chaves}
        self._ponto = {rede.indice(p.id): p for p in rede.pontos}

    def executar(self, arestas_caidas: Iterable[str] = (), subestacoes_caidas: Iterable[str] = (),
                 chaves_fechadas: Iterable[str] = ()) -> ResultadoRota:
        rede = self._rede
        falhas = list(arestas_caidas) + list(subestacoes_caidas)
        fechadas = list(chaves_fechadas)

        g = rede.montar_grafo(falhas, fechadas)
        apagados_antes = self._sem_energia(g)
        para_fechar: list[str] = []
        caminho: list[str] = []
        apagados = apagados_antes
        while apagados:
            achado = self._caminho_ate_a_energia(g, apagados, set(falhas))
            if achado is None:
                break  # o que sobrou apagado não tem chave nenhuma até a energia
            caminho += achado
            para_fechar += [id_ for id_ in achado if id_ in self._chave and id_ not in fechadas + para_fechar]
            g = rede.montar_grafo(falhas, fechadas + para_fechar)
            apagados = self._sem_energia(g)

        continuam = set(apagados)
        religados = [i for i in apagados_antes if i not in continuam]
        demanda_religada = va_para_kva(self._entregue(g, religados)) if para_fechar else 0.0
        demanda_pedida = sum(self._ponto[i].demanda_kva for i in religados)
        parcial = bool(para_fechar) and (bool(apagados) or demanda_religada < demanda_pedida - TOLERANCIA_KVA)
        return ResultadoRota(para_fechar, caminho, len(religados), demanda_religada, parcial,
                             [rede.id_externo(i) for i in apagados])

    def _sem_energia(self, g: Grafo) -> list[int]:
        """Índices dos pontos que a BFS a partir de S não alcança (como na SimularFalha)."""
        rede = self._rede
        com_energia = Alcance.a_partir_de(g, [rede.s], bloqueados=(rede.t,))
        return [i for i in self._ponto if not com_energia[i]]

    def _pesos(self, g: Grafo, falhas: set[str]) -> list[float]:
        """Peso por arco: só trecho de pé e chave que pode ser fechada são andáveis."""
        rede = self._rede
        peso = [INFINITO] * len(g.para)
        for e in range(0, len(g.para), 2):
            id_ = rede.id_do_arco(e)
            if id_ in self._trecho:
                p = self._trecho[id_].comprimento_m if g.cap[e] > 0 else INFINITO
            elif id_ in self._chave:
                chave = self._chave[id_]
                # Chave em falha, ou sem capacidade, não religa nada mesmo fechada.
                andavel = not (chave.em_falha or id_ in falhas) and kva_para_va(chave.capacidade_kva) > 0
                p = chave.comprimento_m if andavel else INFINITO
            else:
                continue  # alta tensão e arestas virtuais: a rota alternativa é só na distribuição
            peso[e] = peso[e ^ 1] = p
        return peso

    def _caminho_ate_a_energia(self, g: Grafo, apagados: list[int], falhas: set[str]) -> list[str] | None:
        rede = self._rede
        r = Dijkstra.caminhos(g, apagados, self._pesos(g, falhas))
        sem = set(apagados)
        alvos = [i for i in self._ponto if i not in sem and r.dist[i] < INFINITO]
        if not alvos:
            return None
        v = min(alvos, key=lambda i: (r.dist[i], i))
        ids = []
        while r.arco_pai[v] != -1:
            e = r.arco_pai[v]
            ids.append(rede.id_do_arco(e))
            v = g.para[e ^ 1]
        return ids[::-1]

    def _entregue(self, g: Grafo, pontos: list[int]) -> int:
        """VA que chegam em T saindo destes pontos, com o Dinic no grafo das chaves fechadas."""
        rede = self._rede
        fluxo = self._novo_dinic().fluxo_maximo(g, rede.s, rede.t).fluxo
        total = 0
        for u in pontos:
            e = g.head[u]
            while e != -1:
                if g.para[e] == rede.t:
                    total += fluxo[e]
                e = g.prox[e]
        return total
