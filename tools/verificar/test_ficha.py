"""Testes da ficha ✍️ de entendimento (V14, V15) em core/grafo."""
import unittest

import regras as r


def ficha(por="Laura", faz="acha o fluxo máximo", como="BFS por níveis e DFS que empurra fluxo",
          compl="O(V²E), cada fase é O(VE)", ex="grafo do papel → 23", lim="não é física elétrica"):
    return (f"/* ✍️ ENTENDIMENTO · por: {por}\n"
            f" * O que faz: {faz}\n"
            f" * Como funciona: {como}\n"
            f" * Complexidade: {compl}\n"
            f" * Exemplo: {ex}\n"
            f" * Limitação: {lim}\n"
            f" */\n")


MODELO = r.MODELO_FICHA + "\n"


def nomes(texto):
    return [n for n, _ in r.definicoes_de_funcao(texto)]


class TestDefinicoes(unittest.TestCase):
    def test_funcao_livre_e_metodo(self):
        texto = "#include <vector>\nint soma(int a, int b) {\n  return a + b;\n}\nFluxo Dinic::fluxoMaximo(Grafo& g, int s) {\n  if (s) { return {}; }\n  for (;;) {}\n}\n"
        self.assertEqual(nomes(texto), ["soma", "Dinic::fluxoMaximo"])

    def test_prototipo_lambda_e_controle_nao_contam(self):
        texto = "int f(int);\nvoid g() {\n  auto h = [](int x) { return x; };\n  while (true) { break; }\n}\n"
        self.assertEqual(nomes(texto), ["g"])

    def test_metodo_dentro_de_classe_e_namespace(self):
        texto = "namespace luzes {\nclass Heap {\npublic:\n  bool vazia() const { return n == 0; }\n  int n;\n};\n}\n"
        self.assertEqual(nomes(texto), ["vazia"])

    def test_template_e_construtor_com_inicializador(self):
        texto = "template <typename T>\nT maior(T a, T b) { return a > b ? a : b; }\nGrafo::Grafo(int n) : V(n), head(n, -1) {}\n"
        self.assertEqual(nomes(texto), ["maior", "Grafo::Grafo"])

    def test_chave_em_comentario_ou_string_nao_confunde(self):
        texto = '// void falso() {\nconst char* s = "x { y";\nvoid real() {}\n'
        self.assertEqual(nomes(texto), ["real"])


class TestFichaV14(unittest.TestCase):
    def checar(self, texto, caminho="core/grafo/dinic.cpp"):
        return [(a.regra, a.nivel) for a in r.checar_fichas(caminho, texto)]

    def test_funcao_com_ficha_completa_passa(self):
        self.assertEqual(self.checar(ficha() + "int f() { return 1; }\n"), [])

    def test_ficha_antes_de_template_e_de_publico_passa(self):
        texto = "class H {\npublic:\n" + ficha() + "  bool vazia() const { return true; }\n};\n" + ficha() + "template <class T>\nT g(T x) { return x; }\n"
        self.assertEqual(self.checar(texto), [])

    def test_funcao_sem_ficha_bloqueia(self):
        self.assertEqual(self.checar("int f() { return 1; }\n"), [("V14", r.ERRO)])

    def test_comentario_comum_nao_vale_como_ficha(self):
        self.assertEqual(self.checar("/* soma */\nint f() { return 1; }\n"), [("V14", r.ERRO)])

    def test_modelo_nao_preenchido_bloqueia(self):
        self.assertEqual(self.checar(MODELO + "int f() { return 1; }\n"), [("V14", r.ERRO)])

    def test_campo_vazio_ou_sem_autor_bloqueia(self):
        self.assertEqual(self.checar(ficha(compl="") + "int f() {}\n"), [("V14", r.ERRO)])
        self.assertEqual(self.checar(ficha(por="") + "int f() {}\n"), [("V14", r.ERRO)])

    def test_travessao_so_vale_em_exemplo_e_limitacao(self):
        self.assertEqual(self.checar(ficha(ex="—", lim="—") + "bool vazia() { return true; }\n"), [])
        self.assertEqual(self.checar(ficha(como="—") + "int f() {}\n"), [("V14", r.ERRO)])

    def test_campo_em_varias_linhas(self):
        texto = ficha(como="BFS monta níveis;\n *   DFS empurra fluxo") + "int f() {}\n"
        self.assertEqual(self.checar(texto), [])

    def test_fora_de_core_grafo_nao_e_checado(self):
        self.assertEqual(self.checar("int f() { return 1; }\n", "core/dominio/rede.cpp"), [])
        self.assertEqual(self.checar("x", "core/grafo/LEIAME.md"), [])


class TestFichasEPreenchimento(unittest.TestCase):
    def test_lista_fichas_e_diz_se_estao_preenchidas(self):
        texto = "int a;\n" + MODELO + "int f() {}\n" + ficha() + "int g() {}\n"
        fs = r.fichas(texto)
        self.assertEqual([f.preenchida for f in fs], [False, True])
        self.assertEqual(fs[0].linhas, range(2, 2 + len(MODELO.splitlines())))

    def test_linhas_de_ficha(self):
        texto = "int a;\n" + ficha() + "int g() {}\n"
        self.assertEqual(r.linhas_de_ficha(texto), set(range(2, 9)))


