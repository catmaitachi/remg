"""T22: o benchmark confere de verdade. Roda com `python -m unittest discover -s tools/benchmark`."""

import csv
import tempfile
import unittest
from pathlib import Path

import benchmark as b


class TestConferencias(unittest.TestCase):
    """As conferências precisam acusar diferença, senão "confere: sim" não prova nada."""

    def test_distancias(self):
        self.assertTrue(b._mesmas_distancias([0, 1.5, None], [0, 1.5 + 1e-9, None]))
        self.assertFalse(b._mesmas_distancias([0, 1.5, None], [0, 1.6, None]))
        self.assertFalse(b._mesmas_distancias([0, 1.5, None], [0, 1.5, 3.0]))

    def test_arvore(self):
        self.assertTrue(b._mesma_arvore({"custo": 10.0, "componentes": 1}, {"custo": 10.0, "componentes": 1}))
        self.assertFalse(b._mesma_arvore({"custo": 10.0, "componentes": 1}, {"custo": 11.0, "componentes": 1}))
        self.assertFalse(b._mesma_arvore({"custo": 10.0, "componentes": 1}, {"custo": 10.0, "componentes": 2}))

    def test_pontes_com_aresta_paralela(self):
        # 0 ═ 1 ─ 2: as duas arestas 0–1 formam um ciclo, só a 1–2 (aresta 2) é ponte.
        caso = b.Caso("teste", 3, [(0, 1, 1, 1.0), (0, 1, 1, 1.0), (1, 2, 1, 1.0)])
        self.assertEqual(b._nx_pontes(caso), [2])

    def test_fluxo_soma_as_paralelas(self):
        caso = b.Caso("teste", 2, [(0, 1, 3, 1.0), (0, 1, 4, 1.0)], 0, 1)
        self.assertEqual(caso.grafo_simples()[0][1]["capacity"], 7)


class TestBenchmarkRapido(unittest.TestCase):
    def test_tudo_confere_e_grava_csv_e_md(self):
        with tempfile.TemporaryDirectory() as pasta:
            codigo = b.main(["--rapido", "--repeticoes", "1", "--saida", pasta])
            self.assertEqual(codigo, 0)
            with open(Path(pasta) / "resultados.csv", encoding="utf-8") as f:
                linhas = list(csv.DictReader(f))
            self.assertEqual(len(linhas), 2 * len(b.TODOS))
            self.assertTrue(all(l["confere"] == "sim" for l in linhas))
            self.assertIn("| Grafo |", (Path(pasta) / "resultados.md").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
