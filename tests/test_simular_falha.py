"""T14: SimularFalha, com a RedeEletrica e o Dinic de verdade.

Rede do teste (capacidades e demandas em kVA):

    S ── s:A (100) ── p:1 ══t:1 tronco (80)══ p:2 [10] ──t:2 (40)── p:3 [20]
                                               │
                                             t:3 (40)
                                               │
                                              p:4 [20]
                                               ┆
                                            c:1 (100, aberta)
                                               ┆
    S ── s:B (100) ── p:5 ──────t:4 (50)────── p:6 [30]

Feito no papel, sem falha: A entrega 10 + 20 + 20 = 50 e B entrega 30. Fluxo total 80.
"""

import unittest

from core.casos_de_uso.simular_falha import SimularFalha
from core.dominio.elementos import Chave, Ponto, Subestacao, Trecho
from core.dominio.rede_eletrica import RedeEletrica
from core.grafo.alcance import Alcance
from core.grafo.grafo import Grafo

AREA_A = ["p:1", "p:2", "p:3", "p:4"]


def rede():
    demanda = {"p:1": 0, "p:2": 10, "p:3": 20, "p:4": 20, "p:5": 0, "p:6": 30}
    return RedeEletrica(
        subestacoes=[Subestacao("s:A", "A", 0, 0, 100, ponto_raiz="p:1"),
                     Subestacao("s:B", "B", 0, 0, 100, ponto_raiz="p:5")],
        pontos=[Ponto(p, 0, 0, d) for p, d in demanda.items()],
        trechos=[Trecho("t:1", "p:1", "p:2", 80), Trecho("t:2", "p:2", "p:3", 40),
                 Trecho("t:3", "p:2", "p:4", 40), Trecho("t:4", "p:5", "p:6", 50)],
        chaves=[Chave("c:1", "p:4", "p:6", 100)],
    )


def simular(**kw):
    return SimularFalha(rede()).executar(**kw)


class TestAlcance(unittest.TestCase):
    def test_arco_sem_capacidade_corta_e_bloqueado_nao_passa(self):
        # 0 ─(5)─ 1 ─(0)─ 2 ;  0 ─(5)─ 3 ─(5)─ 4
        g = Grafo(5)
        for u, v, c in [(0, 1, 5), (1, 2, 0), (0, 3, 5), (3, 4, 5)]:
            g.add_aresta(u, v, c)
        self.assertEqual(Alcance.a_partir_de(g, [0]), [True, True, False, True, True])
        self.assertEqual(Alcance.a_partir_de(g, [0], bloqueados=(3,)), [True, True, False, False, False])
        self.assertEqual(Alcance.a_partir_de(g, [2]), [False, False, True, False, False])
        self.assertEqual(Alcance.a_partir_de(g, [2, 4]), [True, True, True, True, True])


class TestSimularFalha(unittest.TestCase):
    def test_sem_falha_todos_tem_energia(self):
        r = simular()
        self.assertEqual(r.sem_energia, [])
        self.assertEqual(r.demanda_sem_energia, 0)
        self.assertEqual(r.fluxo_total, 80)

    def test_cair_o_tronco_apaga_tudo_abaixo(self):
        r = simular(arestas_caidas=["t:1"])
        # p:1 fica com energia: é o ponto raiz, antes do tronco.
        self.assertEqual(r.sem_energia, ["p:2", "p:3", "p:4"])
        self.assertEqual(r.demanda_sem_energia, 50)
        self.assertEqual(r.fluxo_total, 30)

    def test_cair_a_subestacao_apaga_a_area_dela(self):
        r = simular(subestacoes_caidas=["s:A"])
        self.assertEqual(r.sem_energia, AREA_A)
        self.assertEqual(r.demanda_sem_energia, 50)
        self.assertEqual(r.fluxo_total, 30)
        self.assertEqual(dict((i, f) for i, f, _ in r.fluxo)["t:4"], 30)

    def test_cair_ponta_apaga_so_a_ponta(self):
        r = simular(arestas_caidas=["t:2"])
        self.assertEqual(r.sem_energia, ["p:3"])
        self.assertEqual(r.fluxo_total, 60)

    def test_chave_fechada_religa_mas_capacidade_limita(self):
        # Com a chave fechada, B alcança a área A inteira (ninguém fica "sem energia"),
        # mas t:4 só aguenta 50: entrega 30 em p:6 e sobram 20 para a área A.
        r = simular(subestacoes_caidas=["s:A"], chaves_fechadas=["c:1"])
        self.assertEqual(r.sem_energia, [])
        self.assertEqual(r.fluxo_total, 50)
        self.assertIn("t:4", r.gargalos)


if __name__ == "__main__":
    unittest.main()
