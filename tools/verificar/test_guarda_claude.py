"""Testes da guarda do Claude Code (hook PreToolUse em .claude/settings.json)."""
import json
import pathlib
import tempfile
import unittest

import guarda_claude as g

MARCA = g.MARCA_README
README = f"# luzes\n\n## Como rodar\nnpm run dev\n\n{MARCA}\n\n## 💥 Falhas\ntexto da Laura\n✍️ Escrito por: Laura\n"


class Base(unittest.TestCase):
    def setUp(self):
        self.raiz = pathlib.Path(tempfile.mkdtemp())
        (self.raiz / "README.md").write_text(README, encoding="utf-8")

    def decidir(self, ferramenta, **entrada):
        if "file_path" in entrada:
            entrada["file_path"] = str(self.raiz / entrada["file_path"])
        return g.decidir({"tool_name": ferramenta, "tool_input": entrada}, self.raiz)

    def nivel(self, ferramenta, **entrada):
        r = self.decidir(ferramenta, **entrada)
        return r[0] if r else None


class TestBash(Base):  # G1
    def test_no_verify_e_barrado(self):
        self.assertEqual(self.nivel("Bash", command='git commit --no-verify -m "feat: x"'), "deny")
        self.assertEqual(self.nivel("Bash", command="git push --no-verify"), "deny")

    def test_commit_com_n_e_barrado(self):
        self.assertEqual(self.nivel("Bash", command='git commit -nm "feat: x"'), "deny")
        self.assertEqual(self.nivel("Bash", command='git commit -n -m "feat: x"'), "deny")

    def test_amend_nao_e_confundido_com_n(self):
        self.assertIsNone(self.decidir("Bash", command='git commit --amend -m "feat: x"'))

    def test_trocar_ou_apagar_hookspath_e_barrado(self):
        self.assertEqual(self.nivel("Bash", command="git config core.hooksPath /dev/null"), "deny")
        self.assertEqual(self.nivel("Bash", command="git config --unset core.hooksPath"), "deny")
        self.assertEqual(self.nivel("Bash", command='git -c core.hooksPath= commit -m "x"'), "deny")

    def test_ligar_hookspath_certo_passa(self):
        self.assertIsNone(self.decidir("Bash", command="git config core.hooksPath .githooks"))
        self.assertIsNone(self.decidir("Bash", command="git config core.hooksPath"))

    def test_so_mencionar_a_flag_passa(self):
        self.assertIsNone(self.decidir("Bash", command="python grava_doc.py 'o hook pula com --no-verify; o ruleset nao'"))
        self.assertIsNone(self.decidir("Bash", command="grep -rn -- '--no-verify' docs/"))

    def test_no_verify_em_push_e_merge_e_barrado(self):
        self.assertEqual(self.nivel("Bash", command="git -C luzes push origin feat/1-x --no-verify"), "deny")
        self.assertEqual(self.nivel("Bash", command="cd x && git merge main --no-verify"), "deny")

    def test_comando_comum_passa(self):
        self.assertIsNone(self.decidir("Bash", command='git commit -m "feat: dinic"'))


FICHA_LAURA = ("/* ✍️ ENTENDIMENTO · por: Laura\n * O que faz: fluxo máximo\n * Como funciona: níveis + DFS\n"
               " * Complexidade: O(V²E)\n * Exemplo: —\n * Limitação: —\n */\n")
DINIC = FICHA_LAURA + "int fluxo() {\n  return 0;\n}\n"


class TestNucleo(Base):  # G2: a IA escreve código, mas não preenche a ficha ✍️
    def setUp(self):
        super().setUp()
        (self.raiz / "core" / "grafo").mkdir(parents=True)
        (self.raiz / "core" / "grafo" / "dinic.cpp").write_text(DINIC, encoding="utf-8")

    def test_ia_pode_escrever_codigo(self):
        self.assertIsNone(self.decidir("Edit", file_path="core/grafo/dinic.cpp", old_string="return 0;", new_string="return 42;"))
        self.assertIsNone(self.decidir("Write", file_path="core/grafo/bfs.cpp", content="int bfs() { return 1; }\n"))

    def test_ia_pode_deixar_o_modelo_vazio(self):
        conteudo = g.MODELO_FICHA + "\nint bfs() { return 1; }\n"
        self.assertIsNone(self.decidir("Write", file_path="core/grafo/bfs.cpp", content=conteudo))

    def test_ia_nao_pode_preencher_ficha_nova(self):
        conteudo = FICHA_LAURA.replace("Laura", "Claude") + "int bfs() { return 1; }\n"
        self.assertEqual(self.nivel("Write", file_path="core/grafo/bfs.cpp", content=conteudo), "deny")

    def test_ia_nao_pode_mudar_ficha_existente(self):
        self.assertEqual(self.nivel("Edit", file_path="core/grafo/dinic.cpp", old_string="níveis + DFS", new_string="melhor"), "deny")
        edits = [{"old_string": "return 0;", "new_string": "return 1;"}, {"old_string": "O(V²E)", "new_string": "O(1)"}]
        self.assertEqual(self.nivel("MultiEdit", file_path="core/grafo/dinic.cpp", edits=edits), "deny")

    def test_apagar_ficha_de_alguem_pede_aprovacao(self):
        self.assertEqual(self.nivel("Write", file_path="core/grafo/dinic.cpp", content="int fluxo() { return 0; }\n"), "ask")

    def test_g2_py_ficha_preenchida_nega(self):
        ficha = "".join(f"# {l}\n" for l in ["✍️ ENTENDIMENTO · por: Claude", "O que faz: x", "Como funciona: y",
                                              "Complexidade: O(1)", "Exemplo: —", "Limitação: —"])
        self.assertEqual(self.nivel("Write", file_path="core/grafo/bfs.py", content=ficha + "def bfs():\n    return 1\n"), "deny")

    def test_g2_py_modelo_vazio_deixa(self):
        conteudo = g.r.MODELO_FICHA_PY + "\ndef bfs():\n    return 1\n"
        self.assertIsNone(self.decidir("Write", file_path="core/grafo/bfs.py", content=conteudo))

    def test_outras_pastas_do_nucleo_passam(self):
        self.assertIsNone(self.decidir("Edit", file_path="core/dominio/rede.cpp", old_string="a", new_string="b"))
        self.assertIsNone(self.decidir("Write", file_path="tests/test_dinic.cpp", content="x"))


