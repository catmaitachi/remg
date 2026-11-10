"""Testes do comecar.py. Rodar: python -m unittest discover -s tools/dev"""
import re
import unittest

import comecar as c

V2 = r"^(feat|fix|test|docs|refactor|chore)/\d+-[a-z0-9-]+$"

ISSUES = [
    {"number": 11, "title": "T09 · 🌊 Dinic (fluxo máximo) + corte mínimo", "body": "algoritmo de fluxo máximo de Dinic"},
    {"number": 9, "title": "T07 · 🧮 Estrutura do grafo + BFS", "body": "classe Grafo e uma BFS"},
    {"number": 20, "title": "T18 · 🗺️ Front: camadas da rede e cores de uso", "body": "desenhar a rede no mapa"},
]


class TestNomeDaBranch(unittest.TestCase):
    def test_titulo_com_emoji_e_acento(self):
        self.assertEqual(c.nome_da_branch(11, "T09 · 🌊 Dinic (fluxo máximo) + corte mínimo"),
                         "feat/11-dinic-fluxo-maximo-corte-minimo")

    def test_titulo_longo_corta_no_hifen_e_passa_na_v2(self):
        nome = c.nome_da_branch(3, "T01 · 🏛️ Revisar a arquitetura e congelar o contrato da API", "docs")
        self.assertRegex(nome, V2)
        slug = nome.split("-", 1)[1]
        self.assertLessEqual(len(slug), 50)
        self.assertFalse(slug.endswith("-"))


class TestDependencias(unittest.TestCase):
    def test_le_a_linha_do_script_de_issues(self):
        corpo = "**🏷️ Release:** v0.2 · 🧮 Núcleo · **⛓️ Depende de:** T07, T10\n\n## 🎯 O que é"
        self.assertEqual(c.dependencias(corpo), ["T07", "T10"])

    def test_sem_dependencia(self):
        self.assertEqual(c.dependencias("**⛓️ Depende de:** —"), [])
        self.assertEqual(c.dependencias("sem linha"), [])
        self.assertEqual(c.dependencias(None), [])


class TestPendentes(unittest.TestCase):
    TODAS = [{"title": "T07 · 🧮 Grafo", "state": "CLOSED"}, {"title": "T10 · 📂 CSV", "state": "OPEN"}]

    def test_lista_so_as_dependencias_abertas(self):
        self.assertEqual(c.pendentes("**⛓️ Depende de:** T07, T10", self.TODAS), ["T10"])

    def test_dependencia_que_nao_existe_conta_como_aberta(self):
        self.assertEqual(c.pendentes("**⛓️ Depende de:** T99", self.TODAS), ["T99"])


class TestBusca(unittest.TestCase):
    def test_palavras_sem_acento_e_sem_palavra_vazia(self):
        self.assertEqual(c.palavras("Quero fazer o fluxo máximo"), {"fluxo", "maximo"})

    def test_pedido_acha_a_task_certa_primeiro(self):
        ranking = c.ranquear("quero fazer o dinic do fluxo máximo", ISSUES)
        self.assertEqual(ranking[0][1]["number"], 11)

    def test_variacao_da_palavra_tambem_conta(self):
        issues = [{"number": 20, "title": "T18 · Front: camadas da rede", "body": "linhas no mapa"},
                  {"number": 21, "title": "T19 · Front: animação do fluxo", "body": ""}]
        self.assertEqual(c.ranquear("animar as linhas", issues)[0][1]["number"], 21)

    def test_pedido_sem_relacao_nao_acha_nada(self):
        self.assertEqual(c.ranquear("trocar a senha do wifi", ISSUES), [])


class TestPodeTrocar(unittest.TestCase):
    def test_arvore_suja_nao_troca_de_task(self):
        self.assertFalse(c.pode_trocar(" M core/x.cpp\n", "feat/9-x", "feat/12-y"))

    def test_arvore_suja_pode_retomar_a_mesma_branch(self):
        self.assertTrue(c.pode_trocar(" M core/x.cpp\n", "feat/12-y", "feat/12-y"))

    def test_arvore_limpa_troca(self):
        self.assertTrue(c.pode_trocar("", "feat/9-x", None))


class TestBranchDaIssue(unittest.TestCase):
    def test_acha_sem_confundir_numeros(self):
        refs = ["main", "feat/110-outra", "feat/11-dinic", "origin/feat/11-dinic"]
        self.assertEqual(c.branch_da_issue(11, refs), "feat/11-dinic")

    def test_branch_remota_vira_nome_local(self):
        self.assertEqual(c.branch_da_issue(11, ["origin/feat/11-dinic"]), "feat/11-dinic")

    def test_sem_branch(self):
        self.assertIsNone(c.branch_da_issue(11, ["main", "feat/110-x"]))


if __name__ == "__main__":
    unittest.main()
