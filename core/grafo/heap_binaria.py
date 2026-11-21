"""Heap binária de mínimo feita à mão (a regra do projeto proíbe heapq e queue.PriorityQueue).

Big-O: push O(log n) · pop O(log n) · vazia O(1). Memória O(n).
"""


class HeapBinaria:
    """Árvore completa guardada numa lista: os filhos de i estão em 2i+1 e 2i+2, o pai em (i-1)//2.

    Cada item é a tupla (chave, valor). Sai primeiro a menor chave; no empate, o menor valor,
    para o resultado não depender da ordem de inserção.
    """

    def __init__(self) -> None:
        self._itens: list[tuple[float, int]] = []

    def push(self, chave: float, valor: int) -> None:
        itens = self._itens
        itens.append((chave, valor))
        # Sobe o item novo enquanto ele for menor que o pai.
        i = len(itens) - 1
        while i > 0:
            pai = (i - 1) // 2
            if not itens[i] < itens[pai]:
                break
            itens[i], itens[pai] = itens[pai], itens[i]
            i = pai

    def pop(self) -> tuple[float, int]:
        """Remove e devolve (chave, valor) de menor chave. Heap vazia lança IndexError."""
        itens = self._itens
        if not itens:
            raise IndexError("HeapBinaria.pop: heap vazia")
        topo = itens[0]
        # O último item tapa o buraco da raiz e desce até o lugar certo.
        ultimo = itens.pop()
        n = len(itens)
        if n == 0:
            return topo
        itens[0] = ultimo
        i = 0
        while True:
            esq, dir = 2 * i + 1, 2 * i + 2
            menor = i
            if esq < n and itens[esq] < itens[menor]:
                menor = esq
            if dir < n and itens[dir] < itens[menor]:
                menor = dir
            if menor == i:
                break
            itens[i], itens[menor] = itens[menor], itens[i]
            i = menor
        return topo

    def vazia(self) -> bool:
        return not self._itens
