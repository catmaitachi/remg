"""Union-find (conjuntos disjuntos), a peça do Kruskal que detecta ciclo.

Big-O: acha e une custam O(α(n)), quase constante, com compressão de caminho e união por tamanho.
"""


class UnionFind:
    """Conjuntos disjuntos 0..n-1 com compressão de caminho e união por tamanho."""

    def __init__(self, n: int) -> None:
        if n < 0:
            raise ValueError("UnionFind: número de elementos negativo")
        self._pai = list(range(n))
        self._tamanho = [1] * n  # só vale para quem é representante

    def acha(self, v: int) -> int:
        """Representante do conjunto de v. Dois vértices estão juntos quando o representante é o mesmo."""
        # Checagem explícita: em Python, pai[-1] não dá erro, pega o último elemento.
        if not 0 <= v < len(self._pai):
            raise IndexError("UnionFind.acha: elemento fora do conjunto")
        raiz = v
        while self._pai[raiz] != raiz:
            raiz = self._pai[raiz]
        # Segunda passada: todo mundo do caminho passa a apontar direto para a raiz.
        while self._pai[v] != raiz:
            seguinte = self._pai[v]
            self._pai[v] = raiz
            v = seguinte
        return raiz

    def une(self, a: int, b: int) -> bool:
        """Junta os conjuntos de a e b. Devolve False se já estavam juntos (no Kruskal, seria um ciclo)."""
        a = self.acha(a)
        b = self.acha(b)
        if a == b:
            return False
        if self._tamanho[a] < self._tamanho[b]:
            a, b = b, a
        self._pai[b] = a
        self._tamanho[a] += self._tamanho[b]
        return True
