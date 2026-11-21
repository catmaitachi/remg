"""BFS a partir de várias fontes só por arcos com capacidade (spec 04, "Falhas").

Diferente do BFS.componentes da T07: aqui o que interessa é quem as fontes alcançam, e arco de
capacidade 0 (trecho caído, chave aberta) conta como cortado.

Big-O: O(V + E). Memória O(V). Iterativo, com fila, porque BH tem dezenas de milhares de vértices.
"""

from collections import deque


class Alcance:
    @staticmethod
    def a_partir_de(g, fontes: list[int], bloqueados: tuple[int, ...] = ()) -> list[bool]:
        """alcancado[v] = existe caminho de alguma fonte até v só por arcos com cap > 0.

        Vértice bloqueado nunca é visitado, nem passa nada por ele: o caso de uso bloqueia o
        super-sorvedouro T, senão a energia "voltaria" de um ponto para outro passando por T.
        """
        alcancado = [False] * g.V
        for b in bloqueados:
            alcancado[b] = True  # marca como visto para a BFS não entrar; desmarca no fim
        fila = deque()
        for s in fontes:
            if not alcancado[s]:
                alcancado[s] = True
                fila.append(s)
        head, prox, para, cap = g.head, g.prox, g.para, g.cap
        while fila:
            u = fila.popleft()
            e = head[u]
            while e != -1:
                v = para[e]
                if cap[e] > 0 and not alcancado[v]:
                    alcancado[v] = True
                    fila.append(v)
                e = prox[e]
        for b in bloqueados:
            alcancado[b] = False
        return alcancado
