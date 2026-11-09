"""🛡️ Verificador do projeto Cintilante: confere se commit, push ou PR seguem as regras.

Regras e motivos: docs/spec/11-verificador.md · Instalar os hooks: git config core.hooksPath .githooks

  python tools/verificar/verificar.py                 relatório da branch atual contra a main
  python tools/verificar/verificar.py --pre-commit    (hook) arquivos preparados para o commit
  python tools/verificar/verificar.py --mensagem ARQ  (hook) mensagem do commit
  python tools/verificar/verificar.py --pre-push      (hook) lê as refs do push na entrada padrão
  python tools/verificar/verificar.py --pr            (GitHub Actions) PR inteiro, com labels e descrição
"""
import argparse
import json
import os
import pathlib
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import regras as r  # noqa: E402

EXT_CPP = (".cpp", ".cc", ".cxx", ".h", ".hpp", ".hxx")
ZERO = "0" * 40


def git(*args, falha_ok=False):
    # quotePath=false: sem isso o git devolve nomes com acento entre aspas e com escapes (\303\247)
    p = subprocess.run(["git", "-c", "core.quotePath=false", *args], capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    if p.returncode:
        if falha_ok:
            return None
        sys.exit(f"🛡️ git {' '.join(args)} falhou: {p.stderr.strip()}")
    return p.stdout


def linhas(*args):
    return [l for l in (git(*args) or "").splitlines() if l]


def checar_conteudo(arquivos, rev):
    """rev = "" para o que está preparado (index) ou um commit."""
    existe = set(linhas("ls-files") if rev == "" else linhas("ls-tree", "-r", "--name-only", rev)).__contains__
    achados, pesos = [], []
    for a in arquivos:
        if a.endswith(EXT_CPP):
            texto = git("show", f"{rev}:{a}")
            achados += r.checar_cpp(a, texto, existe) + r.checar_fichas(a, texto)
        elif a.endswith(".py"):
            texto = git("show", f"{rev}:{a}")
            achados += r.checar_python(a, texto) + r.checar_python_nucleo(a, texto) + r.checar_fichas(a, texto)
        pesos.append((a, int(git("cat-file", "-s", f"{rev}:{a}"))))
    return achados + r.checar_peso(pesos)


def mexeu_em(diff, rev_novo, rev_antigo, protegidas):
    """O diff (-U0) toca alguma linha protegida (ficha ✍️, parte à mão do README), na versão nova ou na antiga?"""
    for arq, (removidas, adicionadas) in r.linhas_tocadas(diff).items():
        novo = git("show", f"{rev_novo}:{arq}", falha_ok=True) or ""
        antigo = git("show", f"{rev_antigo}:{arq}", falha_ok=True) or ""
        if adicionadas & protegidas(novo) or removidas & protegidas(antigo):
            return True
    return False


def checar_trechos_a_mao(diff_de, rev_novo, rev_antigo, sha, msg):
    """V8 (README) e V15 (fichas) de um commit ou do que está preparado."""
    return (r.checar_readme_ia([(sha, msg, mexeu_em(diff_de("README.md"), rev_novo, rev_antigo, r.linhas_a_mao_readme))])
            + r.checar_ficha_ia([(sha, msg, mexeu_em(diff_de(r.PASTA_FICHA), rev_novo, rev_antigo, r.linhas_de_ficha))]))


def pre_commit():
    achados = []
    branch = git("branch", "--show-current").strip()
    if branch:  # vazio = HEAD solto (rebase etc.)
        achados += r.checar_branch(branch)
    achados += checar_conteudo(linhas("diff", "--cached", "--name-only", "--diff-filter=ACMR"), "")
    return "commit (arquivos preparados)", achados


def mensagem(arquivo):
    msg = pathlib.Path(arquivo).read_text(encoding="utf-8", errors="replace")
    preparados = linhas("diff", "--cached", "--name-only")
    achados = r.checar_mensagem(msg)
    if r.tem_coautor_ia(msg):
        achados += checar_trechos_a_mao(lambda p: git("diff", "--cached", "-U0", "--", p), "", "HEAD", "preparado", msg)
    if r.tem_coautor_ia(msg) and r.REGISTRO_IA not in preparados:
        achados.append(r.Achado("V7", r.AVISO, "commit com coautoria de IA",
                                f"lembre de registrar em {r.REGISTRO_IA} antes do PR"))
    return "mensagem do commit", achados


def base_padrao():
    for ref in ("origin/main", "main"):
        base = git("merge-base", ref, "HEAD", falha_ok=True)
        if base:
            return base.strip()
    sys.exit("🛡️ não achei a main para comparar (rode git fetch)")


def checar_intervalo(base, head, branch, labels=None, corpo=None):
    """Tudo que muda entre base e head. labels/corpo = None quando não há PR (rodando local)."""
    achados = r.checar_branch(branch) if branch else []
    commits = []
    for bloco in (git("log", "--format=%H%x1f%B%x1e", f"{base}..{head}") or "").split("\x1e"):
        if "\x1f" not in bloco:
            continue
        sha, msg = bloco.strip().split("\x1f", 1)
        commits.append((sha, msg, linhas("diff-tree", "--no-commit-id", "--name-only", "-r", "--root", sha)))
        achados += [a._replace(msg=f"{sha[:7]}: {a.msg}") for a in r.checar_mensagem(msg)]
    alterados = linhas("diff", "--name-only", base, head)
    achados += checar_conteudo(linhas("diff", "--name-only", "--diff-filter=ACMR", base, head), head)
    achados += r.checar_ia(commits, alterados, labels)
    for sha, msg, _ in commits:
        if r.tem_coautor_ia(msg):
            achados += checar_trechos_a_mao(lambda p, s=sha: git("show", "--format=", "-U0", s, "--", p), sha, f"{sha}^", sha, msg)
    achados += r.checar_coerencia(alterados, linhas("diff", "--name-only", "--diff-filter=A", base, head))
    if corpo is not None:
        achados += r.checar_corpo_pr(corpo)
    if labels is not None:
        readme = [l[1:] for l in linhas("diff", base, head, "--", "README.md") if l.startswith("+") and not l.startswith("+++")]
        achados += r.checar_readme_feature(labels, readme)
    return f"{branch or head[:7]} → main · {len(commits)} commit(s)", achados


def pre_push():
    achados, titulo = [], "push"
    for linha in sys.stdin.read().splitlines():
        local_ref, local_sha, remoto_ref, _ = linha.split()
        if local_sha == ZERO:  # apagando uma branch remota
            continue
        if remoto_ref == "refs/heads/main":
            achados.append(r.Achado("V13", r.ERRO, "push direto na main",
                                    "suba a sua branch e abra um PR"))
            continue
        titulo, novos = checar_intervalo(base_padrao(), local_sha, local_ref.removeprefix("refs/heads/"))
        achados += novos
    return titulo, achados


def pr():
    evento = json.loads(pathlib.Path(os.environ["GITHUB_EVENT_PATH"]).read_text(encoding="utf-8"))["pull_request"]
    corpo, labels = evento.get("body") or "", {l["name"] for l in evento["labels"]}
    if os.environ.get("GH_TOKEN"):  # o job "arrumar" pode ter mudado o PR depois do evento
        atual = subprocess.run(["gh", "pr", "view", str(evento["number"]), "--json", "body,labels"],
                               capture_output=True, text=True, encoding="utf-8")
        if atual.returncode == 0:
            dados = json.loads(atual.stdout)
            corpo, labels = dados["body"] or "", {l["name"] for l in dados["labels"]}
        else:
            print(f"⚠️ não consegui reler o PR (uso a versão do evento): {atual.stderr.strip()}")
    return checar_intervalo(evento["base"]["sha"], evento["head"]["sha"], evento["head"]["ref"],
                            labels=labels, corpo=corpo)


def relatorio(titulo, achados):
    erros = sum(a.nivel == r.ERRO for a in achados)
    texto = [f"🛡️ Verificador · {titulo}", ""]
    texto += [f"{a.nivel} {a.regra}  {a.msg}\n       → {a.dica}" for a in achados] or ["✅ tudo certo"]
    texto += ["", f"Resultado: ❌ {erros} bloqueio(s) · ⚠️ {len(achados) - erros} aviso(s)"]
    if erros:
        texto.append("Regras e motivos: docs/spec/11-verificador.md")
    saida = "\n".join(texto)
    print(saida)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as f:
            f.write(f"```text\n{saida}\n```\n")
    return 1 if erros else 0


def main():
    for fluxo in (sys.stdout, sys.stderr):  # emojis no console do Windows
        fluxo.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    modo = p.add_mutually_exclusive_group()
    modo.add_argument("--pre-commit", action="store_true")
    modo.add_argument("--mensagem", metavar="ARQ")
    modo.add_argument("--pre-push", action="store_true")
    modo.add_argument("--pr", action="store_true")
    a = p.parse_args()
    if a.pre_commit:
        resultado = pre_commit()
    elif a.mensagem:
        resultado = mensagem(a.mensagem)
    elif a.pre_push:
        resultado = pre_push()
    elif a.pr:
        resultado = pr()
    else:
        resultado = checar_intervalo(base_padrao(), "HEAD", git("branch", "--show-current").strip())
    return relatorio(*resultado)


if __name__ == "__main__":
    sys.exit(main())
