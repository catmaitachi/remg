"""BFS de componentes conectados (spec 04, "Falhas"). Big-O: O(V + E), memória O(V)."""

from core.grafo.grafo import Grafo


class BFS:
    @staticmethod
    def componentes(g: Grafo) -> list[int]:
        """componente[v] = número do componente de v (0, 1, 2… na ordem do menor vértice de cada um).

        Arco com capacidade 0 não liga nada: é assim que chave aberta e trecho em falha cortam a rede (spec 03).
        """
        componente = [-1] * g.V
        # Fila num vetor com dois índices: list.pop(0) custaria O(V) a cada saída.
        fila = [0] * g.V
        proximo_componente = 0
        for origem in range(g.V):
            if componente[origem] != -1:
                continue
            inicio = fim = 0
            componente[origem] = proximo_componente
            fila[fim] = origem
            fim += 1
            while inicio < fim:
                u = fila[inicio]
                inicio += 1
                e = g.head[u]
                while e != -1:
                    v = g.para[e]
                    if g.cap[e] > 0 and componente[v] == -1:
                        componente[v] = proximo_componente
                        fila[fim] = v
                        fim += 1
                    e = g.prox[e]
            proximo_componente += 1
        return componente
