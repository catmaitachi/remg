"""T17: CLI. Roda com `python -m unittest discover -s adapters/cli`."""

import importlib.util
import io
import json
import tempfile
import unittest
from contextlib import redirect_stderr
from pathlib import Path

from main import FALTA_PECA, ler_grafo, main

# 0 ─(cap 5, peso 4)─ 1 ─(5, 1)─ 3 ;  0 ─(5, 1)─ 2 ─(5, 2)─ 1 ;  4 isolado
GRAFO = """# grafo de teste
5
0 1 5 4
0 2 5 1
2 1 5 2
1 3 5 1
"""


class TestCli(unittest.TestCase):
    def setUp(self):
        self.pasta = tempfile.TemporaryDirectory()
        self.arquivo = Path(self.pasta.name) / "g.txt"
        self.arquivo.write_text(GRAFO, encoding="utf-8")

    def tearDown(self):
        self.pasta.cleanup()

    def rodar(self, *argv):
        saida, erro = io.StringIO(), io.StringIO()
        with redirect_stderr(erro):
            codigo = main([argv[0], str(self.arquivo), *argv[1:]], saida)
        return codigo, saida.getvalue(), erro.getvalue()

    def test_ler_grafo(self):
        g, peso = ler_grafo(GRAFO)
        self.assertEqual((g.V, len(g.para)), (5, 8))
        self.assertEqual(peso, [4, 4, 1, 1, 2, 2, 1, 1])

    def test_peso_padrao_e_comentario_no_fim_da_linha(self):
        _, peso = ler_grafo("2\n0 1 7  # sem peso\n")
        self.assertEqual(peso, [1.0, 1.0])

    def test_erros_de_formato_dizem_a_linha(self):
        for texto, trecho in [("", "vazio"), ("x\n", "linha 1"), ("3\n0 1\n", "linha 2"), ("2\n0 5 1\n", "linha 2")]:
            with self.subTest(texto=texto), self.assertRaisesRegex(ValueError, trecho):
                ler_grafo(texto)

    def test_caminhos_em_json(self):
        codigo, saida, _ = self.rodar("caminhos", "0", "--json")
        self.assertEqual(codigo, 0)
        r = json.loads(saida)
        self.assertEqual(r["resultado"], [0, 3, 1, 4, None])
        self.assertGreaterEqual(r["tempoMs"], 0)

    def test_caminhos_com_duas_fontes_em_texto(self):
        codigo, saida, _ = self.rodar("caminhos", "0", "3")
        self.assertEqual(codigo, 0)
        linhas = saida.splitlines()
        self.assertEqual(linhas[0], "0 1.0 1.0 0 None")
        self.assertTrue(linhas[1].startswith("⏱️"))

    def test_arquivo_que_nao_existe(self):
        self.arquivo.unlink()
        codigo, _, erro = self.rodar("caminhos", "0")
        self.assertEqual(codigo, 1)
        self.assertIn("❌", erro)

    def test_fluxo(self):
        # O corte é a aresta 1─3 (capacidade 5).
        codigo, saida, _ = self.rodar("fluxo", "0", "3")
        self.assertEqual((codigo, saida.splitlines()[0]), (0, "5"))

    def test_componentes(self):
        codigo, saida, _ = self.rodar("componentes")
        self.assertEqual((codigo, saida.splitlines()[0]), (0, "0 0 0 0 1"))

    def test_fluxo_com_vertice_fora_do_grafo(self):
        codigo, _, erro = self.rodar("fluxo", "0", "9")
        self.assertEqual(codigo, 1)
        self.assertIn("❌", erro)

    def test_tarjan_responde_ou_avisa_a_task_que_falta(self):
        # Enquanto a peça não está no remg, o subcomando sai com FALTA_PECA citando a task.
        # Quando ela chega, o mesmo teste passa a conferir a resposta feita no papel para GRAFO.
        casos = [(("pontes",), "core.grafo.tarjan", "T23", "3"),
                 (("articulacoes",), "core.grafo.tarjan", "T23", "1")]
        for argv, modulo, task, esperado in casos:
            with self.subTest(comando=argv[0]):
                codigo, saida, erro = self.rodar(*argv)
                if importlib.util.find_spec(modulo) is None:
                    self.assertEqual(codigo, FALTA_PECA)
                    self.assertIn(task, erro)
                else:
                    self.assertEqual(codigo, 0)
                    if esperado is not None:
                        self.assertEqual(saida.splitlines()[0], esperado)

if __name__ == "__main__":
    unittest.main()
