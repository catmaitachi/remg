"""Regras do verificador (docs/spec/11-verificador.md). Funções puras: recebem dados, devolvem achados."""
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

# Cabeçalhos da STL liberados no núcleo. <queue> fica de fora por causa da priority_queue.
STL_PERMITIDA = {
    "algorithm", "array", "cassert", "chrono", "climits", "cmath", "cstddef", "cstdint",
    "cstring", "deque", "functional", "initializer_list", "iterator", "limits", "map",
    "memory", "numeric", "optional", "set", "stdexcept", "string", "string_view", "tuple",
    "type_traits", "unordered_map", "unordered_set", "utility", "vector",
}
HEAP_PRONTA = r"\b(priority_queue|make_heap|push_heap|pop_heap|sort_heap)\b"

# Quem cada camada do núcleo pode incluir (as setas só apontam para dentro).
CAMADAS = {
    "grafo": {"grafo"},
    "dominio": {"grafo", "dominio"},
    "portas": {"grafo", "dominio", "portas"},
    "casos_de_uso": {"grafo", "dominio", "portas", "casos_de_uso"},
}

# Os únicos adaptadores que podem incluir o núcleo além da porta: eles criam as peças (D22).
MONTAGEM = {"adapters/cli/main.cpp", "adapters/modulo_py/modulo.cpp"}

# Núcleo em Python (D26): só estes módulos da biblioteca padrão, além do próprio core.
MODULOS_PERMITIDOS = {"collections", "dataclasses", "abc", "typing", "math", "enum", "itertools", "functools",
                      "__future__"}
HEAP_PRONTA_PY = {"heapq", "queue"}
BOM = "﻿"  # editores do Windows salvam UTF-8 com BOM; o Python roda, mas o ast.parse de str recusa
MONTAGEM_PY = {"adapters/http/servidor.py", "adapters/cli/main.py"}

LIBS_GRAFO = r"networkx|igraph|graph_tool|osmnx|rustworkx|networkit|snap|scipy\.sparse\.csgraph"
PASTA_LIBERADA_GRAFO = "tools/benchmark/"

FERRAMENTAS_IA = r"claude|anthropic|copilot|chatgpt|openai|codex|gemini|cursor|codeium|tabnine"
LABEL_IA = "ia-assistida"
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


def _sem_comentarios(texto):
    texto = re.sub(r"/\*.*?\*/", " ", texto, flags=re.S)
    return re.sub(r"//[^\n]*", "", texto)


def _camada(caminho):
    partes = caminho.split("/")
    return partes[1] if len(partes) > 2 and partes[0] == "core" else None


def _resolver(caminho, alvo, existe):
    pasta = posixpath.dirname(caminho)
    candidatos = [posixpath.normpath(posixpath.join(pasta, alvo)), posixpath.normpath(alvo),
                  posixpath.normpath("core/" + alvo)]
    return next((c for c in candidatos if existe(c)), None)


def _checar_adaptador(caminho, texto, existe):  # V16
    if caminho in MONTAGEM:
        return []
    achados = []
    for alvo in re.findall(r'#\s*include\s*"([^"]+)"', _sem_comentarios(texto)):
        resolvido = _resolver(caminho, alvo, existe)
        if resolvido and resolvido.startswith("core/") and not resolvido.startswith("core/portas/"):
            achados.append(Achado("V16", ERRO, f'{caminho}: o adaptador inclui "{resolvido}" sem passar pela porta',
                                  "use só core/portas/ (D22); quem cria as peças é o ponto de montagem: "
                                  + ", ".join(sorted(MONTAGEM))))
    return achados


