"""T08: heap binária e Dijkstra com várias fontes. Os desenhos estão em docs/testes/T08-heap-dijkstra.md."""

import math
import unittest

from core.grafo.dijkstra import INFINITO, Dijkstra
from core.grafo.heap_binaria import HeapBinaria

INF = math.inf


class GrafoDeTeste:
    """Forward-star mínimo, igual ao Grafo da T07, para o teste não depender dela."""

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


def montar(V, arestas):
    """Os dois arcos de cada aresta têm o mesmo peso."""
    g, peso = GrafoDeTeste(V), []
    for u, v, p in arestas:
        g.add_aresta(u, v, 1)
        peso += [p, p]
    return g, peso


def esvaziar(h):
    r = []
    while not h.vazia():
        r.append(h.pop()[1])
    return r


GRAFO_A = [(0, 1, 4), (0, 2, 1), (2, 1, 2), (1, 3, 1), (2, 3, 5), (3, 4, 3)]


class TestHeap(unittest.TestCase):
    def test_ordem_crescente(self):
        h = HeapBinaria()
        self.assertTrue(h.vazia())
        for c in [5, 3, 8, 1, 9, 2, 7]:
            h.push(c, c * 10)
        self.assertFalse(h.vazia())
        self.assertEqual(esvaziar(h), [10, 20, 30, 50, 70, 80, 90])

    def test_chaves_repetidas_empate_pelo_menor_valor(self):
        h = HeapBinaria()
        for c, v in [(4, 7), (1, 3), (4, 2), (1, 9), (4, 5), (1, 3)]:
            h.push(c, v)
        self.assertEqual(esvaziar(h), [3, 3, 9, 2, 5, 7])

    def test_intercalando_push_e_pop(self):
        h = HeapBinaria()
        h.push(10, 1)
        h.push(5, 2)
        self.assertEqual(h.pop(), (5, 2))
        h.push(1, 3)
        h.push(7, 4)
        self.assertEqual(h.pop(), (1, 3))
        self.assertEqual(esvaziar(h), [4, 1])

    def test_pop_na_heap_vazia(self):
        h = HeapBinaria()
        with self.assertRaises(IndexError):
            h.pop()
        h.push(1, 1)
        h.pop()
        with self.assertRaises(IndexError):
            h.pop()


class TestDijkstra(unittest.TestCase):
    def test_grafo_a_uma_fonte(self):
        g, peso = montar(6, GRAFO_A)
        r = Dijkstra.caminhos(g, [0], peso)
        self.assertEqual(r.dist, [0, 3, 1, 4, 7, INF])
        self.assertEqual(r.pai, [-1, 2, 0, 1, 3, -1])
        self.assertEqual(r.fonte, [0, 0, 0, 0, 0, -1])
        for v in range(1, 5):
            self.assertEqual(g.para[r.arco_pai[v]], v)
            self.assertEqual(g.para[r.arco_pai[v] ^ 1], r.pai[v])
        self.assertEqual((r.arco_pai[0], r.arco_pai[5]), (-1, -1))

    def test_grafo_b_duas_fontes(self):
        g, peso = montar(6, [(0, 1, 2), (1, 2, 2), (2, 3, 3), (3, 4, 1), (4, 5, 1)])
        r = Dijkstra.caminhos(g, [0, 5], peso)
        self.assertEqual(r.dist, [0, 2, 4, 2, 1, 0])
        self.assertEqual(r.fonte, [0, 0, 0, 5, 5, 5])
        self.assertEqual(r.pai, [-1, 0, 1, 4, 5, -1])

    def test_empate_fica_com_a_fonte_de_menor_numero(self):
        g, peso = montar(3, [(0, 1, 1), (1, 2, 1)])
        self.assertEqual(Dijkstra.caminhos(g, [2, 0], peso).fonte, [0, 0, 2])

    def test_peso_infinito_bloqueia_e_capacidade_zero_nao(self):
        g, peso = montar(6, GRAFO_A)
        peso[2] = peso[3] = INFINITO  # aresta 0–2
        self.assertEqual(Dijkstra.caminhos(g, [0], peso).dist, [0, 4, 6, 5, 8, INF])

        # Chave aberta tem capacidade 0, mas a rota alternativa precisa passar por ela.
        h, peso2 = montar(2, [(0, 1, 3)])
        h.cap[0] = h.cap[1] = 0
        self.assertEqual(Dijkstra.caminhos(h, [0], peso2).dist, [0, 3])

    def test_sem_fontes_fonte_repetida_e_entradas_invalidas(self):
        g, peso = montar(3, [(0, 1, 1), (1, 2, 1)])
        self.assertEqual(Dijkstra.caminhos(g, [], peso).dist, [INF, INF, INF])
        self.assertEqual(Dijkstra.caminhos(g, [1, 1], peso).dist, [1, 0, 1])
        with self.assertRaises(ValueError):
            Dijkstra.caminhos(g, [0], [1, 1])
        with self.assertRaises(ValueError):
            Dijkstra.caminhos(g, [0], [1, 1, -1, -1])
        with self.assertRaises(ValueError):
            Dijkstra.caminhos(g, [0], [1, 1, math.nan, math.nan])
        with self.assertRaises(IndexError):
            Dijkstra.caminhos(g, [3], peso)


if __name__ == "__main__":
    unittest.main()
