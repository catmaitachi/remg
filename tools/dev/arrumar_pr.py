"""🪄 Arruma o PR antes do verificador (GitHub Actions): Closes #N, milestone, label de IA e revisor.

Cada ajuste é independente: se um falhar, avisa e segue. Regras: docs/spec/13-automacao.md
"""
import json
import os
import pathlib
import re
import subprocess
import sys

RAIZ = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "tools" / "verificar"))
import regras  # noqa: E402

EQUIPE = RAIZ / ".github" / "equipe.txt"


def numero_da_branch(ref):
    m = re.match(r"^[a-z]+/(\d+)-", ref or "")
    return int(m.group(1)) if m else None


def corpo_com_closes(corpo, numero):
    """Corpo novo com `Closes #N`, ou None se já fecha alguma issue."""
    if regras.checar_corpo_pr(corpo) == []:
        return None
    return f"{corpo}\n\nCloses #{numero}" if (corpo or "").strip() else f"Closes #{numero}"


def revisor(autor, equipe, numero_pr):
    """Rodízio pelo número do PR entre quem não é o autor."""
    outros = [e for e in equipe if e.lower() != (autor or "").lower()]
    return outros[numero_pr % len(outros)] if outros else None


def pedir_revisor_agora(acao):
    """Só quando o PR abre: depois da review o GitHub tira o revisor da lista e o pedido se repetiria a cada push."""
    return acao in ("opened", "reopened")


def _gh(*args):
    p = subprocess.run(["gh", *args], capture_output=True, text=True, encoding="utf-8", errors="replace")
    if p.returncode:
        raise RuntimeError(p.stderr.strip())
    return p.stdout


def _tentar(o_que, *args):
    try:
        _gh(*args)
        print(f"🪄 {o_que}")
    except RuntimeError as erro:
        print(f"⚠️ não deu para {o_que}: {erro}")


def main():
    for fluxo in (sys.stdout, sys.stderr):
        fluxo.reconfigure(encoding="utf-8")
    evento = json.loads(pathlib.Path(os.environ["GITHUB_EVENT_PATH"]).read_text(encoding="utf-8"))
    pr = evento["pull_request"]
    n_pr = str(pr["number"])
    issue = numero_da_branch(pr["head"]["ref"])
    if issue is None:
        print("🪄 branch fora do padrão tipo/N-descricao: o verificador vai apontar (V2).")
        return
    novo = corpo_com_closes(pr.get("body"), issue)
    if novo:
        _tentar(f"pôr Closes #{issue} na descrição", "pr", "edit", n_pr, "--body", novo)
    if not pr.get("milestone"):
        try:
            ms = json.loads(_gh("issue", "view", str(issue), "--json", "milestone"))["milestone"]
        except RuntimeError:
            ms = None
        if ms:
            _tentar(f"pôr a milestone {ms['title']}", "pr", "edit", n_pr, "--milestone", ms["title"])
    if pedir_revisor_agora(evento.get("action")) and not pr.get("requested_reviewers"):
        equipe = EQUIPE.read_text(encoding="utf-8").split() if EQUIPE.exists() else []
        quem = revisor(pr["user"]["login"], equipe, pr["number"])
        if quem:
            _tentar(f"pedir revisão a {quem}", "pr", "edit", n_pr, "--add-reviewer", quem)


if __name__ == "__main__":
    main()
