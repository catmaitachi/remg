"""🌊 CalcularFluxo: fluxo total, fluxo e uso por aresta e gargalos (spec 04, T13).

A rede e o Dinic chegam por parâmetro. Enquanto a T09 (Dinic) e a T11 (RedeEletrica) não estão no
remg, os testes usam peças falsas com a mesma interface dos PRs delas:
- rede: montar_grafo(falhas, chaves_fechadas) → Grafo · s · t · id_do_arco(e) · pontos (com demanda_kva)
- novo_dinic(): objeto novo por pedido (05, "Estado no servidor") com
  fluxo_maximo(g, s, t) → ResultadoFluxo(total, fluxo[e], uso[e]) e corte_minimo() → arcos do corte
"""

from collections.abc import Callable, Iterable
from dataclasses import dataclass

from core.dominio.gargalo import eh_gargalo

# O grafo guarda VA em inteiros (RedeEletrica.VA_POR_KVA, T11) e a API fala em kVA.
VA_POR_KVA = 1000


@dataclass
class ResultadoAnalise:
    """Mesmos campos do POST /analise (06), menos o tempoMs, que o adaptador mede."""
    fluxo_total: float                        # kVA que chegam em T
    demanda_total: float                      # kVA pedidos por todos os pontos
    fluxo: list[tuple[str, float, float]]     # (id, fluxo kVA, uso 0..1), só arestas com fluxo > 0
    gargalos: list[str]
    sem_energia: list[str]                    # pontos sem energia (a T14 preenche)
    demanda_sem_energia: float


class CalcularFluxo:
    def __init__(self, rede, novo_dinic: Callable[[], object]) -> None:
        self._rede = rede
        self._novo_dinic = novo_dinic

    def executar(self, falhas: Iterable[str] = (), chaves_fechadas: Iterable[str] = ()) -> ResultadoAnalise:
        rede = self._rede
        g = rede.montar_grafo(falhas, chaves_fechadas)
        dinic = self._novo_dinic()
        resultado = dinic.fluxo_maximo(g, rede.s, rede.t)
        # Arco de capacidade 0 (chave aberta, trecho caído) pode cruzar o corte sem limitar nada.
        no_corte = {e >> 1 for e in dinic.corte_minimo() if g.cap[e] > 0}

        fluxo, gargalos = [], []
        # Cada aresta é o par de arcos (2k, 2k+1); o fluxo anda num sentido só, e o outro arco
        # fica com o valor negativo (ou zero), então o fluxo da aresta é o maior dos dois.
        for e in range(0, len(g.para), 2):
            id_ = rede.id_do_arco(e)
            if id_ is None:
                continue  # aresta virtual (S, T, transformação): não aparece no mapa
            f = max(resultado.fluxo[e], resultado.fluxo[e ^ 1], 0)
            uso = f / g.cap[e] if g.cap[e] > 0 else 0.0
            if f > 0:
                fluxo.append((id_, f / VA_POR_KVA, uso))
            if eh_gargalo((e >> 1) in no_corte, uso):
                gargalos.append(id_)

        demanda = sum(p.demanda_kva for p in rede.pontos)
        return ResultadoAnalise(resultado.total / VA_POR_KVA, demanda, fluxo, gargalos, [], 0.0)
