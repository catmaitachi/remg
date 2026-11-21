"""Testes das regras do verificador. Rodar: python -m unittest discover -s tools/verificar"""
import unittest

import regras as r


def ids(achados):
    return [(a.regra, a.nivel) for a in achados]


class TestMensagem(unittest.TestCase):  # V1
    def test_aceita_formato_com_e_sem_escopo(self):
        self.assertEqual(r.checar_mensagem("feat: dinic com corte mínimo"), [])
        self.assertEqual(r.checar_mensagem("fix(grafo): pilha no tarjan\n\ncorpo"), [])

    def test_recusa_sem_tipo(self):
        self.assertEqual(ids(r.checar_mensagem("arrumei o dinic")), [("V1", r.ERRO)])

    def test_recusa_tipo_desconhecido(self):
        self.assertEqual(ids(r.checar_mensagem("feature: dinic")), [("V1", r.ERRO)])

    def test_ignora_merge_e_revert(self):
        self.assertEqual(r.checar_mensagem("Merge branch 'main' into feat/9-dinic"), [])
        self.assertEqual(r.checar_mensagem('Revert "feat: dinic"'), [])

    def test_ignora_linhas_de_comentario_do_git(self):
        self.assertEqual(r.checar_mensagem("# comentário do editor\nfeat: dinic"), [])


class TestBranch(unittest.TestCase):  # V2 e V13
    def test_aceita_formato(self):
        self.assertEqual(r.checar_branch("feat/9-dinic"), [])
        self.assertEqual(r.checar_branch("docs/0-spec-inicial"), [])

    def test_recusa_sem_numero(self):
        self.assertEqual(ids(r.checar_branch("feat/dinic")), [("V2", r.ERRO)])

    def test_main_e_proibida(self):
        self.assertEqual(ids(r.checar_branch("main")), [("V13", r.ERRO)])


class TestCorpoPR(unittest.TestCase):  # V3
    def test_aceita_closes(self):
        self.assertEqual(r.checar_corpo_pr("Implementa o dinic.\n\nCloses #9"), [])
        self.assertEqual(r.checar_corpo_pr("fixes #12"), [])

    def test_recusa_sem_issue(self):
        self.assertEqual(ids(r.checar_corpo_pr("Implementa o dinic")), [("V3", r.ERRO)])
        self.assertEqual(ids(r.checar_corpo_pr(None)), [("V3", r.ERRO)])


class TestPython(unittest.TestCase):  # V6
    def test_recusa_networkx_fora_do_benchmark(self):
        texto = "import os\nimport networkx as nx\n"
        self.assertEqual(ids(r.checar_python("tools/prep_osm/prep.py", texto)), [("V6", r.ERRO)])

    def test_recusa_from_osmnx_e_csgraph(self):
        texto = "from osmnx import graph\nfrom scipy.sparse.csgraph import dijkstra\n"
        self.assertEqual(ids(r.checar_python("tools/prep_osm/prep.py", texto)),
                         [("V6", r.ERRO), ("V6", r.ERRO)])

    def test_benchmark_pode(self):
        self.assertEqual(r.checar_python("tools/benchmark/comparar.py", "import networkx\n"), [])

    def test_nome_parecido_nao_conta(self):
        self.assertEqual(r.checar_python("tools/x.py", "import networkx_helpers_fake_nome\n"), [])


class TestCoautorIA(unittest.TestCase):
    def test_reconhece_outras_ferramentas(self):
        msg = "fix: x\n\nco-authored-by: GitHub Copilot <copilot@github.com>"
        self.assertTrue(r.tem_coautor_ia(msg))
        self.assertFalse(r.tem_coautor_ia("fix: x\n\nCo-Authored-By: Laura <laura@x.com>"))


class TestCoautoria(unittest.TestCase):  # V17
    def test_v17_barra_coautor_claude(self):
        achados = r.checar_coautoria("feat: x\n\nCo-Authored-By: Claude <noreply@anthropic.com>")
        self.assertEqual(ids(achados), [("V17", r.ERRO)])

    def test_v17_aceita_coautor_humano(self):
        self.assertEqual(r.checar_coautoria("feat: x\n\nCo-Authored-By: Laura Lara <l@x>"), [])

    def test_v17_aceita_sem_trailer(self):
        self.assertEqual(r.checar_coautoria("feat: x"), [])


class TestReadmeFeature(unittest.TestCase):  # V8b
    def test_sem_label_nao_exige(self):
        self.assertEqual(r.checar_readme_feature(set(), []), [])

    def test_feature_sem_readme_bloqueia(self):
        self.assertEqual(ids(r.checar_readme_feature({"feature-principal"}, [])), [("V8", r.ERRO)])

    def test_feature_com_assinatura_passa(self):
        linhas = ["## 💥 Falhas", "texto", "✍️ Escrito por: Laura"]
        self.assertEqual(r.checar_readme_feature({"feature-principal"}, linhas), [])

    def test_feature_sem_assinatura_bloqueia(self):
        self.assertEqual(ids(r.checar_readme_feature({"feature-principal"}, ["## 💥 Falhas"])),
                         [("V8", r.ERRO)])


