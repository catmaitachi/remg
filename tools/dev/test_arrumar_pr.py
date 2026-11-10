"""Testes do arrumar_pr.py (roda no GitHub Actions antes do verificador)."""
import unittest

import arrumar_pr as a

EQUIPE = ["catmaitachi", "Isaias-Alves", "laggeee", "lauralra"]


class TestNumero(unittest.TestCase):
    def test_numero_vem_da_branch(self):
        self.assertEqual(a.numero_da_branch("feat/9-dinic"), 9)
        self.assertIsNone(a.numero_da_branch("main"))
        self.assertIsNone(a.numero_da_branch("feat/dinic"))


class TestCloses(unittest.TestCase):
    def test_acrescenta_closes(self):
        self.assertEqual(a.corpo_com_closes("Faz o dinic", 9), "Faz o dinic\n\nCloses #9")
        self.assertEqual(a.corpo_com_closes(None, 9), "Closes #9")
        self.assertEqual(a.corpo_com_closes("", 9), "Closes #9")

    def test_nao_mexe_se_ja_tem(self):
        self.assertIsNone(a.corpo_com_closes("fixes #9", 9))
        self.assertIsNone(a.corpo_com_closes("Resolves #12\nalgo", 9))


class TestQuandoPedirRevisor(unittest.TestCase):
    def test_so_quando_o_pr_abre(self):
        self.assertTrue(a.pedir_revisor_agora("opened"))
        self.assertTrue(a.pedir_revisor_agora("reopened"))
        self.assertFalse(a.pedir_revisor_agora("synchronize"))
        self.assertFalse(a.pedir_revisor_agora("labeled"))


class TestRevisor(unittest.TestCase):
    def test_nunca_e_o_autor(self):
        for n in range(8):
            r = a.revisor("laggeee", EQUIPE, n)
            self.assertIn(r, EQUIPE)
            self.assertNotEqual(r, "laggeee")

    def test_autor_sem_diferenciar_maiusculas(self):
        self.assertNotEqual(a.revisor("LAGGEEE", EQUIPE, 1).lower(), "laggeee")

    def test_rodizio_muda_com_o_numero_do_pr(self):
        self.assertNotEqual(a.revisor("laggeee", EQUIPE, 1), a.revisor("laggeee", EQUIPE, 2))

    def test_sem_outra_pessoa_nao_ha_revisor(self):
        self.assertIsNone(a.revisor("x", ["x"], 1))
        self.assertIsNone(a.revisor("x", [], 1))

    def test_autor_de_fora_escolhe_qualquer_um(self):
        self.assertIn(a.revisor("dependabot", EQUIPE, 3), EQUIPE)


if __name__ == "__main__":
    unittest.main()
