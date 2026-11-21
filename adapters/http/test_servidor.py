import json
import threading
import unittest
import urllib.error
import urllib.request

from servidor import criar_servidor


class TestServidor(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.servidor = criar_servidor(0)
        cls.base = f"http://127.0.0.1:{cls.servidor.server_address[1]}"
        threading.Thread(target=cls.servidor.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.servidor.shutdown()
        cls.servidor.server_close()

    def test_saude(self):
        with urllib.request.urlopen(self.base + "/api/saude") as r:
            self.assertEqual(r.status, 200)
            self.assertEqual(r.headers["Content-Type"], "application/json")
            self.assertEqual(json.load(r), {"ok": True})

    def test_porta_ocupada(self):
        with self.assertRaises(OSError):
            criar_servidor(self.servidor.server_address[1]).server_close()

    def test_caminho_desconhecido(self):
        with self.assertRaises(urllib.error.HTTPError) as erro:
            urllib.request.urlopen(self.base + "/api/nada")
        self.assertEqual(erro.exception.code, 404)
        self.assertIn("erro", json.load(erro.exception))


if __name__ == "__main__":
    unittest.main()
