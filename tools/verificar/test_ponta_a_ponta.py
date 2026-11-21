"""Testa os hooks de verdade: cria um repositório temporário e tenta commits proibidos."""
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
import unittest

RAIZ = pathlib.Path(__file__).resolve().parents[2]
HOOKS = RAIZ / ".githooks"
VERIFICAR = RAIZ / "tools" / "verificar" / "verificar.py"


@unittest.skipUnless(shutil.which("git"), "precisa do git")
class TestPontaAPonta(unittest.TestCase):
    def setUp(self):
        for h in HOOKS.iterdir():  # garante o bit de execução em Linux/macOS
            os.chmod(h, 0o755)
        self.dir = tempfile.mkdtemp()
        self.git("init", "-q", "-b", "main")
        self.git("config", "user.name", "Teste")
        self.git("config", "user.email", "teste@exemplo.com")
        self.git("config", "core.hooksPath", str(HOOKS))
        self.escrever("README.md", "# teste\n")
        self.git("add", ".")
        self.git("commit", "-q", "--no-verify", "-m", "chore: inicio")

    def tearDown(self):
        shutil.rmtree(self.dir, ignore_errors=True)

    def git(self, *args):
        return subprocess.run(["git", *args], cwd=self.dir, capture_output=True, text=True,
                              encoding="utf-8", errors="replace")

    def escrever(self, caminho, texto):
        p = pathlib.Path(self.dir, caminho)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(texto, encoding="utf-8")

    def commit(self, mensagem, **arquivos):
        for caminho, texto in arquivos.items():
            self.escrever(caminho.replace("__", "/"), texto)
        self.git("add", ".")
        p = self.git("commit", "-q", "-m", mensagem)
        return p.returncode, p.stdout + p.stderr

    def test_commit_na_main_e_barrado(self):
        rc, saida = self.commit("feat: x", a__b_txt="oi")
        self.assertNotEqual(rc, 0)
        self.assertIn("V13", saida)

    def test_mensagem_fora_do_formato_e_barrada(self):
        self.git("switch", "-q", "-c", "feat/1-grafo")
        rc, saida = self.commit("arrumei o grafo", core__grafo__a_cpp="#include <vector>\n")
        self.assertNotEqual(rc, 0)
        self.assertIn("V1", saida)

    def test_import_proibido_no_nucleo_e_barrado(self):
        self.git("switch", "-q", "-c", "feat/1-grafo")
        rc, saida = self.commit("feat: grafo", **{"core__grafo__a.py": "import heapq\n"})
        self.assertNotEqual(rc, 0)
        self.assertIn("V4", saida)

    def test_arquivo_com_acento_no_nome_passa(self):
        self.git("switch", "-q", "-c", "docs/1-pdf")
        rc, saida = self.commit("docs: enunciado", **{"docs__Introdução.pdf": "pdf\n"})
        self.assertEqual(rc, 0, saida)

    def test_commit_certo_passa(self):
        self.git("switch", "-q", "-c", "feat/1-grafo")
        rc, saida = self.commit("feat: grafo", **{"core__grafo__a.py": "import math\n",
                                                  "tests__test_a.py": "x = 1\n"})
        self.assertEqual(rc, 0, saida)

    IA = "\n\nCo-Authored-By: Claude <noreply@anthropic.com>"

    def test_commit_com_coautoria_de_ia_e_barrado(self):
        self.git("switch", "-q", "-c", "docs/1-readme")
        rc, saida = self.commit("docs: como rodar" + self.IA, **{"README.md": "# teste\n## Como rodar\n"})
        self.assertNotEqual(rc, 0)
        self.assertIn("V17", saida)

    def test_coautor_humano_passa(self):
        self.git("switch", "-q", "-c", "docs/1-readme")
        rc, saida = self.commit("docs: como rodar\n\nCo-Authored-By: Laura <l@x.com>",
                                **{"README.md": "# teste\n## Como rodar\n"})
        self.assertEqual(rc, 0, saida)

    def relatorio_da_branch(self):
        p = subprocess.run([sys.executable, str(VERIFICAR)], cwd=self.dir, capture_output=True,
                           text=True, encoding="utf-8", errors="replace")
        return p.returncode, p.stdout + p.stderr

    def test_relatorio_da_branch_limpa(self):
        self.git("switch", "-q", "-c", "feat/1-grafo")
        self.commit("feat: grafo", **{"core__grafo__a.py": "import math\n", "tests__test_a.py": "x = 1\n"})
        rc, saida = self.relatorio_da_branch()
        self.assertEqual(rc, 0, saida)
        self.assertIn("Resultado", saida)

    def test_relatorio_pega_coautoria_que_pulou_o_hook(self):
        self.git("switch", "-q", "-c", "feat/1-grafo")
        self.escrever("core/grafo/a.py", "import math\n")
        self.git("add", ".")
        self.git("commit", "-q", "--no-verify", "-m", "feat: grafo" + self.IA)
        rc, saida = self.relatorio_da_branch()
        self.assertNotEqual(rc, 0)
        self.assertIn("V17", saida)


    def rodar(self, *args, entrada="", env=None):
        p = subprocess.run([sys.executable, str(VERIFICAR), *args], cwd=self.dir, input=entrada,
                           capture_output=True, text=True, encoding="utf-8", errors="replace",
                           env={**os.environ, **(env or {})})
        return p.returncode, p.stdout + p.stderr

    def pr(self, corpo, labels):
        base = self.git("rev-parse", "main").stdout.strip()
        head = self.git("rev-parse", "HEAD").stdout.strip()
        evento = pathlib.Path(self.dir, "evento.json")
        evento.write_text(json.dumps({"pull_request": {
            "base": {"sha": base}, "head": {"sha": head, "ref": "feat/1-falhas"},
            "body": corpo, "labels": [{"name": l} for l in labels]}}), encoding="utf-8")
        return self.rodar("--pr", env={"GITHUB_EVENT_PATH": str(evento)})

    def test_pr_de_feature_sem_readme_e_sem_issue_e_barrado(self):
        self.git("switch", "-q", "-c", "feat/1-falhas")
        self.commit("feat: falhas", **{"core__dominio__f.py": "x = 1\n", "tests__test_f.py": "x = 1\n"})
        rc, saida = self.pr("implementa falhas", ["feature-principal"])
        self.assertNotEqual(rc, 0)
        self.assertIn("V3", saida)
        self.assertIn("V8", saida)

    def test_pr_de_feature_completo_passa(self):
        self.git("switch", "-q", "-c", "feat/1-falhas")
        self.commit("feat: falhas", **{"core__dominio__f.py": "x = 1\n", "tests__test_f.py": "x = 1\n",
                                       "README.md": "# teste\n## 💥 Falhas\n✍️ Escrito por: Laura\n"})
        rc, saida = self.pr("Closes #1", ["feature-principal"])
        self.assertEqual(rc, 0, saida)

    FICHA = ("/* ✍️ ENTENDIMENTO · por: Laura\n * O que faz: soma\n * Como funciona: a + b\n"
             " * Complexidade: O(1)\n * Exemplo: —\n * Limitação: —\n */\n")
    IA = "\n\nCo-Authored-By: Claude <noreply@anthropic.com>"

    def test_funcao_do_grafo_sem_ficha_e_barrada(self):
        self.git("switch", "-q", "-c", "feat/1-grafo")
        rc, saida = self.commit("feat: soma", **{"core__grafo__s.cpp": "int soma() { return 1; }\n", "tests__t.cpp": "x\n"})
        self.assertNotEqual(rc, 0)
        self.assertIn("V14", saida)

    def test_funcao_com_ficha_feita_a_mao_passa(self):
        self.git("switch", "-q", "-c", "feat/1-grafo")
        rc, saida = self.commit("feat: soma", **{"core__grafo__s.cpp": self.FICHA + "int soma() { return 1; }\n", "tests__t.cpp": "x\n"})
        self.assertEqual(rc, 0, saida)

    def test_commit_de_ia_que_preenche_ficha_e_barrado(self):
        self.git("switch", "-q", "-c", "feat/1-grafo")
        rc, saida = self.commit("feat: soma" + self.IA, **{"core__grafo__s.cpp": self.FICHA + "int soma() { return 1; }\n",
                                                           "tests__t.cpp": "x\n", "docs__ia__registro.md": "x\n"})
        self.assertNotEqual(rc, 0)
        self.assertIn("V15", saida)

    def test_relatorio_pega_ficha_mexida_por_ia_que_pulou_o_hook(self):
        self.git("switch", "-q", "-c", "feat/1-grafo")
        self.escrever("core/grafo/s.cpp", self.FICHA + "int soma() { return 1; }\n")
        self.escrever("docs/ia/registro.md", "x\n")
        self.git("add", ".")
        self.git("commit", "-q", "--no-verify", "-m", "feat: soma" + self.IA)
        rc, saida = self.relatorio_da_branch()
        self.assertNotEqual(rc, 0)
        self.assertIn("V15", saida)

    def test_post_merge_apaga_so_branch_ja_mergeada(self):
        remoto = tempfile.mkdtemp()
        subprocess.run(["git", "init", "-q", "--bare", remoto], capture_output=True)
        self.git("remote", "add", "origin", remoto)
        self.git("push", "-q", "--no-verify", "origin", "main")
        for branch, arquivo in (("feat/1-pronta", "a.txt"), ("feat/2-aberta", "b.txt")):
            self.git("switch", "-q", "-c", branch, "main")
            self.commit("feat: algo", **{arquivo: branch})
            self.git("push", "-q", "--no-verify", "-u", "origin", branch)
            self.git("push", "-q", "--no-verify", "origin", "--delete", branch)  # o GitHub apaga depois do merge
        self.git("switch", "-q", "main")
        self.git("merge", "-q", "--no-ff", "--no-verify", "-m", "Merge feat/1-pronta", "feat/1-pronta")
        p = subprocess.run(["sh", str(HOOKS / "post-merge")], cwd=self.dir, capture_output=True, text=True,
                           encoding="utf-8", errors="replace")
        self.assertEqual(p.returncode, 0, p.stderr)
        branches = self.git("branch", "--format=%(refname:short)").stdout.split()
        self.assertNotIn("feat/1-pronta", branches)
        self.assertIn("feat/2-aberta", branches)
        shutil.rmtree(remoto, ignore_errors=True)

    def test_push_na_main_e_barrado(self):
        sha = self.git("rev-parse", "HEAD").stdout.strip()
        rc, saida = self.rodar("--pre-push", entrada=f"refs/heads/main {sha} refs/heads/main {'0' * 40}\n")
        self.assertNotEqual(rc, 0)
        self.assertIn("V13", saida)


if __name__ == "__main__":
    unittest.main()
