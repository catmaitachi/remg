"""Grafo não direcionado em forward-star (spec 03, "Representação na memória").

Cada aresta vira 2 arcos em par: o arco e vai de u para v e o arco e ^ 1 volta de v para u.
O par também serve de aresta reversa no grafo residual do fluxo (T09).
"""


class Grafo:
    """head[v] = primeiro arco que sai de v, ou -1 · prox[e] = próximo arco da mesma origem, ou -1
    para[e] = destino do arco e · cap[e] = capacidade (int do Python não estoura com a super-fonte)."""

    def __init__(self, num_vertices: int) -> None:
        if num_vertices < 0:
            raise ValueError("Grafo: número de vértices negativo")
        self.V = num_vertices
        self.head: list[int] = [-1] * num_vertices
        self.prox: list[int] = []
        self.para: list[int] = []
        self.cap: list[int] = []

    def add_aresta(self, u: int, v: int, capacidade: int) -> int:
        """Devolve o índice do arco u → v; o arco de volta é o índice ^ 1."""
        if not (0 <= u < self.V and 0 <= v < self.V):
            raise IndexError("Grafo.add_aresta: vértice fora do grafo")
        if capacidade < 0:
            raise ValueError("Grafo.add_aresta: capacidade negativa")
        e = len(self.para)
        # Os dois arcos nascem juntos, então e é sempre par e e ^ 1 é o seu par.
        self.para.append(v)
        self.cap.append(capacidade)
        self.prox.append(self.head[u])
        self.head[u] = e
        self.para.append(u)
        self.cap.append(capacidade)
        self.prox.append(self.head[v])
        self.head[v] = e + 1
        return e