def checar_cpp(caminho, texto, existe):  # V4, V5 e V16
    camada = _camada(caminho)
    if camada is None:
        return _checar_adaptador(caminho, texto, existe) if caminho.startswith("adapters/") else []
    achados = []
    codigo = _sem_comentarios(texto)
    for tipo, alvo in re.findall(r'#\s*include\s*([<"])([^>"]+)[>"]', codigo):
        if tipo == "<":
            if alvo not in STL_PERMITIDA:
                achados.append(Achado("V4", ERRO, f"{caminho}: #include <{alvo}> não é permitido no núcleo",
                                      "o núcleo só usa a STL básica; se precisa mesmo, discuta e edite STL_PERMITIDA"))
            continue
        resolvido = _resolver(caminho, alvo, existe)
        if resolvido is None:
            achados.append(Achado("V4", ERRO, f'{caminho}: #include "{alvo}" não é um arquivo do projeto',
                                  "cabeçalho de terceiros não entra no núcleo (só nos adaptadores)"))
        elif resolvido.startswith("adapters/") or _camada(resolvido) not in CAMADAS.get(camada, set()):
            achados.append(Achado("V5", ERRO, f'{caminho}: a camada "{camada}" não pode incluir "{resolvido}"',
                                  "as dependências só apontam para dentro: grafo ← dominio ← portas ← casos_de_uso"))
    for nome in sorted(set(re.findall(HEAP_PRONTA, codigo))):
        achados.append(Achado("V4", ERRO, f"{caminho}: usa `{nome}` (fila de prioridade pronta)",
                              "use a HeapBinaria do projeto (T08)"))
    return achados


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


def checar_ia(commits, alterados, labels):  # V7 e V8 (commit de IA no README)
    """commits: [(sha, mensagem, arquivos)] · labels: conjunto do PR, ou None se não dá para saber."""
    achados = []
    com_ia = [c for c in commits if tem_coautor_ia(c[1])]
    tem_label = bool(labels) and LABEL_IA in labels
    if (com_ia or tem_label) and REGISTRO_IA not in alterados:
        motivo = f"{len(com_ia)} commit(s) com coautoria de IA" if com_ia else f'o PR tem o label "{LABEL_IA}"'
        achados.append(Achado("V7", ERRO, f"{motivo} e nenhuma linha nova no registro",
                              f"acrescente uma linha em {REGISTRO_IA}"))
    if com_ia and labels is None:
        achados.append(Achado("V7", AVISO, "houve coautoria de IA", f'no PR, coloque o label "{LABEL_IA}"'))
    elif com_ia and not tem_label:
        achados.append(Achado("V7", ERRO, "houve coautoria de IA e o PR está sem o label", f'adicione o label "{LABEL_IA}"'))
    return achados


MARCA_README = "<!-- ✍️ ESCRITO À MÃO: daqui para baixo a IA não edita -->"


def linhas_a_mao_readme(texto):
    """Números das linhas abaixo da marca ✍️ do README (a parte escrita à mão)."""
    linhas = texto.splitlines()
    marca = next((i for i, l in enumerate(linhas, 1) if MARCA_README in l), None)
    return set(range(marca + 1, len(linhas) + 1)) if marca else set()


def checar_readme_ia(commits):  # V8
    """commits: [(sha, mensagem, mexeu_na_parte_a_mao)]"""
    return [Achado("V8", ERRO, f"commit {sha[:7]} tem coautoria de IA e mexe na parte do README escrita à mão",
                   "abaixo da marca ✍️ o README é escrito à mão: tire essa parte do commit e escreva você mesmo")
            for sha, msg, mexeu in commits if mexeu and tem_coautor_ia(msg)]


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


# ── Ficha ✍️ de entendimento (V14, V15) ───────────────────────────────────────
# A IA pode escrever o código de core/grafo, mas cada função tem uma ficha preenchida À MÃO
# por quem commita, provando que entende o que o algoritmo faz.
PASTA_FICHA = "core/grafo/"
EXT_CPP_FICHA = (".cpp", ".cc", ".cxx", ".h", ".hpp", ".hxx")
MARCA_FICHA = "✍️ ENTENDIMENTO"
VAZIO = "___"
CAMPOS_FICHA = ("O que faz", "Como funciona", "Complexidade", "Exemplo", "Limitação")
ACEITAM_TRAVESSAO = {"Exemplo", "Limitação"}  # funções triviais: "—" = não se aplica
MODELO_FICHA = (f"/* {MARCA_FICHA} · por: {VAZIO}\n"
                + "".join(f" * {c}: {VAZIO}\n" for c in CAMPOS_FICHA) + " */")
MODELO_FICHA_PY = f"# {MARCA_FICHA} · por: {VAZIO}\n" + "".join(f"# {c}: {VAZIO}\n" for c in CAMPOS_FICHA)
Ficha = namedtuple("Ficha", "linhas autor campos preenchida texto")
_CONTROLE = re.compile(r"^(if|for|while|switch|catch|do|else|try|return)\b")


