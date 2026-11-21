"""T11 · RedeEletrica: rede pequena montada à mão vira o grafo esperado."""
import unittest

from core.dominio.elementos import Chave, LinhaAT, Ponto, Subestacao, Trecho
from core.dominio.rede_eletrica import (INFINITO, RedeEletrica, distancia_m, kva_para_va,
                                        va_para_kva)

# 0,0005° de latitude ≈ 56 m: perto o bastante para ligar a linha AT na subestação.
PERTO = 0.0005


def rede_pequena(**mudancas) -> RedeEletrica:
    """Duas subestações, quatro pontos, dois trechos, uma chave aberta e duas linhas AT.

        S ── sp:1 ══at:2══ s:1 ══at:1══ s:2
                            │            │
                           p:1 ─t:1─ p:2 ─c:1(aberta)─ p:4 ─t:2─ p:3
                                     12,5 kVA          20 kVA
    """
    partes = dict(
        subestacoes=[Subestacao("s:1", "Centro", -19.92, -43.94, 100, ponto_raiz="p:1"),
                     Subestacao("s:2", "Sion", -19.95, -43.93, 80, ponto_raiz="p:3")],
        pontos=[Ponto("p:1", -19.921, -43.941), Ponto("p:2", -19.922, -43.942, 12.5),
                Ponto("p:3", -19.951, -43.931), Ponto("p:4", -19.952, -43.932, 20)],
        trechos=[Trecho("t:1", "p:1", "p:2", 50), Trecho("t:2", "p:3", "p:4", 40)],
        chaves=[Chave("c:1", "p:2", "p:4", 30)],
        linhas_at=[LinhaAT("at:1", 138000, 1000, [(-19.92 + PERTO, -43.94), (-19.95 - PERTO, -43.93)]),
                   LinhaAT("at:2", 138000, 2000, [(-19.80, -44.10), (-19.85, -44.00), (-19.92, -43.94 + PERTO)])],
    )
    partes.update(mudancas)
    return RedeEletrica(**partes)


def arestas(rede: RedeEletrica, g) -> list[tuple[str, str, int]]:
    """(origem, destino, capacidade) de cada aresta, na ordem em que entrou no grafo."""
    return [(rede.id_externo(g.para[e ^ 1]), rede.id_externo(g.para[e]), g.cap[e])
            for e in range(0, len(g.para), 2)]


class TestRedePequena(unittest.TestCase):
    def setUp(self):
        self.rede = rede_pequena()

    def test_vertices_na_ordem_do_spec(self):
        ids = [self.rede.id_externo(i) for i in range(self.rede.num_vertices)]
        self.assertEqual(ids, ["s:1", "s:2", "sp:1", "p:1", "p:2", "p:3", "p:4", "S", "T"])
        self.assertEqual(self.rede.s, 7)
        self.assertEqual(self.rede.t, 8)
        for i, id_ in enumerate(ids):
            self.assertEqual(self.rede.indice(id_), i)

    def test_rede_pequena_vira_o_grafo_esperado(self):
        g = self.rede.montar_grafo()
        self.assertEqual(g.V, 9)
        self.assertEqual(arestas(self.rede, g), [
            ("p:1", "p:2", 50_000),      # t:1
            ("p:3", "p:4", 40_000),      # t:2
            ("p:2", "p:4", 0),           # c:1 aberta
            ("s:1", "s:2", 1_000_000),   # at:1
            ("sp:1", "s:1", 2_000_000),  # at:2, que vem de fora
            ("s:1", "p:1", 100_000),     # transformação de s:1
            ("s:2", "p:3", 80_000),      # transformação de s:2
            ("S", "sp:1", INFINITO),
            ("p:2", "T", 12_500),
            ("p:4", "T", 20_000),
        ])

    def test_aresta_nao_direcionada_tem_os_dois_arcos_com_a_mesma_capacidade(self):
        g = self.rede.montar_grafo()
        for e in range(0, len(g.para), 2):
            self.assertEqual(g.cap[e], g.cap[e ^ 1])

    def test_arco_e_id_do_arco(self):
        self.assertEqual(self.rede.arco("t:1"), 0)
        self.assertEqual(self.rede.arco("c:1"), 4)
        self.assertEqual(self.rede.arco("at:2"), 8)
        self.assertEqual(self.rede.id_do_arco(5), "c:1")
        self.assertIsNone(self.rede.id_do_arco(10))  # transformação é virtual
        with self.assertRaises(KeyError):
            self.rede.arco("t:999")