class TestReadme(Base):  # G3
    def test_editar_parte_geral_passa(self):
        self.assertIsNone(self.decidir("Edit", file_path="README.md", old_string="npm run dev", new_string="npm run dev -- --open"))

    def test_editar_parte_a_mao_e_barrado(self):
        self.assertEqual(self.nivel("Edit", file_path="README.md", old_string="texto da Laura", new_string="melhorado"), "deny")

    def test_apagar_a_marca_e_barrado(self):
        self.assertEqual(self.nivel("Edit", file_path="README.md", old_string=MARCA, new_string=""), "deny")

    def test_multiedit_com_um_trecho_proibido_e_barrado(self):
        edits = [{"old_string": "npm run dev", "new_string": "x"}, {"old_string": "texto da Laura", "new_string": "y"}]
        self.assertEqual(self.nivel("MultiEdit", file_path="README.md", edits=edits), "deny")

    def test_write_que_preserva_a_parte_a_mao_passa(self):
        novo = README.replace("npm run dev", "npm start")
        self.assertIsNone(self.decidir("Write", file_path="README.md", content=novo))

    def test_write_que_muda_a_parte_a_mao_e_barrado(self):
        novo = README.replace("texto da Laura", "texto da IA")
        self.assertEqual(self.nivel("Write", file_path="README.md", content=novo), "deny")

    def test_readme_sem_marca_passa(self):
        (self.raiz / "README.md").write_text("# luzes\n", encoding="utf-8")
        self.assertIsNone(self.decidir("Edit", file_path="README.md", old_string="# luzes", new_string="# Luzes"))


class TestFiscalizacao(Base):  # G4
    def test_mexer_no_verificador_pede_aprovacao(self):
        self.assertEqual(self.nivel("Edit", file_path="tools/verificar/regras.py", old_string="a", new_string="b"), "ask")
        self.assertEqual(self.nivel("Write", file_path=".githooks/pre-commit", content="x"), "ask")
        self.assertEqual(self.nivel("Edit", file_path=".claude/settings.json", old_string="a", new_string="b"), "ask")
        self.assertEqual(self.nivel("Write", file_path=".github/workflows/verificar.yml", content="x"), "ask")

    def test_arquivo_fora_do_projeto_passa(self):
        r = g.decidir({"tool_name": "Write", "tool_input": {"file_path": str(self.raiz.parent / "outro" / "core" / "grafo" / "x.cpp"), "content": "x"}}, self.raiz)
        self.assertIsNone(r)


class TestMain(Base):  # G5: sem task (branch), sem edição
    def setUp(self):
        super().setUp()
        import subprocess
        self.git = lambda *a: subprocess.run(["git", "-C", str(self.raiz), *a], capture_output=True)
        self.git("init", "-q", "-b", "main")

    def test_editar_na_main_e_barrado(self):
        self.assertEqual(self.nivel("Write", file_path="docs/x.md", content="x"), "deny")

    def test_editar_numa_branch_de_task_passa(self):
        self.git("switch", "-q", "-c", "feat/9-dinic")
        self.assertIsNone(self.decidir("Write", file_path="docs/x.md", content="x"))

    def test_fora_do_projeto_passa_mesmo_na_main(self):
        fora = str(self.raiz.parent / "outro.txt")
        self.assertIsNone(g.decidir({"tool_name": "Write", "tool_input": {"file_path": fora, "content": "x"}}, self.raiz))


class TestComoHook(Base):  # roda o script como o Claude Code roda: JSON na entrada, JSON na saída
    def rodar(self, entrada):
        import json, os, subprocess, sys
        script = pathlib.Path(__file__).with_name("guarda_claude.py")
        p = subprocess.run([sys.executable, str(script)], input=json.dumps(entrada, ensure_ascii=False).encode("utf-8"),
                           capture_output=True, env={**os.environ, "CLAUDE_PROJECT_DIR": str(self.raiz),
                                                     "PYTHONIOENCODING": "cp1252"})  # simula Windows comum
        return p.returncode, p.stdout.decode("utf-8"), p.stderr.decode("utf-8", "replace")

    def test_bloqueio_com_acentos_vira_json_de_deny(self):
        entrada = {"tool_name": "Write", "tool_input": {"file_path": str(self.raiz / "core/grafo/bfs.cpp"),
                                                        "content": FICHA_LAURA + "int função() { return 1; } // 💥\n"}}
        rc, saida, erro = self.rodar(entrada)
        self.assertEqual(rc, 0, erro)
        self.assertEqual(json.loads(saida)["hookSpecificOutput"]["permissionDecision"], "deny")

    def test_liberado_nao_imprime_nada(self):
        rc, saida, erro = self.rodar({"tool_name": "Bash", "tool_input": {"command": "git status"}})
        self.assertEqual((rc, saida.strip()), (0, ""), erro)


if __name__ == "__main__":
    unittest.main()
