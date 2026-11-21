"""T13: CalcularFluxo e a regra de gargalo, com a RedeEletrica e o Dinic de verdade.

Rede do teste (capacidades e demandas em kVA):

    S ── s:A (100) ── p:1 ──t:1 (60)── p:2 [20] ──t:2 (30)── p:3 [40]
                       │                                       ┆
                     t:3 (50)                               c:1 (100, aberta)
                       │                                       ┆
                      p:4 [10] ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘

Feito no papel: p:3 só recebe 30 (t:2 lota), p:2 recebe 20 e p:4 recebe 10. Fluxo total 60 de 70.
t:1 leva 20 + 30 = 50 (uso 0,83), t:2 leva 30 (uso 1,0) e t:3 leva 10 (uso 0,2).
Corte mínimo: t:2 + demanda de p:2 + demanda de p:4 = 30 + 20 + 10 = 60.
"""

import unittest

from core.casos_de_uso.calcular_fluxo import CalcularFluxo
from core.dominio.elementos import Chave, Ponto, Subestacao, Trecho
from core.dominio.gargalo import LIMITE_USO, eh_gargalo
from core.dominio.rede_eletrica import RedeEletrica
from core.grafo.edmonds_karp import EdmondsKarp


def rede(cap_t1=60):
    demanda = {"p:1": 0, "p:2": 20, "p:3": 40, "p:4": 10}
    return RedeEletrica(
        subestacoes=[Subestacao("s:A", "A", 0, 0, 100, ponto_raiz="p:1")],
        pontos=[Ponto(p, 0, 0, d) for p, d in demanda.items()],
        trechos=[Trecho("t:1", "p:1", "p:2", cap_t1), Trecho("t:2", "p:2", "p:3", 30),
                 Trecho("t:3", "p:1", "p:4", 50)],
        chaves=[Chave("c:1", "p:3", "p:4", 100)],
    )


def calcular(r, **kw):
    return CalcularFluxo(r).executar(**kw)


class TestRegraDeGargalo(unittest.TestCase):
    def test_limite_de_uso(self):
        self.assertEqual(LIMITE_USO, 0.9)
        self.assertTrue(eh_gargalo(False, 0.9))
        self.assertFalse(eh_gargalo(False, 0.89))
        self.assertTrue(eh_gargalo(True, 0.1))


class TestCalcularFluxo(unittest.TestCase):
    def test_rede_sem_falha(self):
        r = calcular(rede())
        self.assertEqual(r.fluxo_total, 60)
        self.assertEqual(r.demanda_total, 70)
        fluxo = {id_: (f, round(uso, 2)) for id_, f, uso in r.fluxo}
        self.assertEqual(fluxo, {"t:1": (50, 0.83), "t:2": (30, 1.0), "t:3": (10, 0.2)})

    def test_gargalo_do_corte_minimo(self):
        # As arestas de demanda também estão no corte, mas são virtuais e não entram na lista.
        self.assertEqual(calcular(rede()).gargalos, ["t:2"])

    def test_gargalo_por_uso_alto_fora_do_corte(self):
        # t:1 com 52 kVA leva 50 (uso 0,96): ainda sobra folga, então não está no corte.
        self.assertEqual(sorted(calcular(rede(cap_t1=52)).gargalos), ["t:1", "t:2"])

    def test_chave_aberta_nao_aparece(self):
        r = calcular(rede())
        self.assertNotIn("c:1", [x[0] for x in r.fluxo])
        self.assertNotIn("c:1", r.gargalos)

    def test_chave_fechada_entrega_tudo(self):
        r = calcular(rede(), chaves_fechadas=["c:1"])
        self.assertEqual(r.fluxo_total, 70)
        # A divisão entre t:2 e c:1 não é única; só se sabe que p:3 passa a receber pela chave.
        fluxo = dict((i, f) for i, f, _ in r.fluxo)
        self.assertGreaterEqual(fluxo["c:1"], 10)
        self.assertEqual(fluxo["t:3"], 10 + fluxo["c:1"])

    def test_trecho_caido_nao_e_gargalo(self):
        r = calcular(rede(), falhas=["t:3"])
        self.assertEqual(r.fluxo_total, 50)
        self.assertNotIn("t:3", [x[0] for x in r.fluxo])
        self.assertNotIn("t:3", r.gargalos)

    def test_edmonds_karp_da_o_mesmo_fluxo_total(self):
        for kw in ({}, {"chaves_fechadas": ["c:1"]}, {"falhas": ["t:3"]}):
            with self.subTest(**kw):
                self.assertEqual(CalcularFluxo(rede(), EdmondsKarp).executar(**kw).fluxo_total,
                                 calcular(rede(), **kw).fluxo_total)


if __name__ == "__main__":
    unittest.main()