class TestDiffEV15(unittest.TestCase):
    DIFF = ("diff --git a/core/grafo/dinic.cpp b/core/grafo/dinic.cpp\n"
            "--- a/core/grafo/dinic.cpp\n+++ b/core/grafo/dinic.cpp\n"
            "@@ -3,2 +3,0 @@ x\n-a\n-b\n"
            "@@ -10 +8,3 @@ y\n-c\n+d\n+e\n+f\n"
            "diff --git a/core/grafo/novo.cpp b/core/grafo/novo.cpp\n"
            "--- /dev/null\n+++ b/core/grafo/novo.cpp\n@@ -0,0 +1,2 @@\n+x\n+y\n")

    def test_le_linhas_tocadas_do_diff(self):
        self.assertEqual(r.linhas_tocadas(self.DIFF), {
            "core/grafo/dinic.cpp": ({3, 4, 10}, {8, 9, 10}),
            "core/grafo/novo.cpp": (set(), {1, 2}),
        })

    def test_commit_de_ia_que_mexe_em_ficha_bloqueia(self):
        ia = "feat: dinic\n\nCo-Authored-By: Claude <noreply@anthropic.com>"
        self.assertEqual([(a.regra, a.nivel) for a in r.checar_ficha_ia([("a1b2c3d", ia, True)])], [("V15", r.ERRO)])

    def test_commit_humano_ou_sem_ficha_passa(self):
        ia = "feat: dinic\n\nCo-Authored-By: Claude <noreply@anthropic.com>"
        self.assertEqual(r.checar_ficha_ia([("a1", "docs: ficha do dinic", True), ("b2", ia, False)]), [])


def ficha_py(indent="", por="Laura", faz="acha o fluxo máximo", como="BFS por níveis e DFS que empurra fluxo",
             compl="O(V²E), cada fase é O(VE)", ex="grafo do papel → 23", lim="não é física elétrica"):
    linhas = [f"✍️ ENTENDIMENTO · por: {por}", f"O que faz: {faz}", f"Como funciona: {como}",
              f"Complexidade: {compl}", f"Exemplo: {ex}", f"Limitação: {lim}"]
    return "".join(f"{indent}# {l}\n" for l in linhas)


class TestFichaPython(unittest.TestCase):
    PY = "core/grafo/x.py"

    def regras(self, texto, caminho=PY):
        return [(a.regra, a.msg) for a in r.checar_fichas(caminho, texto)]

    def test_definicoes_py_modulo_classe_decorador(self):
        t = ("def a():\n    def interno():\n        pass\n    return interno\n\n"
             "class G:\n    def __init__(self):\n        pass\n\n    @property\n    def n(self):\n        return 1\n\n"
             "    def _p(self):\n        pass\n")
        achadas = r.definicoes_py(t)
        self.assertEqual([n for n, _ in achadas], ["a", "__init__", "n", "_p"])
        self.assertEqual(dict(achadas)["n"], 10)  # linha do @property

    def test_py_sem_ficha_barra(self):
        achados = self.regras("def f():\n    return 1\n")
        self.assertEqual([a for a, _ in achados], ["V14"])
        self.assertIn("não tem ficha", achados[0][1])

    def test_py_ficha_completa_passa(self):
        self.assertEqual(self.regras(ficha_py() + "def f():\n    return 1\n"), [])

    def test_py_modelo_vazio_barra(self):
        achados = self.regras(r.MODELO_FICHA_PY + "\ndef f():\n    pass\n")
        self.assertEqual([a for a, _ in achados], ["V14"])
        self.assertIn("sem autor", achados[0][1])

    def test_py_metodo_indentado_com_decorador(self):
        t = "class G:\n" + ficha_py(indent="    ") + "    @staticmethod\n    def f():\n        pass\n"
        self.assertEqual(self.regras(t), [])

    def test_py_crlf(self):
        self.assertEqual(self.regras((ficha_py() + "def f():\n    return 1\n").replace("\n", "\r\n")), [])

    def test_py_bom(self):
        texto = "﻿" + ficha_py() + "def f():\n    return 1\n"
        self.assertEqual(self.regras(texto), [])
        self.assertEqual(len(r.fichas(texto)), 1)

    def test_py_fora_de_core_grafo_ignora(self):
        self.assertEqual(self.regras("def f(): pass\n", "core/dominio/x.py"), [])

    def test_py_sintaxe_invalida_nao_explode(self):
        self.assertEqual(self.regras("def f(:\n"), [])

    def test_fichas_acha_bloco_py(self):
        achadas = r.fichas(ficha_py() + "def f(): pass\n")
        self.assertEqual(len(achadas), 1)
        self.assertTrue(achadas[0].preenchida)
        self.assertEqual(achadas[0].linhas, range(1, 7))


if __name__ == "__main__":
    unittest.main()
