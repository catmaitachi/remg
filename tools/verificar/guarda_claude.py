"""🛡️ Guarda do Claude Code: hook PreToolUse que impede o Claude de quebrar as regras do projeto.

Ligado em .claude/settings.json. Recebe o pedido da ferramenta (JSON na entrada padrão) e responde
"deny" (barra) ou "ask" (pede aprovação da pessoa). Regras: docs/spec/10-verificador.md (G1, G3, G4, G5).
"""
import json
import os
import pathlib
import re
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import regras as r  # noqa: E402

MARCA_README = r.MARCA_README
FISCALIZACAO = (".githooks/", "tools/verificar/", ".claude/settings.json", ".github/workflows/")
FERRAMENTAS_DE_ARQUIVO = {"Edit", "Write", "MultiEdit", "NotebookEdit"}


def _bash(cmd):  # G1
    # só conta dentro de um comando git; citar a flag num texto ou grep não é pular o verificador
    for trecho in re.split(r"[|;&\n]", cmd):
        if re.search(r"\bgit\b", trecho) and ("--no-verify" in trecho or re.search(r"\bcommit\b.*\s-[a-zA-Z]*n", trecho)):
            return "deny", "pular o verificador (--no-verify / -n) é proibido. Corrija o que o hook apontou."
    m = re.search(r"core\.hooksPath(\s*=\s*|\s+)(\S*)", cmd)
    if re.search(r"--unset\S*\s+core\.hooksPath", cmd) or (m and m.group(2) and m.group(2).strip("\"'") != ".githooks"):
        return "deny", "os hooks do verificador ficam em .githooks; não dá para trocar nem desligar."
    if m and "=" in m.group(1) and not m.group(2):
        return "deny", "os hooks do verificador ficam em .githooks; não dá para trocar nem desligar."
    return None


def _trechos_editados(entrada):
    if "edits" in entrada:
        return [e.get("old_string", "") for e in entrada["edits"]]
    if "old_string" in entrada:
        return [entrada["old_string"]]
    return []


def _readme(caminho, ferramenta, entrada):  # G3
    if not caminho.exists():
        return None
    atual = caminho.read_text(encoding="utf-8", errors="replace")
    corte = atual.find(MARCA_README)
    if corte < 0:
        return None
    motivo = "a parte do README abaixo da marca ✍️ é escrita à mão pelo integrante (regra D9). Aponte o problema em lista, sem editar."
    if ferramenta == "Write":
        novo = entrada.get("content", "")
        novo_corte = novo.find(MARCA_README)
        if novo_corte < 0 or novo[novo_corte:] != atual[corte:]:
            return "deny", motivo
        return None
    for trecho in _trechos_editados(entrada):
        pos = atual.find(trecho) if trecho else -1
        if pos < 0 or pos + len(trecho) > corte:  # não achou, ou pega a marca ou o que vem depois
            return "deny", motivo
    return None


def _branch(raiz):
    p = subprocess.run(["git", "-C", str(raiz), "branch", "--show-current"], capture_output=True, text=True)
    return p.stdout.strip() if p.returncode == 0 else None


def decidir(entrada, raiz):
    ferramenta, dados = entrada.get("tool_name"), entrada.get("tool_input") or {}
    if ferramenta == "Bash":
        return _bash(dados.get("command", ""))
    if ferramenta not in FERRAMENTAS_DE_ARQUIVO:
        return None
    alvo = pathlib.Path(dados.get("file_path") or dados.get("notebook_path") or "")
    try:
        rel = alvo.resolve().relative_to(pathlib.Path(raiz).resolve()).as_posix()
    except ValueError:  # fora do projeto
        return None
    if _branch(raiz) == "main":  # G5
        return "deny", ("você está na main: todo trabalho começa numa task. Rode "
                        "`python tools/dev/comecar.py --buscar \"<pedido>\"`, confirme a task com a pessoa "
                        "e depois `python tools/dev/comecar.py N`.")
    if rel == "README.md":
        return _readme(alvo, ferramenta, dados)
    if rel.startswith(FISCALIZACAO):
        return "ask", "este arquivo faz parte da fiscalização do projeto; confirme que a mudança é intencional."
    return None


def main():
    for fluxo in (sys.stdin, sys.stdout):  # Windows comum usa cp1252; o Claude Code fala UTF-8
        fluxo.reconfigure(encoding="utf-8")
    entrada = json.load(sys.stdin)
    decisao = decidir(entrada, os.environ.get("CLAUDE_PROJECT_DIR") or entrada.get("cwd") or os.getcwd())
    if decisao:
        nivel, motivo = decisao
        print(json.dumps({"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": nivel,
            "permissionDecisionReason": f"🛡️ {motivo}"}}, ensure_ascii=False))


if __name__ == "__main__":
    main()