class TestCoerencia(unittest.TestCase):  # V9, V10, V11
    def test_contrato_sem_mock_avisa(self):
        self.assertEqual(ids(r.checar_coerencia([r.CONTRATO], [])), [("V9", r.AVISO)])

    def test_mock_sem_contrato_avisa(self):
        self.assertEqual(ids(r.checar_coerencia(["front/src/mocks/rede.json"], [])), [("V9", r.AVISO)])

    def test_contrato_e_mock_juntos_passa(self):
        self.assertEqual(r.checar_coerencia([r.CONTRATO, "front/src/mocks/rede.json"], []), [])

    def test_nucleo_sem_teste_avisa(self):
        self.assertEqual(ids(r.checar_coerencia(["core/grafo/dinic.py"], [])), [("V10", r.AVISO)])

    def test_nucleo_com_teste_passa(self):
        self.assertEqual(r.checar_coerencia(["core/grafo/dinic.py", "tests/test_dinic.py"], []), [])

    def test_arquivo_novo_no_nucleo_sem_uml_avisa(self):
        alterados = ["core/grafo/tarjan.py", "tests/test_tarjan.py"]
        self.assertEqual(ids(r.checar_coerencia(alterados, ["core/grafo/tarjan.py"])), [("V11", r.AVISO)])


class TestPeso(unittest.TestCase):  # V12
    def test_arquivo_grande_avisa(self):
        self.assertEqual(ids(r.checar_peso([("data/bh/pontos.csv", 6 * 1024 * 1024)])), [("V12", r.AVISO)])

    def test_dado_bruto_bloqueia(self):
        self.assertEqual(ids(r.checar_peso([("data/raw/bh.osm.json", 10)])), [("V12", r.ERRO)])

    def test_normal_passa(self):
        self.assertEqual(r.checar_peso([("core/grafo/dinic.py", 4000)]), [])


class TestPythonNucleo(unittest.TestCase):  # V4, V5 e V16 em .py
    def regras(self, caminho, texto):
        return [a.regra for a in r.checar_python_nucleo(caminho, texto)]

    def test_heapq_barrado(self):
        achados = r.checar_python_nucleo("core/grafo/h.py", "import heapq\n")
        self.assertEqual([a.regra for a in achados], ["V4"])
        self.assertIn("HeapBinaria", achados[0].dica)

    def test_heapq_disfarcado(self):
        for texto in ("from heapq import heappush\n", "import heapq as h\n", "def f():\n    import queue\n"):
            self.assertEqual(self.regras("core/grafo/h.py", texto), ["V4"], texto)

    def test_terceiro_barrado(self):
        self.assertEqual(self.regras("core/dominio/x.py", "import numpy\n"), ["V4"])

    def test_permitidos_passam(self):
        texto = "from collections import deque\nfrom dataclasses import dataclass\nimport math\n"
        self.assertEqual(self.regras("core/grafo/x.py", texto), [])

    def test_grafo_nao_importa_dominio(self):
        self.assertEqual(self.regras("core/grafo/x.py", "from core.dominio.rede import RedeEletrica\n"), ["V5"])

    def test_relativo_resolvido(self):
        self.assertEqual(self.regras("core/grafo/bfs.py", "from .grafo import Grafo\n"), [])
        self.assertEqual(self.regras("core/grafo/bfs.py", "from .. import dominio\n"), ["V5"])
        self.assertEqual(self.regras("core/dominio/r.py", "from ..grafo.grafo import Grafo\n"), [])

    def test_from_core_import_camada(self):
        self.assertEqual(self.regras("core/grafo/x.py", "from core import dominio\n"), ["V5"])

    def test_init_do_core_fiscalizado(self):
        self.assertEqual(self.regras("core/__init__.py", "import heapq\n"), ["V4"])

    def test_init_do_core_nao_importa_adapters(self):
        self.assertEqual(self.regras("core/__init__.py", "import adapters.http.servidor\n"), ["V5"])

    def test_bom_nao_e_erro_de_sintaxe(self):
        self.assertEqual(self.regras("core/grafo/x.py", "﻿from collections import deque\n"), [])

    def test_nucleo_nao_importa_adapters(self):
        self.assertEqual(self.regras("core/casos_de_uso/x.py", "import adapters.dados.csv\n"), ["V5"])

    def test_adaptador_so_pela_porta(self):
        self.assertEqual(self.regras("adapters/dados/leitor.py", "from core.grafo.grafo import Grafo\n"), ["V16"])
        self.assertEqual(self.regras("adapters/dados/leitor.py", "from core.portas.fonte_de_rede import FonteDeRede\n"), [])

    def test_montagem_pode(self):
        self.assertEqual(self.regras("adapters/http/servidor.py", "from core.casos_de_uso.saude import saude\n"), [])

    def test_sintaxe_invalida(self):
        achados = r.checar_python_nucleo("core/grafo/x.py", "def f(:\n")
        self.assertEqual([a.regra for a in achados], ["V4"])
        self.assertIn("não é Python válido", achados[0].msg)

    def test_fora_de_core_e_adapters_ignora(self):
        self.assertEqual(self.regras("tools/benchmark/b.py", "import heapq\n"), [])


if __name__ == "__main__":
    unittest.main()
