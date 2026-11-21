"""T15: RotaAlternativa, com a RedeEletrica, o Dijkstra e o Dinic de verdade.

Rede do teste (capacidades e demandas em kVA, comprimentos em metros):

    S ── s:A (100) ── p:1 ──t:1 (80)── p:2 [10] ──t:2 (40)── p:3 [20]
                                        │                       ┆
                                      t:3 (40)            c:2 (100, 200 m, aberta, opcional)
                                        │                       ┆
                                       p:4 [20] ┄┄c:1 (100, 50 m, aberta)┄┄ p:6 [30]
                                                                            │
    S ── s:B (100) ── p:5 ───────────────t:4 (100)───────────────────────────┘

Feito no papel, sem falha: A entrega 10 + 20 + 20 = 50 e B entrega 30. Ninguém fica sem energia.
"""

import unittest

from core.casos_de_uso.rota_alternativa import RotaAlternativa
from core.dominio.elementos import Chave, Ponto, Subestacao, Trecho
from core.dominio.rede_eletrica import RedeEletrica


def rede(cap_c1=100, com_c2=False):
    demanda = {"p:1": 0, "p:2": 10, "p:3": 20, "p:4": 20, "p:5": 0, "p:6": 30}
    chaves = [Chave("c:1", "p:4", "p:6", cap_c1, 50)]
    if com_c2:
        chaves.append(Chave("c:2", "p:3", "p:6", 100, 200))
    return RedeEletrica(
        subestacoes=[Subestacao("s:A", "A", 0, 0, 100, ponto_raiz="p:1"),
                     Subestacao("s:B", "B", 0, 0, 100, ponto_raiz="p:5")],
        pontos=[Ponto(p, 0, 0, d) for p, d in demanda.items()],
        trechos=[Trecho("t:1", "p:1", "p:2", 80, 100), Trecho("t:2", "p:2", "p:3", 40, 100),
                 Trecho("t:3", "p:2", "p:4", 40, 100), Trecho("t:4", "p:5", "p:6", 100, 100)],
        chaves=chaves,
    )


def rota(falhas=(), chaves_fechadas=(), **kw):
    arestas = [f for f in falhas if not f.startswith("s:")]
    subestacoes = [f for f in falhas if f.startswith("s:")]
    return RotaAlternativa(rede(**kw)).executar(arestas, subestacoes, chaves_fechadas)


class TestRotaAlternativa(unittest.TestCase):
    def test_sem_falha_nao_ha_o_que_religar(self):
        r = rota()
        self.assertEqual((r.chaves_para_fechar, r.caminho, r.religado_pontos), ([], [], 0))
        self.assertEqual((r.religado_demanda, r.parcial, r.sem_energia), (0.0, False, []))

    def test_area_isolada_religa_fechando_a_chave_vizinha(self):
        # t:3 cai: p:4 fica sem energia. Fechando c:1, B atende p:4 (30 + 20 cabem nos 100 de t:4).
        r = rota(["t:3"])
        self.assertEqual(r.chaves_para_fechar, ["c:1"])
        self.assertEqual(r.caminho, ["c:1"])
        self.assertEqual((r.religado_pontos, r.religado_demanda, r.parcial, r.sem_energia), (1, 20.0, False, []))

    def test_sem_chave_possivel_a_resposta_diz_isso(self):
        # t:2 cai: p:3 fica sem energia e não tem chave nenhuma (sem a c:2).
        r = rota(["t:2"])
        self.assertEqual((r.chaves_para_fechar, r.caminho), ([], []))
        self.assertEqual((r.religado_pontos, r.religado_demanda, r.parcial), (0, 0.0, False))
        self.assertEqual(r.sem_energia, ["p:3"])

    def test_religamento_parcial_quando_a_chave_nao_da_conta(self):
        # Com c:1 de 15 kVA, p:4 pede 20 e recebe só 15.
        r = rota(["t:3"], cap_c1=15)
        self.assertEqual(r.chaves_para_fechar, ["c:1"])
        self.assertEqual((r.religado_pontos, r.religado_demanda, r.parcial), (1, 15.0, True))

    def test_area_com_varios_pontos_volta_inteira_por_uma_chave(self):
        # t:1 cai: p:2, p:3 e p:4 apagam (50 kVA). Pela c:1, B atende 30 + 50 = 80 ≤ 100.
        r = rota(["t:1"])
        self.assertEqual(r.chaves_para_fechar, ["c:1"])
        self.assertEqual((r.religado_pontos, r.religado_demanda, r.parcial), (3, 50.0, False))

    def test_fecha_so_a_chave_mais_perto_quando_ela_basta(self):
        # Com c:1 (50 m) e c:2 (200 m) ligando a mesma área a B, fecha só a c:1.
        r = rota(["t:1"], com_c2=True)
        self.assertEqual(r.chaves_para_fechar, ["c:1"])
        self.assertEqual(r.sem_energia, [])

    def test_duas_areas_isoladas_fecham_duas_chaves(self):
        # t:2 e t:3 caem: p:3 e p:4 ficam isolados, cada um com a sua chave até p:6.
        r = rota(["t:2", "t:3"], com_c2=True)
        self.assertEqual(r.chaves_para_fechar, ["c:1", "c:2"])
        self.assertEqual((r.religado_pontos, r.religado_demanda, r.parcial), (2, 40.0, False))

    def test_chave_em_falha_nao_religa(self):
        r = rota(["t:3", "c:1"])
        self.assertEqual(r.chaves_para_fechar, [])
        self.assertEqual(r.sem_energia, ["p:4"])

    def test_chave_ja_fechada_no_pedido_nao_entra_na_resposta(self):
        r = rota(["t:3"], chaves_fechadas=["c:1"])
        self.assertEqual((r.chaves_para_fechar, r.religado_pontos, r.sem_energia), ([], 0, []))

    def test_subestacao_caida_religa_pela_outra(self):
        # s:A cai: p:1 a p:4 apagam. Pela c:1, B atende 30 + 50 = 80 e chega até o p:1 pelo t:1.
        r = rota(["s:A"])
        self.assertEqual(r.chaves_para_fechar, ["c:1"])
        self.assertEqual((r.religado_pontos, r.religado_demanda, r.parcial), (4, 50.0, False))

    def test_falha_em_algo_que_nao_existe(self):
        with self.assertRaises(KeyError):
            rota(["t:999"])


if __name__ == "__main__":
    unittest.main()
