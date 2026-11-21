"""Peças falsas para testar os casos de uso antes da T07, T09 e T11 chegarem ao remg.

Cada uma imita a interface do PR original no luzes (#40, #41, #46). Quando as peças reais
entrarem, os testes dos casos de uso podem trocar estas pelas de verdade sem mudar as asserções.
"""

from collections import deque
from dataclasses import dataclass

INFINITO = 10**18


class GrafoDeTeste:
    """Forward-star igual ao Grafo da T07: cada aresta vira os arcos e e e ^ 1."""

    def __init__(self, V):
        self.V = V
        self.head = [-1] * V
        self.prox, self.para, self.cap = [], [], []

    def add_aresta(self, u, v, capacidade):
        e = len(self.para)
        for de, ate in ((u, v), (v, u)):
            self.para.append(ate)
            self.cap.append(capacidade)
            self.prox.append(self.head[de])
            self.head[de] = len(self.para) - 1
        return e


@dataclass
class PontoDeTeste:
    id: str
    demanda_kva: float = 0.0


class RedeDeTeste:
    """Imita o RedeEletrica da T11 com a mesma ordem de vértices e as mesmas regras de capacidade.

    subestacoes: {id: (capacidade_kva, ponto_raiz)} · pontos: {id: demanda_kva}
    trechos: [(id, de, para, capacidade_kva)] · chaves: [(id, de, para, capacidade_kva)], abertas.
    Sem linha AT: S liga direto em cada subestação (plano B do spec 03).
    """

    def __init__(self, subestacoes, pontos, trechos, chaves=()):
        self.pontos = [PontoDeTeste(p, d) for p, d in pontos.items()]
        self.subestacoes = list(subestacoes)
        self._ids = list(subestacoes) + list(pontos) + ["S", "T"]
        self._indice = {x: i for i, x in enumerate(self._ids)}
        self._arestas = []  # (tipo, id ou None, u, v, capacidade VA, dono da falha)
        for tipo, lista in (("trecho", trechos), ("chave", chaves)):
            for id_, de, para, cap in lista:
                self._arestas.append((tipo, id_, self._indice[de], self._indice[para], round(cap * 1000), id_))
        for s, (cap, raiz) in subestacoes.items():
            self._arestas.append(("transformacao", None, self._indice[s], self._indice[raiz], round(cap * 1000), s))
        for s in subestacoes:
            self._arestas.append(("fonte", None, self.s, self._indice[s], INFINITO, None))
        for p in self.pontos:
            if p.demanda_kva > 0:
                self._arestas.append(("demanda", None, self._indice[p.id], self.t, round(p.demanda_kva * 1000), None))

    @property
    def s(self):
        return self._indice["S"]

    @property
    def t(self):
        return self._indice["T"]

    def indice(self, id_):
        return self._indice[id_]

    def id_externo(self, i):
        return self._ids[i]

    def id_do_arco(self, e):
        return self._arestas[e >> 1][1]

    def montar_grafo(self, falhas=(), chaves_fechadas=()):
        falhas, fechadas = set(falhas), set(chaves_fechadas)
        g = GrafoDeTeste(len(self._ids))
        for tipo, id_, u, v, cap, dono in self._arestas:
            if dono in falhas or (tipo == "chave" and id_ not in fechadas):
                cap = 0
            g.add_aresta(u, v, cap)
        return g


@dataclass
class ResultadoFluxo:
    total: int
    fluxo: list[int]
    uso: list[float]


class DinicDeTeste:
    """Fluxo máximo por caminhos aumentantes em BFS (Edmonds-Karp), só para gabarito dos testes.

    Mesma interface do Dinic da T09: fluxo_maximo(g, s, t) e depois corte_minimo().
    """

    def fluxo_maximo(self, g, s, t):
        self._g, self._s = g, s
        res = list(g.cap)
        total = 0
        while True:
            arco_pai = [-1] * g.V
            visto = [False] * g.V
            visto[s] = True
            fila = deque([s])
            while fila and not visto[t]:
                u = fila.popleft()
                e = g.head[u]
                while e != -1:
                    v = g.para[e]
                    if res[e] > 0 and not visto[v]:
                        visto[v], arco_pai[v] = True, e
                        fila.append(v)
                    e = g.prox[e]
            if not visto[t]:
                break
            gargalo, v = INFINITO, t
            while v != s:
                e = arco_pai[v]
                gargalo = min(gargalo, res[e])
                v = g.para[e ^ 1]
            v = t
            while v != s:
                e = arco_pai[v]
                res[e] -= gargalo
                res[e ^ 1] += gargalo
                v = g.para[e ^ 1]
            total += gargalo
        self._res = res
        fluxo = [c - r for c, r in zip(g.cap, res)]
        uso = [max(f, 0) / c if c > 0 else 0.0 for f, c in zip(fluxo, g.cap)]
        return ResultadoFluxo(total, fluxo, uso)

    def corte_minimo(self):
        g, res = self._g, self._res
        lado_s = [False] * g.V
        lado_s[self._s] = True
        fila = deque([self._s])
        while fila:
            u = fila.popleft()
            e = g.head[u]
            while e != -1:
                if res[e] > 0 and not lado_s[g.para[e]]:
                    lado_s[g.para[e]] = True
                    fila.append(g.para[e])
                e = g.prox[e]
        return [e for e in range(len(g.para)) if lado_s[g.para[e ^ 1]] and not lado_s[g.para[e]]]
