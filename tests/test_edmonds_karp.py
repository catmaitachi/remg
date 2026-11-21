"""T24: Edmonds-Karp precisa dar o mesmo fluxo que o Dinic. Os grafos são os de docs/testes/T09-dinic.md."""

import random
import unittest

from core.grafo.dinic import Dinic
from core.grafo.edmonds_karp import EdmondsKarp
from core.grafo.grafo import Grafo
from tests.test_dinic import ConferirFluxo, corte_separa_s_de_t, soma_do_corte


def montar(V, arestas):
    g = Grafo(V)
    for u, v, c in arestas:
        g.add_aresta(u, v, c)
    return g


# (nome, grafo, s, t, fluxo feito no papel)
GRAFOS_DO_T09 = [
    ("1 · rede pequena", montar(7, [(0, 1, 50), (0, 2, 50), (1, 3, 8), (2, 4, 5), (3, 4, 3), (3, 5, 6),
                                    (3, 6, 4), (4, 6, 7), (5, 6, 5)]), 0, 6, 13),
    ("2 · trecho do meio", montar(6, [(0, 1, 10), (0, 2, 10), (1, 2, 2), (1, 3, 4), (1, 4, 8), (2, 4, 9),
                                      (3, 4, 6), (3, 5, 10), (4, 5, 10)]), 0, 5, 20),
    ("3 · aresta ao contrário", montar(3, [(1, 0, 5), (1, 2, 3)]), 0, 2, 3),
    ("4 · chave aberta", montar(4, [(0, 1, 5), (1, 3, 0), (0, 2, 2), (2, 3, 4)]), 0, 3, 2),
    ("5 · S e T separados", montar(4, [(0, 1, 5), (2, 3, 5)]), 0, 3, 0),
    ("super-fonte", montar(4, [(0, 1, Dinic.INFINITO), (0, 2, Dinic.INFINITO), (1, 3, 7), (2, 3, 4)]), 0, 3, 11),
]


class TestEdmondsKarp(ConferirFluxo):
    def test_mesmo_fluxo_que_o_dinic_nos_grafos_do_t09(self):
        for nome, g, s, t, esperado in GRAFOS_DO_T09:
            with self.subTest(grafo=nome):
                ek = EdmondsKarp()
                r = ek.fluxo_maximo(g, s, t)
                self.assertEqual(r.total, esperado)
                self.assertEqual(r.total, Dinic().fluxo_maximo(g, s, t).total)
                self.conferir_fluxo_valido(g, r, s, t)
                self.assertEqual(soma_do_corte(g, ek.corte_minimo()), esperado)

    def test_mesmo_corte_que_o_dinic_na_rede_pequena(self):
        _, g, s, t, _ = GRAFOS_DO_T09[0]
        ek, dinic = EdmondsKarp(), Dinic()
        ek.fluxo_maximo(g, s, t)
        dinic.fluxo_maximo(g, s, t)
        self.assertEqual(sorted(ek.corte_minimo()), sorted(dinic.corte_minimo()))

    def test_mesmo_fluxo_que_o_dinic_em_200_grafos_aleatorios(self):
        sorteio = random.Random(2026)
        for rodada in range(200):
            n = 2 + sorteio.randrange(30)
            g = Grafo(n)
            for _ in range(sorteio.randrange(3 * n)):
                g.add_aresta(sorteio.randrange(n), sorteio.randrange(n), sorteio.randrange(21))
            s, t = 0, n - 1

            ek = EdmondsKarp()
            r = ek.fluxo_maximo(g, s, t)
            corte = ek.corte_minimo()

            with self.subTest(rodada=rodada):
                self.assertEqual(r.total, Dinic().fluxo_maximo(g, s, t).total)
                self.conferir_fluxo_valido(g, r, s, t)
                self.assertEqual(soma_do_corte(g, corte), r.total)
                self.assertTrue(corte_separa_s_de_t(g, corte, s, t))

    def test_nao_mexe_no_grafo(self):
        _, g, s, t, _ = GRAFOS_DO_T09[1]
        cap_antes = list(g.cap)
        EdmondsKarp().fluxo_maximo(g, s, t)
        self.assertEqual(g.cap, cap_antes)

    def test_caminho_com_200_mil_vertices(self):
        n = 200_000
        g = montar(n, [(v, v + 1, 1 if v == n // 2 else 2 + v % 7) for v in range(n - 1)])
        ek = EdmondsKarp()
        self.assertEqual(ek.fluxo_maximo(g, 0, n - 1).total, 1)
        self.assertEqual(ek.corte_minimo(), [2 * (n // 2)])

    def test_recusa_entrada_invalida(self):
        g = montar(3, [(0, 1, 1)])
        ek = EdmondsKarp()
        with self.assertRaises(RuntimeError):
            ek.corte_minimo()
        with self.assertRaises(IndexError):
            ek.fluxo_maximo(g, 0, 3)
        with self.assertRaises(ValueError):
            ek.fluxo_maximo(g, 1, 1)


if __name__ == "__main__":
    unittest.main()