def _mascarar(texto):
    """Troca comentários, strings e diretivas # por espaços, mantendo posições e quebras de linha."""
    branco = lambda m: re.sub(r"[^\n]", " ", m.group(0))
    padrao = r'//[^\n]*|/\*.*?\*/|"(?:\\.|[^"\\\n])*"|\'(?:\\.|[^\'\\\n])*\'|(?m:^[ \t]*#[^\n]*)'
    return re.sub(padrao, branco, texto, flags=re.S)


def definicoes_de_funcao(texto):
    """[(nome, posição onde começa o cabeçalho)] das funções DEFINIDAS (com corpo) fora de outras funções."""
    m, pilha, inicio, achadas = _mascarar(texto), [], 0, []
    for i, c in enumerate(m):
        if c in ";}":
            if c == "}" and pilha:
                pilha.pop()
            inicio = i + 1
        elif c == ":" and m[i - 1:i + 1] != "::" and m[i:i + 2] != "::" and re.search(r"\b(public|private|protected)\s*$", m[inicio:i]):
            inicio = i + 1  # "public:" não faz parte do cabeçalho da função seguinte
        elif c == "{":
            cab = m[inicio:i].strip()
            dentro_de_funcao = any(t in ("func", "bloco") for t in pilha)
            if re.search(r"\bnamespace\b", cab):
                tipo = "ns"
            elif re.search(r"\b(class|struct|union|enum)\b", cab) and "(" not in cab:
                tipo = "classe"
            elif not dentro_de_funcao and "(" in cab and not _CONTROLE.match(cab) and not re.search(r"=\s*\[", cab):
                tipo = "func"
                nome = re.search(r"([~\w:]+)\s*\(", cab)
                achadas.append((nome.group(1) if nome else "?", inicio + len(m[inicio:i]) - len(m[inicio:i].lstrip())))
            else:
                tipo = "bloco"
            pilha.append(tipo)
            inicio = i + 1
    return achadas


def _ler_ficha(bloco, linha_inicial):
    linhas = bloco.splitlines()
    autor = re.search(r"por:\s*(.*?)\s*(\*/)?\s*$", linhas[0])
    autor = autor.group(1).strip() if autor else ""
    campos, atual = {}, None
    for l in linhas[1:]:
        l = re.sub(r"^\s*(?:\*+/?|#)\s?", "", l).removesuffix("*/").strip()
        rotulo = re.match(rf"^({'|'.join(CAMPOS_FICHA)})\s*:\s*(.*)$", l)
        if rotulo:
            atual = rotulo.group(1)
            campos[atual] = rotulo.group(2).strip()
        elif atual and l:
            campos[atual] = (campos[atual] + " " + l).strip()
    preenchida = autor not in ("", VAZIO) or any(v not in ("", VAZIO) for v in campos.values())
    return Ficha(range(linha_inicial, linha_inicial + len(linhas)), autor, campos, preenchida, bloco)


def _e_comentario_py(linha):
    return linha.lstrip().startswith("#")


def fichas(texto):
    texto, achadas = texto.removeprefix(BOM), []
    for m in re.finditer(r"/\*.*?\*/", texto, flags=re.S):
        if MARCA_FICHA in m.group(0).splitlines()[0]:
            achadas.append(_ler_ficha(m.group(0), texto.count("\n", 0, m.start()) + 1))
    linhas = texto.splitlines()  # ficha em Python: bloco de linhas "#" que começa na marca
    i = 0
    while i < len(linhas):
        if _e_comentario_py(linhas[i]) and MARCA_FICHA in linhas[i]:
            fim = i + 1
            while fim < len(linhas) and _e_comentario_py(linhas[fim]) and MARCA_FICHA not in linhas[fim]:
                fim += 1
            achadas.append(_ler_ficha("\n".join(linhas[i:fim]), i + 1))
            i = fim
        else:
            i += 1
    return achadas


def definicoes_py(texto):
    """[(nome, linha do 1º decorador ou do def)] dos `def` do módulo e de classes (def dentro de def não conta)."""
    achadas = []

    def visitar(corpo):
        for no in corpo:
            if isinstance(no, (ast.FunctionDef, ast.AsyncFunctionDef)):
                achadas.append((no.name, min([no.lineno] + [d.lineno for d in no.decorator_list])))
            elif isinstance(no, ast.ClassDef):
                visitar(no.body)

    visitar(ast.parse(texto).body)
    return achadas


