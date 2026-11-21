"""T07: estrutura do grafo e BFS. Os desenhos dos grafos estão em docs/testes/T07-grafo-bfs.md."""

import unittest

from core.grafo.bfs import BFS
from core.grafo.grafo import Grafo


def vizinhos(g, u):
    r = []
    e = g.head[u]
    while e != -1:
        r.append(g.para[e])
        e = g.prox[e]
    return sorted(r)


def montar(V, arestas, capacidade=1):
    g = Grafo(V)
    for u, v in arestas:
        g.add_aresta(u, v, capacidade)
    return g


class TestGrafo(unittest.TestCase):
    def test_add_aresta_cria_os_dois_arcos_em_par(self):
        g = Grafo(3)
        a = g.add_aresta(0, 1, 10)
        b = g.add_aresta(1, 2, 7)

        self.assertEqual((a, b), (0, 2))
        self.assertEqual(len(g.para), 4)
        self.assertEqual((g.para[a], g.para[a ^ 1]), (1, 0))
        self.assertEqual((g.para[b], g.para[b ^ 1]), (2, 1))
        self.assertEqual((g.cap[a], g.cap[a ^ 1]), (10, 10))
        self.assertEqual(vizinhos(g, 0), [1])
        self.assertEqual(vizinhos(g, 1), [0, 2])
        self.assertEqual(vizinhos(g, 2), [1])

    def test_recusa_vertice_fora_e_capacidade_negativa(self):
        g = Grafo(2)
        with self.assertRaises(IndexError):
            g.add_aresta(0, 2, 1)
        with self.assertRaises(IndexError):
            g.add_aresta(-1, 0, 1)
        with self.assertRaises(ValueError):
            g.add_aresta(0, 1, -5)
        with self.assertRaises(ValueError):
            Grafo(-1)


class TestBFS(unittest.TestCase):
    def test_grafo_1_conexo_um_componente_so(self):
        g = montar(5, [(0, 1), (1, 2), (2, 3), (3, 4), (1, 3)])
        self.assertEqual(BFS.componentes(g), [0, 0, 0, 0, 0])

    def test_grafo_2_desconexo_triangulo_e_caminho(self):
        g = montar(6, [(0, 1), (1, 2), (2, 0), (3, 4), (4, 5)])
        comp = BFS.componentes(g)
        self.assertEqual(comp, [0, 0, 0, 1, 1, 1])
        self.assertEqual(max(comp) + 1, 2)

    def test_grafo_3_vertice_isolado_vira_componente_sozinho(self):
        g = montar(5, [(0, 1), (1, 2), (2, 3)])
        self.assertEqual(BFS.componentes(g), [0, 0, 0, 0, 1])

    def test_capacidade_0_nao_liga(self):
        # chave aberta ou trecho em falha
        g = Grafo(4)
        g.add_aresta(0, 1, 5)
        g.add_aresta(1, 2, 0)
        g.add_aresta(2, 3, 5)
        self.assertEqual(BFS.componentes(g), [0, 0, 1, 1])

    def test_grafo_vazio_e_sem_arestas(self):
        self.assertEqual(BFS.componentes(Grafo(0)), [])
        self.assertEqual(BFS.componentes(Grafo(3)), [0, 1, 2])

    def test_caminho_longo_nao_estoura_a_pilha(self):
        n = 200_000
        g = montar(n, [(v, v + 1) for v in range(n - 1)])
        self.assertEqual(max(BFS.componentes(g)), 0)


if __name__ == "__main__":
    unittest.main()
