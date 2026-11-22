"""T16: o ponto de montagem (servidor.py) com os CSV pequenos de tests/dados."""

import json
import threading
import unittest
import urllib.request
from pathlib import Path

from api import criar_servidor
from servidor import montar

DADOS_TESTE = Path(__file__).resolve().parents[2] / "tests" / "dados"


class TestServidor(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.servico = montar(DADOS_TESTE, "Teste")
        cls.servidor = criar_servidor(0, cls.servico)
        cls.base = f"http://127.0.0.1:{cls.servidor.server_address[1]}"
        threading.Thread(target=cls.servidor.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.servidor.shutdown()
        cls.servidor.server_close()

    def test_monta_com_os_csv_de_teste(self):
        self.assertGreater(self.servico.saude().vertices, 0)
        desenho = self.servico.rede()
        self.assertTrue(desenho.arestas)
        self.assertNotIn("linha_at", {a[3] for a in desenho.arestas})

    def test_saude_com_a_rede_de_teste(self):
        with urllib.request.urlopen(self.base + "/api/saude") as r:
            self.assertEqual(r.status, 200)
            saude = self.servico.saude()
            self.assertEqual(json.load(r), {"ok": True, "vertices": saude.vertices, "arestas": saude.arestas})

    def test_porta_ocupada(self):
        with self.assertRaises(OSError):
            criar_servidor(self.servidor.server_address[1], self.servico).server_close()


if __name__ == "__main__":
    unittest.main()