def _ficha_acima_py(linhas, linha):
    i = linha - 2  # índice da linha logo acima
    while i >= 0 and not linhas[i].strip():
        i -= 1
    fim = i + 1
    while i >= 0 and _e_comentario_py(linhas[i]):
        if MARCA_FICHA in linhas[i]:
            return _ler_ficha("\n".join(linhas[i:fim]), i + 1)
        i -= 1
    return None


def linhas_de_ficha(texto):
    return {n for f in fichas(texto) for n in f.linhas}


def _problemas_da_ficha(f):
    problemas = [] if f.autor not in ("", VAZIO) else ["sem autor em `por:`"]
    for campo in CAMPOS_FICHA:
        valor = f.campos.get(campo, "")
        if valor in ("", VAZIO) or (valor == "—" and campo not in ACEITAM_TRAVESSAO):
            problemas.append(f"campo `{campo}` vazio")
    return problemas


def _checar_fichas_py(caminho, texto):
    texto = texto.removeprefix(BOM)
    try:
        definicoes = definicoes_py(texto)
    except SyntaxError:
        return []  # quem acusa o arquivo inválido é a V4 (checar_python_nucleo)
    linhas, achados = texto.splitlines(), []
    for nome, linha in definicoes:
        f = _ficha_acima_py(linhas, linha)
        problemas = ["não tem ficha ✍️ logo acima"] if f is None else _problemas_da_ficha(f)
        if problemas:
            achados.append(Achado("V14", ERRO, f"{caminho}:{linha} `{nome}`: {'; '.join(problemas)}",
                                  "preencha À MÃO a ficha ✍️ acima da função (modelo em docs/spec/04-algoritmos.md)"))
    return achados


def checar_fichas(caminho, texto):  # V14
    if caminho.startswith(PASTA_FICHA) and caminho.endswith(".py"):
        return _checar_fichas_py(caminho, texto)
    if not caminho.startswith(PASTA_FICHA) or not caminho.endswith(EXT_CPP_FICHA):
        return []
    achados = []
    for nome, pos in definicoes_de_funcao(texto):
        antes = texto[:pos].rstrip()
        abre = antes.rfind("/*")
        f = _ler_ficha(antes[abre:], 0) if antes.endswith("*/") and abre >= 0 and MARCA_FICHA in antes[abre:].splitlines()[0] else None
        linha = texto.count("\n", 0, pos) + 1
        problemas = ["não tem ficha ✍️ logo acima"] if f is None else _problemas_da_ficha(f)
        if problemas:
            achados.append(Achado("V14", ERRO, f"{caminho}:{linha} `{nome}`: {'; '.join(problemas)}",
                                  "preencha À MÃO a ficha ✍️ acima da função (modelo em docs/spec/04-algoritmos.md)"))
    return achados


def linhas_tocadas(diff):
    """Lê um `git diff -U0` → {arquivo: (linhas removidas no antigo, linhas adicionadas no novo)}."""
    tocadas, atual = {}, None
    for l in diff.splitlines():
        if l.startswith("+++ "):
            atual = None if l[4:] == "/dev/null" else l[4:].removeprefix("b/")
        elif l.startswith("--- ") and l[4:] != "/dev/null":
            atual = l[4:].removeprefix("a/")
        elif l.startswith("@@") and atual:
            h = re.match(r"@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@", l)
            a, na, b, nb = int(h[1]), int(h[2] or 1), int(h[3]), int(h[4] or 1)
            rem, add = tocadas.setdefault(atual, (set(), set()))
            rem.update(range(a, a + na))
            add.update(range(b, b + nb))
    return tocadas


def checar_ficha_ia(commits):  # V15
    """commits: [(sha, mensagem, mexeu_em_linha_de_ficha)]"""
    return [Achado("V15", ERRO, f"commit {sha[:7]} tem coautoria de IA e mexe numa ficha ✍️",
                   "a ficha é escrita à mão: tire a ficha desse commit e escreva você mesmo num commit sem IA")
            for sha, msg, mexeu in commits if mexeu and tem_coautor_ia(msg)]
