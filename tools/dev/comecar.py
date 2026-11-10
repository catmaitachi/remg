"""🙋 Começa (ou retoma) o trabalho numa task do kanban.

  python tools/dev/comecar.py --buscar "o que a pessoa pediu"   lista as tasks que batem com o pedido
  python tools/dev/comecar.py N [--tipo docs]                   sincroniza com a issue N

Com N: confere se a issue está aberta, se é sua (ou de ninguém) e se as dependências já fecharam;
então entra na branch da issue (se já existe, local ou no GitHub) ou cria `tipo/N-descricao` a partir
da main atualizada, e atribui a issue a você. Regras: docs/spec/13-automacao.md
"""
import argparse
import json
import re
import subprocess
import sys
import unicodedata

TIPOS = ("feat", "fix", "test", "docs", "refactor", "chore")
LIMITE_SLUG = 50
VAZIAS = set("""quero queria fazer faca faz preciso precisa vamos pode poderia ajuda ajudar
para pra com uma umas uns das dos que por mais como isso esse essa este esta ser ter vai nao sim
sobre tudo todo toda agora aqui ali the and""".split())


def _sem_acento(texto):
    return unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode().lower()


def nome_da_branch(numero, titulo, tipo="feat"):
    slug = re.sub(r"[^a-z0-9]+", "-", _sem_acento(re.sub(r"^T\d+\s*·\s*", "", titulo))).strip("-")
    if len(slug) > LIMITE_SLUG:
        slug = slug[:LIMITE_SLUG].rsplit("-", 1)[0]
    return f"{tipo}/{numero}-{slug}"


def dependencias(corpo):
    m = re.search(r"Depende de:\*{0,2}\s*([^\n]*)", corpo or "")
    return re.findall(r"T\d+", m.group(1)) if m else []


def pendentes(corpo, todas):
    """Dependências da issue que ainda estão abertas (ou que nem existem)."""
    fechadas = {re.match(r"T\d+", i["title"]).group(0) for i in todas
                if re.match(r"T\d+", i["title"]) and i["state"].upper() == "CLOSED"}
    return [d for d in dependencias(corpo) if d not in fechadas]


def palavras(texto):
    return {p for p in re.findall(r"[a-z0-9]+", _sem_acento(texto or "")) if len(p) >= 3 and p not in VAZIAS}


def ranquear(pedido, issues):
    """[(pontos, issue)] das issues que têm palavra em comum com o pedido; título vale 3×."""
    # 5 primeiras letras: "animar", "animadas" e "animação" contam como a mesma palavra
    radicais = lambda texto: {p[:5] for p in palavras(texto)}
    pedido = radicais(pedido)
    ranking = [(3 * len(pedido & radicais(i["title"])) + len(pedido & radicais(i.get("body"))), i) for i in issues]
    return sorted([r for r in ranking if r[0] > 0], key=lambda r: -r[0])


def branch_da_issue(numero, refs):
    for ref in refs:
        m = re.match(rf"^(?:origin/)?((?:{'|'.join(TIPOS)})/{numero}-[^/\s]+)$", ref)
        if m:
            return m.group(1)
    return None


def pode_trocar(porcelain, atual, destino):
    """Com alterações não commitadas, só pode ficar na mesma branch (senão mistura duas tasks)."""
    return not porcelain.strip() or atual == destino


def _rodar(*cmd):
    p = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if p.returncode:
        sys.exit(f"🙋 {' '.join(cmd[:3])} falhou: {p.stderr.strip()}")
    return p.stdout


def _todas_as_issues():
    return json.loads(_rodar("gh", "issue", "list", "--state", "all", "--limit", "300",
                             "--json", "number,title,body,state,assignees"))


def buscar(pedido):
    todas = _todas_as_issues()
    abertas = [i for i in todas if i["state"].upper() == "OPEN"]
    ranking = ranquear(pedido, abertas)[:5]
    if not ranking:
        print("🙋 Nenhuma task aberta bate com o pedido. Combine com o grupo se ela precisa virar uma issue nova.")
        return
    print("🙋 Tasks que batem com o pedido (confirme com a pessoa antes de começar):")
    for pontos, i in ranking:
        dono = ", ".join(a["login"] for a in i["assignees"]) or "ninguém"
        pend = pendentes(i.get("body"), todas)
        deps = "dependências ok" if not pend else f"⛔ espera {', '.join(pend)}"
        print(f"  #{i['number']:<3} {i['title']}  · {pontos} pts · dono: {dono} · {deps}")


def sincronizar(numero, tipo):
    issue = json.loads(_rodar("gh", "issue", "view", str(numero), "--json", "number,title,body,state,assignees"))
    if issue["state"].upper() != "OPEN":
        sys.exit(f"🙋 A issue #{numero} já está fechada.")
    eu = _rodar("gh", "api", "user", "--jq", ".login").strip()
    donos = [a["login"] for a in issue["assignees"]]
    if donos and eu not in donos:
        sys.exit(f"🙋 A issue #{numero} é de {', '.join(donos)}. Combine com a pessoa antes de mexer.")
    pend = pendentes(issue.get("body"), _todas_as_issues())
    if pend:
        sys.exit(f"🙋 A issue #{numero} depende de {', '.join(pend)}, que ainda não fecharam.")
    _rodar("git", "fetch", "-q", "--prune", "origin")
    existente = branch_da_issue(numero, _rodar("git", "branch", "-a", "--format=%(refname:short)").split())
    if not pode_trocar(_rodar("git", "status", "--porcelain"), _rodar("git", "branch", "--show-current").strip(), existente):
        sys.exit("🙋 Há alterações não commitadas. Commite (ou `git stash`) antes de trocar de task.")
    if existente:
        _rodar("git", "switch", existente)
        print(f"🙋 Retomando a branch {existente}.")
    else:
        _rodar("git", "switch", "main")
        _rodar("git", "pull", "-q", "--ff-only")
        nova = nome_da_branch(numero, issue["title"], tipo)
        _rodar("git", "switch", "-c", nova)
        print(f"🙋 Branch {nova} criada a partir da main atualizada.")
    if not donos:
        _rodar("gh", "issue", "edit", str(numero), "--add-assignee", "@me")
        print(f"🙋 Issue #{numero} atribuída a você.")
    print(f"🗂️ Agora mova o card #{numero} para 🔨 Fazendo no quadro.")


def main(argv=None):
    for fluxo in (sys.stdout, sys.stderr):
        fluxo.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("numero", nargs="?", type=int, help="número da issue")
    p.add_argument("--buscar", metavar="PEDIDO", help="texto do pedido para achar a task")
    p.add_argument("--tipo", default="feat", choices=TIPOS, help="prefixo da branch nova (padrão: feat)")
    a = p.parse_args(argv)
    if a.buscar:
        buscar(a.buscar)
    elif a.numero:
        sincronizar(a.numero, a.tipo)
    else:
        p.print_help()


if __name__ == "__main__":
    main()