class TestFalhaEChave(unittest.TestCase):
    def setUp(self):
        self.rede = rede_pequena()
        self.normal = arestas(self.rede, self.rede.montar_grafo())

    def mudou(self, g) -> dict[int, int]:
        """Arestas cuja capacidade mudou em relação à rede normal: {posição: capacidade nova}."""
        return {k: a[2] for k, (a, b) in enumerate(zip(arestas(self.rede, g), self.normal)) if a != b}

    def test_falha_de_trecho_zera_so_ele(self):
        self.assertEqual(self.mudou(self.rede.montar_grafo(falhas=["t:1"])), {0: 0})

    def test_fechar_chave_libera_a_capacidade_dela(self):
        self.assertEqual(self.mudou(self.rede.montar_grafo(chaves_fechadas=["c:1"])), {2: 30_000})

    def test_chave_fechada_em_falha_continua_zerada(self):
        g = self.rede.montar_grafo(falhas=["c:1"], chaves_fechadas=["c:1"])
        self.assertEqual(self.mudou(g), {})

    def test_falha_de_linha_at(self):
        self.assertEqual(self.mudou(self.rede.montar_grafo(falhas=["at:2"])), {4: 0})

    def test_falha_de_subestacao_zera_transformacao_e_linhas_at_dela(self):
        self.assertEqual(self.mudou(self.rede.montar_grafo(falhas=["s:2"])), {3: 0, 6: 0})

    def test_estado_guardado_na_peca_tambem_vale(self):
        rede = rede_pequena(trechos=[Trecho("t:1", "p:1", "p:2", 50, em_falha=True),
                                     Trecho("t:2", "p:3", "p:4", 40)],
                            chaves=[Chave("c:1", "p:2", "p:4", 30, aberta=False)])
        g = rede.montar_grafo()
        self.assertEqual(g.cap[rede.arco("t:1")], 0)
        self.assertEqual(g.cap[rede.arco("c:1")], 30_000)

    def test_montar_com_falha_nao_muda_a_rede(self):
        self.rede.montar_grafo(falhas=["t:1", "s:1"], chaves_fechadas=["c:1"])
        self.assertEqual(arestas(self.rede, self.rede.montar_grafo()), self.normal)

    def test_pedido_com_id_errado(self):
        with self.assertRaises(KeyError):
            self.rede.montar_grafo(falhas=["t:999"])
        with self.assertRaises(KeyError):
            self.rede.montar_grafo(falhas=["p:1"])  # ponto não falha, quem falha é trecho
        with self.assertRaises(KeyError):
            self.rede.montar_grafo(chaves_fechadas=["t:1"])  # trecho não é chave


class TestLigacaoDaAltaTensao(unittest.TestCase):
    def linha(self, *coords):
        return LinhaAT("at:9", 138000, 500, list(coords))

    def test_ponta_a_150_m_liga_e_a_250_m_nao(self):
        grau_por_m = 1 / 111_195  # 1° de latitude ≈ 111,2 km
        perto = rede_pequena(linhas_at=[self.linha((-19.92 + 150 * grau_por_m, -43.94),
                                                   (-19.95, -43.93))])
        longe = rede_pequena(linhas_at=[self.linha((-19.92 + 250 * grau_por_m, -43.94),
                                                   (-19.95, -43.93))])
        self.assertEqual(perto.pontos_de_suprimento, [])
        self.assertEqual(len(longe.pontos_de_suprimento), 1)

    def test_ponta_solta_vira_ponto_de_suprimento_ligado_a_s(self):
        rede = rede_pequena()
        sp = rede.pontos_de_suprimento[0]
        self.assertEqual((sp.id, sp.lat, sp.lon), ("sp:1", -19.80, -44.10))

    def test_linha_que_nao_encosta_em_subestacao_fica_de_fora(self):
        rede = rede_pequena(linhas_at=[self.linha((-19.80, -44.10), (-19.70, -44.20))])
        self.assertEqual(rede.pontos_de_suprimento, [])
        with self.assertRaises(KeyError):
            rede.arco("at:9")

    def test_plano_b_sem_suprimento_s_liga_em_cada_subestacao(self):
        rede = rede_pequena(linhas_at=[])
        fontes = [(u, v, c) for u, v, c in arestas(rede, rede.montar_grafo()) if u == "S"]
        self.assertEqual(fontes, [("S", "s:1", INFINITO), ("S", "s:2", INFINITO)])


class TestEntradaErrada(unittest.TestCase):
    def test_id_repetido(self):
        with self.assertRaises(ValueError):
            rede_pequena(pontos=[Ponto("p:1", 0, 0), Ponto("p:1", 0, 0)])

    def test_trecho_com_ponta_inexistente(self):
        with self.assertRaises(KeyError):
            rede_pequena(trechos=[Trecho("t:1", "p:1", "p:999", 50)])

    def test_ponto_raiz_inexistente(self):
        with self.assertRaises(KeyError):
            rede_pequena(subestacoes=[Subestacao("s:1", "Centro", -19.92, -43.94, 100, ponto_raiz="p:999")])


class TestUnidades(unittest.TestCase):
    def test_kva_e_va(self):
        self.assertEqual(kva_para_va(12.5), 12_500)
        self.assertEqual(va_para_kva(12_500), 12.5)

    def test_distancia(self):
        self.assertAlmostEqual(distancia_m(-19.92, -43.94, -19.92 + 0.001, -43.94), 111.2, delta=0.5)


if __name__ == "__main__":
    unittest.main()
