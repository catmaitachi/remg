"""T16: a porta ServicoDeAnalise implementada pela AnaliseDaRede, com a rede de verdade.

Mesma rede do test_calcular_fluxo, mais uma linha AT que sai da subestação A (a outra ponta, longe
de tudo, vira ponto de suprimento).
"""

import unittest

from core.casos_de_uso.pontos_criticos import PontosCriticos
from core.casos_de_uso.rota_alternativa import RotaAlternativa
from core.casos_de_uso.servico import AnaliseDaRede
from core.casos_de_uso.simular_falha import SimularFalha
from core.dominio.elementos import Chave, LinhaAT, Ponto, Subestacao, Trecho
from core.dominio.rede_eletrica import RedeEletrica
from core.portas.servico_de_analise import Saude, ServicoDeAnalise


def rede():
    demanda = {"p:1": 0, "p:2": 20, "p:3": 40, "p:4": 10}
    return RedeEletrica(
        subestacoes=[Subestacao("s:A", "A", 0, 0, 100, ponto_raiz="p:1")],
        pontos=[Ponto(p, 0, 0, d) for p, d in demanda.items()],
        trechos=[Trecho("t:1", "p:1", "p:2", 60), Trecho("t:2", "p:2", "p:3", 30),
                 Trecho("t:3", "p:1", "p:4", 50)],
        chaves=[Chave("c:1", "p:3", "p:4", 100)],
        linhas_at=[LinhaAT("at:1", 138000, 1000, [(0, 0), (0.05, 0)])],
    )


class TestAnaliseDaRede(unittest.TestCase):
    def setUp(self):
        self.rede = rede()
        self.servico = AnaliseDaRede(self.rede, "Teste")

    def test_e_a_porta(self):
        self.assertIsInstance(self.servico, ServicoDeAnalise)

    def test_rede_desenha_trechos_chaves_e_geometria_at(self):
        d = self.servico.rede()
        self.assertEqual(d.area, "Teste")
        self.assertEqual(d.subestacoes, [("s:A", "A", 0, 0, 100)])
        self.assertIn(("p:2", 0, 0, 20), d.pontos)
        self.assertEqual(len(d.pontos), 4)
        self.assertIn(("t:1", "p:1", "p:2", "trecho", 60), d.arestas)
        self.assertIn(("c:1", "p:3", "p:4", "chave", 100), d.arestas)
        self.assertEqual(len(d.arestas), 4)  # a linha AT não entra: a ponta dela pode ser sp:*
        self.assertEqual(d.geometria_at, {"at:1": [(0, 0), (0.05, 0)]})

    def test_analisar_igual_a_simular_falha(self):
        esperado = SimularFalha(self.rede).executar(["t:1"], [], ["c:1"])
        self.assertEqual(self.servico.analisar(["t:1"], [], ["c:1"]), esperado)

    def test_id_desconhecido_vira_value_error(self):
        with self.assertRaises(ValueError) as erro:
            self.servico.analisar(["t:999"], [], [])
        self.assertIn("t:999", str(erro.exception))

    def test_tipo_errado_vira_value_error(self):
        for pedido in ((["s:A"], [], []), ([], ["t:1"], []), ([], [], ["t:1"]), (["p:1"], [], [])):
            with self.subTest(pedido=pedido), self.assertRaises(ValueError):
                self.servico.analisar(*pedido)

    def test_rota_tambem_confere_os_ids(self):
        with self.assertRaises(ValueError):
            self.servico.rota_alternativa([], [], ["t:2"])

    def test_linha_at_pode_cair(self):
        self.servico.analisar(["at:1"], [], [])

    def test_rota_e_criticos_passam_pela_porta(self):
        self.assertEqual(self.servico.rota_alternativa(["t:2"], [], []),
                         RotaAlternativa(self.rede).executar(["t:2"], [], []))
        self.assertEqual(self.servico.criticos(), PontosCriticos(self.rede).executar())

    def test_saude(self):
        self.assertEqual(self.servico.saude(), Saude(self.rede.num_vertices, self.rede.num_arestas))


if __name__ == "__main__":
    unittest.main()
