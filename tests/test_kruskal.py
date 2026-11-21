"""T30: union-find e Kruskal. Os desenhos dos grafos estão em docs/testes/T30-kruskal.md."""

import random
import unittest

from core.grafo.kruskal import ArestaCandidata as A
from core.grafo.kruskal import Kruskal
from core.grafo.union_find import UnionFind


def prim_completo(custo):
    """Prim O(V²) no grafo completo, feito de outro jeito só para servir de gabarito."""
    n = len(custo)
    na_arvore = [False] * n
    melhor = [float("inf")] * n
    melhor[0] = 0
    total = 0
    for _ in range(n):
        u = min((v for v in range(n) if not na_arvore[v]), key=lambda v: melhor[v])
        na_arvore[u] = True
        total += melhor[u]
        for v in range(n):
            if not na_arvore[v] and custo[u][v] < melhor[v]:
                melhor[v] = custo[u][v]
    return total


class TestUnionFind(unittest.TestCase):
    def test_junta_reconhece_quem_ja_esta_junto_e_recusa_elemento_fora(self):
        uf = UnionFind(5)
        self.assertEqual(uf.acha(3), 3)
        self.assertTrue(uf.une(0, 1))
        self.assertTrue(uf.une(3, 4))
        self.assertEqual(uf.acha(0), uf.acha(1))
        self.assertNotEqual(uf.acha(0), uf.acha(3))
        self.assertFalse(uf.une(1, 0))
        self.assertTrue(uf.une(1, 4))
        self.assertEqual(uf.acha(0), uf.acha(3))
        self.assertEqual(uf.acha(2), 2)
        with self.assertRaises(IndexError):
            uf.acha(5)
        with self.assertRaises(IndexError):
            uf.une(-1, 0)
        with self.assertRaises(ValueError):
            UnionFind(-1)

    def test_o_menor_conjunto_entra_embaixo_do_maior(self):
        uf = UnionFind(4)
        uf.une(0, 1)
        uf.une(0, 2)  # {0, 1, 2} tem tamanho 3
        self.assertTrue(uf.une(3, 0))  # {3} é menor: o representante continua o de {0, 1, 2}
        self.assertEqual(uf.acha(3), uf.acha(1))
        self.assertNotEqual(uf.acha(3), 3)


class TestKruskal(unittest.TestCase):
    def test_grafo_1_conexo_custo_10_com_4_arestas(self):
        c = [A(0, 1, 4), A(0, 2, 1), A(1, 2, 2), A(1, 3, 5), A(2, 3, 8), A(2, 4, 10), A(3, 4, 2)]
        r = Kruskal.arvore_minima(5, c)
        self.assertAlmostEqual(r.custo_total, 10)
        self.assertEqual(r.escolhidas, [1, 2, 6, 3])
        self.assertEqual(r.componentes, 1)

    def test_grafo_2_desconexo_vira_floresta_com_2_arvores(self):
        c = [A(0, 1, 3), A(2, 3, 1), A(2, 4, 2), A(3, 4, 5)]
        r = Kruskal.arvore_minima(5, c)
        self.assertAlmostEqual(r.custo_total, 6)
        self.assertEqual(r.escolhidas, [1, 2, 0])
        self.assertEqual(r.componentes, 2)

    def test_grafo_3_ligar_3_pontos_novos_a_rede_com_290_m(self):
        # 0, 1, 2 = pontos da rede (já ligados entre si) · 3, 4, 5 = pontos novos
        c = [A(0, 3, 120), A(2, 4, 300), A(1, 5, 250), A(3, 4, 90), A(4, 5, 80), A(3, 5, 200), A(0, 1, 10)]
        r = Kruskal.arvore_minima(6, c, ja_conectados=[0, 1, 2])
        self.assertAlmostEqual(r.custo_total, 290)
        self.assertEqual(r.escolhidas, [4, 3, 0])  # o cabo 0–1 (10 m) liga quem já estava ligado
        self.assertEqual(r.componentes, 1)

    def test_empate_de_custo_vale_a_ordem_da_entrada(self):
        r = Kruskal.arvore_minima(3, [A(0, 1, 5), A(1, 2, 5), A(0, 2, 5)])
        self.assertEqual(r.escolhidas, [0, 1])
        self.assertAlmostEqual(r.custo_total, 10)

    def test_laco_e_aresta_repetida_fica_so_a_mais_barata(self):
        r = Kruskal.arvore_minima(2, [A(0, 0, 1), A(0, 1, 7), A(0, 1, 3)])
        self.assertEqual(r.escolhidas, [2])
        self.assertAlmostEqual(r.custo_total, 3)

    def test_sem_vertices_ou_sem_candidatas(self):
        vazio = Kruskal.arvore_minima(0, [])
        self.assertEqual((vazio.escolhidas, vazio.custo_total, vazio.componentes), ([], 0, 0))
        soltos = Kruskal.arvore_minima(3, [])
        self.assertEqual((soltos.escolhidas, soltos.componentes), ([], 3))

    def test_recusa_vertice_fora_e_numero_de_vertices_negativo(self):
        with self.assertRaises(IndexError):
            Kruskal.arvore_minima(2, [A(0, 2, 1)])
        with self.assertRaises(IndexError):
            Kruskal.arvore_minima(2, [A(-1, 0, 1)])
        with self.assertRaises(IndexError):
            Kruskal.arvore_minima(2, [], ja_conectados=[0, 5])
        with self.assertRaises(ValueError):
            Kruskal.arvore_minima(-1, [])

    def test_mesmo_custo_que_o_prim_em_100_grafos_completos_aleatorios(self):
        sorteio = random.Random(2026)
        for rodada in range(100):
            n = 1 + sorteio.randrange(40)
            custo = [[0.0] * n for _ in range(n)]
            c = []
            for u in range(n):
                for v in range(u + 1, n):
                    custo[u][v] = custo[v][u] = float(1 + sorteio.randrange(1000))
                    c.append(A(u, v, custo[u][v]))

            r = Kruskal.arvore_minima(n, c)

            with self.subTest(rodada=rodada):
                self.assertAlmostEqual(r.custo_total, prim_completo(custo))
                self.assertEqual(len(r.escolhidas), n - 1)
                self.assertEqual(r.componentes, 1)


if __name__ == "__main__":
    unittest.main()
