"""Kruskal: ligar pontos novos à rede com o mínimo de cabo (spec 04, "Expandir a rede").

Big-O: O(E log E) para ordenar as candidatas; o union-find custa quase O(1) por aresta depois disso.
Memória O(V + E).
"""

from dataclasses import dataclass, field
from typing import Sequence

from core.grafo.union_find import UnionFind


@dataclass(frozen=True)
class ArestaCandidata:
    """Cabo que poderia ser puxado entre u e v. custo = metros de cabo (ou outro custo qualquer)."""

    u: int
    v: int
    custo: float


@dataclass
class ResultadoKruskal:
    custo_total: float = 0.0
    escolhidas: list[int] = field(default_factory=list)  # índices em candidatas, do mais barato para o mais caro
    componentes: int = 0  # pedaços no fim (a rede já existente conta como um). 1 = tudo ligado


class Kruskal:
    @staticmethod
    def arvore_minima(
        num_vertices: int,
        candidatas: Sequence[ArestaCandidata],
        ja_conectados: Sequence[int] = (),
    ) -> ResultadoKruskal:
        """Floresta geradora mínima sobre as candidatas: liga tudo o que dá gastando o mínimo.

        ja_conectados = vértices que já estão ligados entre si (a rede existente). Vazio = árvore
        geradora mínima comum. Empate de custo: vale a ordem de candidatas (sorted é estável).
        """
        if num_vertices < 0:
            raise ValueError("Kruskal: número de vértices negativo")
        for a in candidatas:
            if not (0 <= a.u < num_vertices and 0 <= a.v < num_vertices):
                raise IndexError("Kruskal: aresta candidata com vértice fora do grafo")
        conjuntos = UnionFind(num_vertices)
        r = ResultadoKruskal(componentes=num_vertices)
        for outro in ja_conectados[1:]:
            if conjuntos.une(ja_conectados[0], outro):
                r.componentes -= 1

        ordem = sorted(range(len(candidatas)), key=lambda i: candidatas[i].custo)

        for i in ordem:
            if r.componentes <= 1:
                break
            if conjuntos.une(candidatas[i].u, candidatas[i].v):
                r.escolhidas.append(i)
                r.custo_total += candidatas[i].custo
                r.componentes -= 1
        return r
