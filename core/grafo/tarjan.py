"""Tarjan sem recursão: pontes e pontos de articulação (spec 04, "Pontos críticos", T23).

Big-O: O(V + E). Memória O(V). A DFS usa pilha própria porque BH tem dezenas de milhares de
vértices e o Python para em ~1000 chamadas recursivas (aviso do spec 04).

Arco de capacidade 0 (trecho caído, chave aberta) conta como ausente, igual no resto do núcleo.
"""


class Tarjan:
    @staticmethod
    def pontes(g, ignorar: tuple[int, ...] = ()) -> list[int]:
        """Um arco por ponte (o que desce na árvore da DFS), em ordem crescente."""
        return Tarjan._rodar(g, ignorar)[0]

    @staticmethod
    def articulacoes(g, ignorar: tuple[int, ...] = ()) -> list[int]:
        """Vértices cuja queda separa o grafo, em ordem crescente."""
        return Tarjan._rodar(g, ignorar)[1]

    @staticmethod
    def _rodar(g, ignorar):
        """ignorar: vértices que ficam de fora, como o S e o T virtuais do fluxo (o T liga todos os
        pontos com demanda e esconderia todas as pontes)."""
        V, head, prox, para, cap = g.V, g.head, g.prox, g.para, g.cap
        disc = [-1] * V
        low = [0] * V
        arco_pai = [-1] * V
        prox_arco = list(head)  # onde a DFS de cada vértice parou: é o que substitui a recursão
        fora = [False] * V
        for v in ignorar:
            fora[v] = True
        eh_articulacao = [False] * V
        pontes = []
        tempo = 0

        for raiz in range(V):
            if disc[raiz] != -1 or fora[raiz]:
                continue
            disc[raiz] = low[raiz] = tempo
            tempo += 1
            filhos_da_raiz = 0
            pilha = [raiz]
            while pilha:
                v = pilha[-1]
                e = prox_arco[v]
                if e != -1:
                    prox_arco[v] = prox[e]
                    w = para[e]
                    # Pula o arco de volta ao pai, e não o vértice pai: assim duas arestas paralelas
                    # entre os mesmos pontos formam um ciclo e nenhuma delas vira ponte.
                    if cap[e] <= 0 or fora[w] or e == arco_pai[v] ^ 1:
                        continue
                    if disc[w] == -1:
                        disc[w] = low[w] = tempo
                        tempo += 1
                        arco_pai[w] = e
                        pilha.append(w)
                        if v == raiz:
                            filhos_da_raiz += 1
                    elif disc[w] < low[v]:
                        low[v] = disc[w]
                    continue
                # Todos os arcos de v vistos: v "retorna" para o pai, como no fim da chamada recursiva.
                pilha.pop()
                if v == raiz:
                    continue
                p = para[arco_pai[v] ^ 1]
                if low[v] < low[p]:
                    low[p] = low[v]
                if low[v] > disc[p]:
                    pontes.append(arco_pai[v])
                if p != raiz and low[v] >= disc[p]:
                    eh_articulacao[p] = True
            if filhos_da_raiz >= 2:
                eh_articulacao[raiz] = True

        return sorted(pontes), [v for v in range(V) if eh_articulacao[v]]
