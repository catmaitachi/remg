"""Regras do verificador (docs/spec/10-verificador.md). Funções puras: recebem dados, devolvem achados."""
import ast
import posixpath
import re
from collections import namedtuple

Achado = namedtuple("Achado", "regra nivel msg dica")
ERRO, AVISO = "❌", "⚠️"

# ── Listas que o grupo pode editar ─────────────────────────────────────────────
TIPOS = "feat|fix|test|docs|refactor|chore"
REGISTRO_IA = "docs/ia/registro.md"
CONTRATO = "docs/spec/06-api.md"
MOCKS = "front/src/mocks/"
UML = "docs/spec/03-modelagem.md"
LIMITE_BYTES = 5 * 1024 * 1024

# Quem cada camada do núcleo pode importar (as setas só apontam para dentro).
CAMADAS = {
    "grafo": {"grafo"},
    "dominio": {"grafo", "dominio"},
    "portas": {"grafo", "dominio", "portas"},
    "casos_de_uso": {"grafo", "dominio", "portas", "casos_de_uso"},
}

# Núcleo em Python (D26): só estes módulos da biblioteca padrão, além do próprio core.
MODULOS_PERMITIDOS = {"collections", "dataclasses", "abc", "typing", "math", "enum", "itertools", "functools",
                      "__future__"}
HEAP_PRONTA_PY = {"heapq", "queue"}
BOM = "﻿"  # editores do Windows salvam UTF-8 com BOM; o Python roda, mas o ast.parse de str recusa
# Os únicos adaptadores que podem importar o núcleo além da porta: eles criam as peças (D22).
MONTAGEM_PY ={"adapters/http/servidor.py", "adapters/cli/main.py"}

LIBS_GRAFO = r"networkx|igraph|graph_tool|osmnx|rustworkx|networkit|snap|scipy\.sparse\.csgraph"
PASTA_LIBERADA_GRAFO = "tools/benchmark/"

FERRAMENTAS_IA = r"claude|anthropic|copilot|chatgpt|openai|codex|gemini|cursor|codeium|tabnine"
LABEL_FEATURE = "feature-principal"
# ───────────────────────────────────────────────────────────────────────────────


def checar_mensagem(msg):  # V1
    linhas = [l for l in msg.splitlines() if l.strip() and not l.startswith("#")]
    titulo = linhas[0] if linhas else ""
    if titulo.startswith(("Merge ", "Revert ")):
        return []
    if re.match(rf"^({TIPOS})(\([^)]+\))?: \S", titulo):
        return []
    return [Achado("V1", ERRO, f'mensagem fora do formato: "{titulo}"',
                   f"use `tipo: descrição`, com tipo em {TIPOS.replace('|', ', ')}")]


def checar_branch(nome):  # V2 e V13
    if nome == "main":
        return [Achado("V13", ERRO, "você está na `main`",
                       "crie uma branch: git switch -c feat/<nº da issue>-<descrição>")]
    if re.match(rf"^({TIPOS})/\d+-[a-z0-9-]+$", nome):
        return []
    return [Achado("V2", ERRO, f'branch fora do formato: "{nome}"',
                   "use `tipo/N-descricao`, ex.: feat/9-dinic (renomeie com git branch -m)")]


def checar_corpo_pr(corpo):  # V3
    if corpo and re.search(r"(?i)\b(closes|fixes|resolves)\s+#\d+", corpo):
        return []
    return [Achado("V3", ERRO, "o PR não diz qual issue fecha",
                   "escreva `Closes #N` na descrição do PR")]


def _camada(caminho):
    partes = caminho.split("/")
    return partes[1] if len(partes) > 2 and partes[0] == "core" else None


def checar_python(caminho, texto):  # V6
    if caminho.startswith(PASTA_LIBERADA_GRAFO):
        return []
    return [Achado("V6", ERRO, f"{caminho}: importa `{m}`, biblioteca de grafo",
                   f"só pode em {PASTA_LIBERADA_GRAFO} (comparação de desempenho)")
            for _, m in re.findall(rf"(?m)^\s*(import|from)\s+({LIBS_GRAFO})\b(?![\w.])", texto)]


def _imports_py(caminho, arvore):
    """Cada import vira a lista de partes do que entra: `from core import dominio` → ["core", "dominio"]."""
    pasta = posixpath.dirname(caminho).split("/")
    for no in ast.walk(arvore):
        if isinstance(no, ast.Import):
            for a in no.names:
                yield a.name.split(".")
        elif isinstance(no, ast.ImportFrom):
            base = (pasta[:len(pasta) - (no.level - 1)] if no.level else []) + (no.module.split(".") if no.module else [])
            for a in no.names:
                yield base + [a.name]


