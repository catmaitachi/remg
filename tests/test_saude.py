import unittest

from core.casos_de_uso.saude import saude


class TestSaude(unittest.TestCase):
    def test_saude_responde_true(self):
        self.assertIs(saude(), True)


if __name__ == "__main__":
    unittest.main()
