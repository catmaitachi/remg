"""🌊 CalcularFluxo: fluxo total, fluxo e uso por aresta e gargalos (spec 04, T13)."""

from collections.abc import Callable, Iterable

from core.dominio.gargalo import eh_gargalo
from core.dominio.rede_eletrica import RedeEletrica, va_para_kva
from core.grafo.dinic import Dinic
from core.grafo.grafo import Grafo
from core.portas.servico_de_analise import ResultadoAnalise


class CalcularFluxo:
    def __init__(self, rede: RedeEletrica, novo_dinic: Callable[[], Dinic] = Dinic) -> None:
        """novo_dinic: um objeto novo por pedido (05, "Estado no servidor"). Dá para trocar pelo
        EdmondsKarp, que tem a mesma interface, para comparar os dois na mesma rede."""
        self._rede = rede
        self._novo_dinic = novo_dinic

    def executar(self, falhas: Iterable[str] = (), chaves_fechadas: Iterable[str] = ()) -> ResultadoAnalise:
        return self.no_grafo(self._rede.montar_grafo(falhas, chaves_fechadas))

    def no_grafo(self, g: Grafo) -> ResultadoAnalise:
        """Para quem já montou o grafo do cenário (a SimularFalha usa o mesmo grafo na BFS)."""
        rede = self._rede
        dinic = self._novo_dinic()
        resultado = dinic.fluxo_maximo(g, rede.s, rede.t)
        no_corte = {e >> 1 for e in dinic.corte_minimo()}

        fluxo, gargalos = [], []
        # Cada aresta é o par de arcos (2k, 2k+1), e o arco 2k vai de `de` para `para` (a RedeEletrica
        # cria a aresta com u = de). O sinal de fluxo[2k] é o sentido que o 06 pede: positivo = de → para.
        for e in range(0, len(g.para), 2):
            id_ = rede.id_do_arco(e)
            if id_ is None:
                continue  # aresta virtual (S, T, transformação): não aparece no mapa
            f = resultado.fluxo[e]
            uso = resultado.uso[e]
            if f != 0:
                fluxo.append((id_, va_para_kva(f), uso))
            if eh_gargalo((e >> 1) in no_corte, uso):
                gargalos.append(id_)

        demanda = sum(p.demanda_kva for p in rede.pontos)
        return ResultadoAnalise(va_para_kva(resultado.total), demanda, fluxo, gargalos, [], 0.0)
