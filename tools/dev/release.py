"""🏷️ Release automática (GitHub Actions).

- issue fechada e a milestone dela ficou sem issue aberta → fecha a milestone e cria a release;
- milestone fechada à mão → cria a release.
Tudo numa execução só: ação feita pelo token do Actions não dispara outro workflow.
Regras: docs/spec/12-releases.md e 13-automacao.md
"""
import json
import os
import pathlib
import re
import subprocess
import sys


def versao(titulo):
    m = re.match(r"^(v\d+\.\d+)\b", titulo or "")
    return f"{m.group(1)}.0" if m else None


def deve_fechar(milestone):
    return bool(milestone) and milestone["state"] == "open" and milestone["open_issues"] == 0 \
        and versao(milestone["title"]) is not None


def _gh(*args, falha_ok=False):
    p = subprocess.run(["gh", *args], capture_output=True, text=True, encoding="utf-8", errors="replace")
    if p.returncode and not falha_ok:
        sys.exit(f"🏷️ gh {' '.join(args[:3])} falhou: {p.stderr.strip()}")
    return p.stdout if p.returncode == 0 else None


def criar_release(titulo, repo):
    tag = versao(titulo)
    if not tag:
        print(f"🏷️ '{titulo}' não começa com vX.Y: nada a fazer.")
    elif _gh("release", "view", tag, "--repo", repo, falha_ok=True) is not None:
        print(f"🏷️ {tag} já existe.")
    else:
        _gh("release", "create", tag, "--repo", repo, "--target", "main", "--title", titulo, "--generate-notes")
        print(f"🏷️ release {tag} criada.")


def main():
    for fluxo in (sys.stdout, sys.stderr):
        fluxo.reconfigure(encoding="utf-8")
    evento = json.loads(pathlib.Path(os.environ["GITHUB_EVENT_PATH"]).read_text(encoding="utf-8"))
    repo = os.environ["GITHUB_REPOSITORY"]
    if os.environ.get("GITHUB_EVENT_NAME") == "milestone":
        criar_release(evento["milestone"]["title"], repo)
        return
    ms = (evento.get("issue") or {}).get("milestone")
    if not ms:
        print("🏷️ issue sem milestone: nada a fazer.")
        return
    ms = json.loads(_gh("api", f"repos/{repo}/milestones/{ms['number']}"))  # números atualizados
    if not deve_fechar(ms):
        print(f"🏷️ {ms['title']}: {ms['open_issues']} issue(s) ainda aberta(s).")
        return
    _gh("api", "-X", "PATCH", f"repos/{repo}/milestones/{ms['number']}", "-f", "state=closed")
    print(f"🏷️ milestone {ms['title']} fechada.")
    criar_release(ms["title"], repo)


if __name__ == "__main__":
    main()
