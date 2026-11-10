"""Testes do release.py (fecha a milestone vazia e cria a tag)."""
import unittest

import release as r


class TestVersao(unittest.TestCase):
    def test_versao_vem_do_titulo(self):
        self.assertEqual(r.versao("v0.3 · ⚡ Análises"), "v0.3.0")
        self.assertEqual(r.versao("v1.0 · 📤 Entrega"), "v1.0.0")

    def test_titulo_sem_versao(self):
        self.assertIsNone(r.versao("Sprint 2"))
        self.assertIsNone(r.versao(None))


class TestDeveFechar(unittest.TestCase):
    def test_milestone_aberta_e_vazia_fecha(self):
        self.assertTrue(r.deve_fechar({"state": "open", "open_issues": 0, "title": "v0.1 · 🧱 Base"}))

    def test_nao_fecha(self):
        self.assertFalse(r.deve_fechar({"state": "open", "open_issues": 1, "title": "v0.1 · 🧱 Base"}))
        self.assertFalse(r.deve_fechar({"state": "closed", "open_issues": 0, "title": "v0.1 · 🧱 Base"}))
        self.assertFalse(r.deve_fechar({"state": "open", "open_issues": 0, "title": "Sprint 2"}))
        self.assertFalse(r.deve_fechar(None))


if __name__ == "__main__":
    unittest.main()
