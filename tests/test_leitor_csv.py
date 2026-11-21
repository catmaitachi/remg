import json
import shutil
import tempfile
import unittest
from pathlib import Path

from adapters.dados.leitor_csv import LeitorCSV
from core.portas.fonte_de_rede import FonteDeRede, LinhaATLida, PontoLido, SubestacaoLida, TrechoLido

MINI = Path(__file__).parent / "dados"
BH = Path(__file__).resolve().parents[1] / "data" / "bh"


class TestLeitorMini(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dados = LeitorCSV(MINI).carregar()

    def test_implementa_a_porta(self):
        self.assertIsInstance(LeitorCSV(MINI), FonteDeRede)

    def test_contagens(self):
        self.assertEqual(self.dados.contagens(),
                         {"pontos": 4, "trechos_rua": 3, "subestacoes": 2, "linhas_at": 2, "regionais": 1})

    def test_converte_os_tipos(self):
        self.assertEqual(self.dados.pontos[0], PontoLido(101, -19.9, -43.9))
        self.assertEqual(self.dados.trechos[1], TrechoLido(2, 102, 103, 104.62, "primary"))

    def test_subestacao_com_acento_virgula_e_tags_vazias(self):
        self.assertEqual(self.dados.subestacoes[0].tensoes, (138000, 13800))
        self.assertEqual(self.dados.subestacoes[1],
                         SubestacaoLida(202, "Subestação Sul, Norte", -19.902, -43.902, (), ""))

    def test_linha_at_coords_e_tensao_vazia(self):
        self.assertEqual(self.dados.linhas_at[0],
                         LinhaATLida(301, 138000, ((-19.9, -43.9), (-19.902, -43.902))))
        self.assertIsNone(self.dados.linhas_at[1].tensao)

    def test_regional_poligono(self):
        self.assertEqual(self.dados.regionais[0].nome, "Regional Teste")
        self.assertEqual(len(self.dados.regionais[0].poligono), 4)
        self.assertEqual(self.dados.regionais[0].poligono[0], (-19.899, -43.899))


class TestLeitorComErro(unittest.TestCase):
    """Copia o mini para uma pasta temporária e estraga um arquivo por teste."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.pasta = Path(self._tmp.name) / "mini"
        shutil.copytree(MINI, self.pasta)

    def tearDown(self):
        self._tmp.cleanup()

    def _escrever(self, arquivo, texto, newline="\n"):
        with open(self.pasta / arquivo, "w", encoding="utf-8", newline=newline) as f:
            f.write(texto)

    def _erro(self):
        with self.assertRaises(ValueError) as ctx:
            LeitorCSV(self.pasta).carregar()
        return str(ctx.exception)

    def test_coluna_faltando(self):
        self._escrever("pontos.csv", "id_osm,lat\n101,-19.9\n")
        self.assertEqual(self._erro(), "pontos.csv: falta a coluna lon")

    def test_numero_invalido_diz_arquivo_e_linha(self):
        self._escrever("trechos_rua.csv", "id,de,para,comprimento_m,tipo_via\n1,101,102,11.5,residential\n"
                                          "2,102,103,abc,primary\n")
        self.assertEqual(self._erro(), 'trechos_rua.csv, linha 3: a coluna comprimento_m tem "abc", que não é número')

    def test_coordenada_quebrada(self):
        self._escrever("linhas_at.csv", "id_osm,tensao,coords\n301,138000,-19.9 -43.9;-19.9\n")
        self.assertIn('linhas_at.csv, linha 2: a coluna coords tem "-19.9"', self._erro())

    def test_tensoes_invalidas(self):
        self._escrever("subestacoes.csv", "id_osm,nome,lat,lon,tensoes,tipo\n201,X,-19.9,-43.9,138kV,distribution\n")
        self.assertIn("subestacoes.csv, linha 2: a coluna tensoes", self._erro())

    def test_colunas_a_menos_e_a_mais(self):
        self._escrever("pontos.csv", "id_osm,lat,lon\n101,-19.9\n")
        self.assertEqual(self._erro(), "pontos.csv, linha 2: esperava 3 colunas")
        self._escrever("pontos.csv", "id_osm,lat,lon\n101,-19.9,-43.9,7\n")
        self.assertEqual(self._erro(), "pontos.csv, linha 2: esperava 3 colunas")

    def test_arquivo_faltando(self):
        (self.pasta / "regionais.csv").unlink()
        with self.assertRaises(FileNotFoundError):
            LeitorCSV(self.pasta).carregar()

    def test_aceita_crlf_e_bom(self):
        # CSV salvo à mão no Windows: \r\n no fim da linha e BOM no começo.
        self._escrever("trechos_rua.csv", "﻿id,de,para,comprimento_m,tipo_via\n1,101,102,11.5,residential\n",
                       newline="\r\n")
        trecho = LeitorCSV(self.pasta).carregar().trechos[0]
        self.assertEqual(trecho, TrechoLido(1, 101, 102, 11.5, "residential"))


@unittest.skipUnless((BH / "fonte.json").exists(), "data/bh não está no checkout")
class TestLeitorBH(unittest.TestCase):
    def test_contagens_batem_com_o_fonte_json(self):
        esperado = json.loads((BH / "fonte.json").read_text(encoding="utf-8"))["contagens"]
        self.assertEqual(LeitorCSV(BH).carregar().contagens(), esperado)


if __name__ == "__main__":
    unittest.main()