def checar_python_nucleo(caminho, texto):  # V4, V5 e V16 em .py
    no_core, no_adapter = caminho.startswith("core/"), caminho.startswith("adapters/")
    if not (no_core or no_adapter) or caminho in MONTAGEM_PY:
        return []
    try:
        arvore = ast.parse(texto.removeprefix(BOM))
    except SyntaxError as e:
        return [Achado("V4", ERRO, f"{caminho}: não é Python válido (linha {e.lineno})",
                       "corrija a sintaxe antes de commitar")]
    camada, achados = _camada(caminho), []
    for partes in _imports_py(caminho, arvore):
        nome = ".".join(partes)
        if no_adapter:
            if partes[0] == "core" and partes[1:2] != ["portas"]:
                achados.append(Achado("V16", ERRO, f"{caminho}: o adaptador importa `{nome}` sem passar pela porta",
                                      "use só core.portas (D22); quem cria as peças é o ponto de montagem: "
                                      + ", ".join(sorted(MONTAGEM_PY))))
        elif partes[0] in HEAP_PRONTA_PY:
            achados.append(Achado("V4", ERRO, f"{caminho}: importa `{nome}` (fila de prioridade pronta)",
                                  "use a HeapBinaria do projeto (T08)"))
        elif partes[0] not in MODULOS_PERMITIDOS | {"core", "adapters"}:
            achados.append(Achado("V4", ERRO, f"{caminho}: importa `{nome}`, que não é permitido no núcleo",
                                  "o núcleo só usa MODULOS_PERMITIDOS; se precisa mesmo, discuta e edite a lista"))
        elif partes[0] == "adapters" or (camada and partes[0] == "core" and len(partes) > 1
                                         and partes[1] not in CAMADAS.get(camada, set())):
            achados.append(Achado("V5", ERRO, f'{caminho}: a camada "{camada or "core"}" não pode importar `{nome}`',
                                  "as dependências só apontam para dentro: grafo ← dominio ← portas ← casos_de_uso"))
    return achados


def tem_coautor_ia(msg):
    return bool(re.search(rf"(?im)^co-authored-by:.*\b({FERRAMENTAS_IA})", msg))


def checar_coautoria(msg):  # V17
    if not tem_coautor_ia(msg):
        return []
    return [Achado("V17", ERRO, "o commit tem coautoria de IA (Co-Authored-By)",
                   "tire a linha Co-Authored-By; o uso de IA vai só em docs/ia/registro.md (D27)")]


MARCA_README = "<!-- ✍️ ESCRITO À MÃO: daqui para baixo a IA não edita -->"


def checar_readme_feature(labels, linhas_readme):  # V8
    if LABEL_FEATURE not in labels:
        return []
    if any("Escrito por:" in l for l in linhas_readme):
        return []
    return [Achado("V8", ERRO, "feature principal sem a seção do README assinada",
                   "escreva à mão a seção da feature no README.md, com `✍️ Escrito por: <nome>`")]


def checar_coerencia(alterados, novos):  # V9, V10, V11
    achados = []
    mudou_contrato = CONTRATO in alterados
    mudou_mock = any(a.startswith(MOCKS) for a in alterados)
    if mudou_contrato != mudou_mock:
        achados.append(Achado("V9", AVISO, "contrato da API e mocks não mudaram juntos",
                              f"atualize {CONTRATO} e {MOCKS} no mesmo PR"))
    if any(a.startswith("core/") for a in alterados) and not any(a.startswith("tests/") for a in alterados):
        achados.append(Achado("V10", AVISO, "o núcleo mudou e nenhum teste mudou",
                              "faltou teste, ou foi de propósito? diga no PR"))
    if any(n.startswith("core/") for n in novos) and UML not in alterados:
        achados.append(Achado("V11", AVISO, "arquivo novo no núcleo e o UML não mudou",
                              f"confira se o diagrama em {UML} ainda bate"))
    return achados


def checar_peso(arquivos):  # V12
    achados = []
    for caminho, tamanho in arquivos:
        if caminho.startswith("data/raw/"):
            achados.append(Achado("V12", ERRO, f"{caminho}: dado bruto não vai para o git",
                                  "data/raw/ fica fora (.gitignore); suba só o processado em data/<área>/"))
        elif tamanho > LIMITE_BYTES:
            achados.append(Achado("V12", AVISO, f"{caminho}: {tamanho / 1024 / 1024:.1f} MB",
                                  "arquivo grande; precisa mesmo estar no git?"))
    return achados
