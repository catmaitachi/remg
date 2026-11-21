"""Edmonds-Karp (fluxo máximo por caminhos mais curtos), só para comparar com o Dinic (spec 04).

Big-O: O(V·E²). Cada rodada é uma BFS, O(V + E), que acha o caminho de S a T com menos arcos, e há
no máximo O(V·E) rodadas. O Dinic aproveita uma BFS para vários caminhos; aqui é uma BFS por caminho,
e é essa diferença que o benchmark mostra. Memória O(V + E).
"""

from core.grafo.dinic import ResultadoFluxo
from core.grafo.grafo import Grafo


class EdmondsKarp:
    """Mesma interface do Dinic, para um trocar pelo outro: um objeto por pedido."""

    def __init__(self) -> None:
        self._g: Grafo | None = None
        self._residual: list[int] = []
        self._alcancado: list[bool] = []  # quem a última BFS alcançou: o lado de S no corte

    def fluxo_maximo(self, g: Grafo, s: int, t: int) -> ResultadoFluxo:
        """Não altera o grafo: trabalha numa cópia das capacidades."""
        if not (0 <= s < g.V and 0 <= t < g.V):
            raise IndexError("EdmondsKarp.fluxo_maximo: vértice fora do grafo")
        if s == t:
            raise ValueError("EdmondsKarp.fluxo_maximo: S e T são o mesmo vértice")
        self._g = g
        self._residual = residual = list(g.cap)
        r = ResultadoFluxo()
        while True:
            arco_pai = self._bfs(s, t)
            if arco_pai[t] == -1:
                break
            gargalo = None
            v = t
            while v != s:
                e = arco_pai[v]
                gargalo = residual[e] if gargalo is None else min(gargalo, residual[e])
                v = g.para[e ^ 1]
            v = t
            while v != s:
                e = arco_pai[v]
                residual[e] -= gargalo
                residual[e ^ 1] += gargalo
                v = g.para[e ^ 1]
            r.total += gargalo
        for e in range(len(g.cap)):
            # Mesmo cálculo do Dinic: o par começa com a mesma capacidade, então cap - residual é o
            # fluxo líquido com sinal.
            f = g.cap[e] - residual[e]
            r.fluxo.append(f)
            r.uso.append(abs(f) / g.cap[e] if g.cap[e] > 0 else 0.0)
        return r

    def corte_minimo(self) -> list[int]:
        """Igual ao do Dinic: arcos com capacidade > 0 do lado de S para o lado de T."""
        if self._g is None:
            raise RuntimeError("EdmondsKarp.corte_minimo: rode fluxo_maximo antes")
        g, alcancado = self._g, self._alcancado
        corte = []
        for u in range(g.V):
            if not alcancado[u]:
                continue
            e = g.head[u]
            while e != -1:
                if g.cap[e] > 0 and not alcancado[g.para[e]]:
                    corte.append(e)
                e = g.prox[e]
        return corte

    def _bfs(self, s: int, t: int) -> list[int]:
        """arco_pai[v] = arco que chegou em v pelo caminho com menos arcos; -1 se não chegou."""
        g, residual = self._g, self._residual
        arco_pai = [-1] * g.V
        alcancado = [False] * g.V
        alcancado[s] = True
        # Fila num vetor com dois índices: list.pop(0) custaria O(V) a cada saída.
        fila = [0] * g.V
        inicio, fim = 0, 1
        fila[0] = s
        while inicio < fim and not alcancado[t]:
            u = fila[inicio]
            inicio += 1
            e = g.head[u]
            while e != -1:
                v = g.para[e]
                if residual[e] > 0 and not alcancado[v]:
                    alcancado[v] = True
                    arco_pai[v] = e
                    fila[fim] = v
                    fim += 1
                e = g.prox[e]
        # Quando T não é alcançado, a BFS rodou até o fim: alcancado é o lado de S do corte.
        self._alcancado = alcancado
        return arco_pai
