"""T09: Dinic e corte mínimo. Os desenhos dos grafos estão em docs/testes/T09-dinic.md."""

import random
import unittest

from core.grafo.bfs import BFS
from core.grafo.dinic import Dinic
from core.grafo.grafo import Grafo


def soma_do_corte(g, corte):
    return sum(g.cap[e] for e in corte)


def corte_separa_s_de_t(g, corte, s, t):
    """Tirar os arcos do corte (e os pares deles) precisa separar S de T."""
    sem_corte = Grafo(g.V)
    sem_corte.head, sem_corte.prox, sem_corte.para = g.head, g.prox, g.para
    sem_corte.cap = list(g.cap)
    for e in corte:
        sem_corte.cap[e] = sem_corte.cap[e ^ 1] = 0
    comp = BFS.componentes(sem_corte)
    return comp[s] != comp[t]


class ConferirFluxo(unittest.TestCase):
    def conferir_fluxo_valido(self, g, r, s, t):
        """Cada arco respeita a capacidade, o par tem sinais opostos e, fora S e T, o que entra sai."""
        self.assertEqual(len(r.fluxo), len(g.cap))
        saldo = [0] * g.V
        for e in range(len(g.cap)):
            self.assertEqual(r.fluxo[e], -r.fluxo[e ^ 1])
            self.assertLessEqual(r.fluxo[e], g.cap[e])
            saldo[g.para[e]] += r.fluxo[e]
        for v in range(g.V):
            if v not in (s, t):
                self.assertEqual(saldo[v], 0)
        self.assertEqual(saldo[t], r.total)
        self.assertEqual(saldo[s], -r.total)


