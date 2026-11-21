"""Cria as milestones (releases) e as issues do GitHub a partir de docs/tasks/T*.md.

Sem --criar, só mostra o que faria. Precisa do `gh` logado no repositório.
Uso: python tools/kanban/criar_issues.py [--criar] [--projeto "remg"]
"""
import argparse, json, pathlib, subprocess, sys

TASKS = pathlib.Path(__file__).resolve().parents[2] / "docs" / "tasks"

# Previsão de releases: docs/spec/12-releases.md (mudou lá? mude aqui também)
RELEASES = {
    "v0.2": ("🧮 Núcleo", "2026-11-14"),
    "v0.3": ("⚡ Análises", "2026-11-17"),
    "v0.4": ("🗺️ Tela completa", "2026-11-17"),
    "v0.9": ("🧊 Congelamento", "2026-11-18"),
    "v1.0": ("📤 Entrega", "2026-11-22"),
    "v1.1": ("🔵 Extras", None),
}


def titulo_milestone(versao):
    return f"{versao} · {RELEASES[versao][0]}"


def ler(caminho, repo="<repo>"):
    texto = caminho.read_text(encoding="utf-8")
    _, cabecalho, corpo = texto.split("---", 2)
    campos = dict(l.split(":", 1) for l in cabecalho.strip().splitlines())
    campos = {k.strip(): v.strip() for k, v in campos.items()}
    labels = [l.strip() for l in campos["labels"].split(",")]
    corpo = f"**🏷️ Release:** {titulo_milestone(campos['release'])} · **⛓️ Depende de:** {campos['depende']}\n\n{corpo.strip()}"
    # links relativos não funcionam numa issue: aponta para o arquivo no repo
    corpo = corpo.replace("](../", f"]({repo}/blob/main/docs/")
    return campos["titulo"], labels, corpo, campos["release"]


def gh(*args):
    return subprocess.run(["gh", *args], check=True, capture_output=True, text=True, encoding="utf-8").stdout


def criar_milestones(versoes):
    existentes = {m["title"] for m in json.loads(gh("api", "repos/{owner}/{repo}/milestones?state=all&per_page=100"))}
    for v in versoes:
        titulo, (_, prazo) = titulo_milestone(v), RELEASES[v]
        if titulo in existentes:
            continue
        campos = ["-f", f"title={titulo}"] + (["-f", f"due_on={prazo}T23:59:00Z"] if prazo else [])
        gh("api", "repos/{owner}/{repo}/milestones", *campos)
        print(f"  🏷️ {titulo}")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--criar", action="store_true", help="cria de verdade (sem isso é só teste)")
    p.add_argument("--projeto", help="nome do GitHub Project para adicionar as issues")
    a = p.parse_args()

    repo = gh("repo", "view", "--json", "url", "-q", ".url").strip() if a.criar else "<repo>"
    tasks = [ler(c, repo) for c in sorted(TASKS.glob("T*.md"))]
    labels = sorted({l for _, ls, _, _ in tasks for l in ls})
    versoes = sorted({v for *_, v in tasks})
    print(f"{len(tasks)} tasks · labels: {', '.join(labels)}")
    print(f"milestones: {', '.join(titulo_milestone(v) for v in versoes)}")
    if not a.criar:
        for titulo, ls, _, v in tasks:
            print(f"  [teste] {v}  {titulo}  ({', '.join(ls)})")
        print("Nada foi criado. Rode com --criar para valer.")
        return

    for l in labels:  # --force: cria ou atualiza sem erro se já existir
        gh("label", "create", l, "--force")
    criar_milestones(versoes)
    for titulo, ls, corpo, v in tasks:
        cmd = ["issue", "create", "--title", titulo, "--body", corpo, "--milestone", titulo_milestone(v)]
        for l in ls:
            cmd += ["--label", l]
        if a.projeto:
            cmd += ["--project", a.projeto]
        gh(*cmd)
        print(f"  ✅ {titulo}")


if __name__ == "__main__":
    sys.exit(main())
