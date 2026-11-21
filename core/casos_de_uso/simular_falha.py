"""💥 SimularFalha: quem ficou sem energia e o fluxo novo (spec 04, "Falhas", e a sequência do 03).

Mesma rede e mesmo Dinic injetados da CalcularFluxo (ver o cabeçalho de calcular_fluxo.py).
"""

from collections.abc import Callable, Iterable

from core.casos_de_uso.calcular_fluxo import CalcularFluxo, ResultadoAnalise
from core.grafo.alcance import Alcance


class SimularFalha:
    def __init__(self, rede, novo_dinic: Callable[[], object]) -> None:
        self._rede = rede
        self._calcular = CalcularFluxo(rede, novo_dinic)

    def executar(self, arestas_caidas: Iterable[str] = (), subestacoes_caidas: Iterable[str] = (),
                 chaves_fechadas: Iterable[str] = ()) -> ResultadoAnalise:
        rede = self._rede
        falhas = list(arestas_caidas) + list(subestacoes_caidas)
        g = rede.montar_grafo(falhas, chaves_fechadas)

        # A BFS sai de S, e não de cada subestação, para pegar também a subestação que está de pé
        # mas perdeu a linha AT que a alimenta. Subestação caída já chega com a transformação em 0.
        com_energia = Alcance.a_partir_de(g, [rede.s], bloqueados=(rede.t,))
        sem_energia = [p for p in rede.pontos if not com_energia[rede.indice(p.id)]]

        resultado = self._calcular.no_grafo(g)
        resultado.sem_energia = [p.id for p in sem_energia]
        resultado.demanda_sem_energia = sum(p.demanda_kva for p in sem_energia)
        return resultado