class TestDinic(ConferirFluxo):
    def test_grafo_1_rede_pequena_gargalo_nos_trechos_das_subestacoes(self):
        # 0 = S · 1 e 2 = subestações · 3, 4, 5 = pontos com demanda · 6 = T
        g = Grafo(7)
        s1 = g.add_aresta(0, 1, 50)
        s2 = g.add_aresta(0, 2, 50)
        t13 = g.add_aresta(1, 3, 8)
        t24 = g.add_aresta(2, 4, 5)
        g.add_aresta(3, 4, 3)
        g.add_aresta(3, 5, 6)
        d3 = g.add_aresta(3, 6, 4)
        d4 = g.add_aresta(4, 6, 7)
        d5 = g.add_aresta(5, 6, 5)

        dinic = Dinic()
        r = dinic.fluxo_maximo(g, 0, 6)

        self.assertEqual(r.total, 13)
        self.assertEqual((r.fluxo[s1], r.fluxo[s2]), (8, 5))
        self.assertEqual((r.fluxo[t13], r.fluxo[t13 ^ 1], r.fluxo[t24]), (8, -8, 5))
        self.assertEqual(r.fluxo[d3] + r.fluxo[d4] + r.fluxo[d5], 13)
        self.assertAlmostEqual(r.uso[t13], 1.0)
        self.assertAlmostEqual(r.uso[t13 ^ 1], 1.0)
        self.assertAlmostEqual(r.uso[t24], 1.0)
        self.assertAlmostEqual(r.uso[s1], 0.16)
        self.assertAlmostEqual(r.uso[s2], 0.10)
        self.conferir_fluxo_valido(g, r, 0, 6)

        corte = dinic.corte_minimo()
        self.assertEqual(sorted(corte), [t13, t24])
        self.assertEqual(soma_do_corte(g, corte), r.total)

    def test_grafo_2_fluxo_atravessa_o_trecho_1_2_de_2_para_1(self):
        g = Grafo(6)
        a01 = g.add_aresta(0, 1, 10)
        a02 = g.add_aresta(0, 2, 10)
        a12 = g.add_aresta(1, 2, 2)
        for u, v, c in [(1, 3, 4), (1, 4, 8), (2, 4, 9), (3, 4, 6), (3, 5, 10), (4, 5, 10)]:
            g.add_aresta(u, v, c)

        dinic = Dinic()
        r = dinic.fluxo_maximo(g, 0, 5)

        self.assertEqual(r.total, 20)
        self.assertLessEqual(r.fluxo[a12], -1)  # 2 recebe 10, mas 2–4 só leva 9: o resto passa para o 1
        self.conferir_fluxo_valido(g, r, 0, 5)
        corte = dinic.corte_minimo()
        self.assertEqual(sorted(corte), [a01, a02])
        self.assertEqual(soma_do_corte(g, corte), r.total)

    def test_grafo_3_fluxo_contra_o_sentido_em_que_a_aresta_foi_criada(self):
        g = Grafo(3)
        a = g.add_aresta(1, 0, 5)  # criada 1 → 0, mas o fluxo vai 0 → 1
        b = g.add_aresta(1, 2, 3)

        dinic = Dinic()
        r = dinic.fluxo_maximo(g, 0, 2)

        self.assertEqual(r.total, 3)
        self.assertEqual((r.fluxo[a], r.fluxo[a ^ 1], r.fluxo[b]), (-3, 3, 3))
        self.assertAlmostEqual(r.uso[a], 0.6)
        self.assertEqual(dinic.corte_minimo(), [b])

    def test_grafo_4_chave_aberta_nao_leva_fluxo_nem_entra_no_corte(self):
        g = Grafo(4)
        g.add_aresta(0, 1, 5)
        chave = g.add_aresta(1, 3, 0)
        a02 = g.add_aresta(0, 2, 2)
        g.add_aresta(2, 3, 4)

        dinic = Dinic()
        r = dinic.fluxo_maximo(g, 0, 3)

        self.assertEqual(r.total, 2)
        self.assertEqual((r.fluxo[chave], r.uso[chave]), (0, 0.0))
        corte = dinic.corte_minimo()
        self.assertEqual(corte, [a02])
        self.assertEqual(soma_do_corte(g, corte), 2)

    def test_grafo_5_s_e_t_separados_fluxo_0_e_corte_vazio(self):
        g = Grafo(4)
        g.add_aresta(0, 1, 5)
        g.add_aresta(2, 3, 5)

        dinic = Dinic()
        self.assertEqual(dinic.fluxo_maximo(g, 0, 3).total, 0)
        self.assertEqual(dinic.corte_minimo(), [])

    def test_super_fonte_com_capacidade_infinita(self):
        g = Grafo(4)
        g.add_aresta(0, 1, Dinic.INFINITO)
        g.add_aresta(0, 2, Dinic.INFINITO)
        g.add_aresta(1, 3, 7)
        g.add_aresta(2, 3, 4)

        dinic = Dinic()
        r = dinic.fluxo_maximo(g, 0, 3)

        self.assertEqual(r.total, 11)
        self.conferir_fluxo_valido(g, r, 0, 3)
        self.assertEqual(soma_do_corte(g, dinic.corte_minimo()), 11)

    def test_nao_mexe_no_grafo_e_repete_a_resposta(self):
        g = Grafo(4)
        for u, v, c in [(0, 1, 3), (1, 3, 2), (0, 2, 4), (2, 3, 5)]:
            g.add_aresta(u, v, c)
        cap_antes = list(g.cap)

        dinic = Dinic()
        self.assertEqual(dinic.fluxo_maximo(g, 0, 3).total, 6)
        self.assertEqual(g.cap, cap_antes)
        self.assertEqual(dinic.fluxo_maximo(g, 0, 3).total, 6)

    def test_caminho_com_200_mil_vertices_nao_estoura_a_pilha(self):
        n = 200_000
        g = Grafo(n)
        gargalo = -1
        for v in range(n - 1):
            e = g.add_aresta(v, v + 1, 1 if v == n // 2 else 2 + v % 7)
            if v == n // 2:
                gargalo = e

        dinic = Dinic()
        self.assertEqual(dinic.fluxo_maximo(g, 0, n - 1).total, 1)
        self.assertEqual(dinic.corte_minimo(), [gargalo])

    def test_fluxo_maximo_igual_ao_corte_minimo_em_200_grafos_aleatorios(self):
        sorteio = random.Random(2026)
        for rodada in range(200):
            n = 2 + sorteio.randrange(30)
            g = Grafo(n)
            for _ in range(sorteio.randrange(3 * n)):
                g.add_aresta(sorteio.randrange(n), sorteio.randrange(n), sorteio.randrange(21))
            s, t = 0, n - 1

            dinic = Dinic()
            r = dinic.fluxo_maximo(g, s, t)
            corte = dinic.corte_minimo()

            with self.subTest(rodada=rodada):
                self.conferir_fluxo_valido(g, r, s, t)
                self.assertEqual(soma_do_corte(g, corte), r.total)
                self.assertTrue(corte_separa_s_de_t(g, corte, s, t))

    def test_recusa_entrada_invalida(self):
        g = Grafo(3)
        g.add_aresta(0, 1, 1)
        dinic = Dinic()
        with self.assertRaises(RuntimeError):
            dinic.corte_minimo()
        with self.assertRaises(IndexError):
            dinic.fluxo_maximo(g, 0, 3)
        with self.assertRaises(IndexError):
            dinic.fluxo_maximo(g, -1, 2)
        with self.assertRaises(ValueError):
            dinic.fluxo_maximo(g, 1, 1)


if __name__ == "__main__":
    unittest.main()
