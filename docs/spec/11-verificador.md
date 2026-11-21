# 11 · 🛡️ Verificador de commit e PR

> 💡 **Ideia:** um script que faz uma **pré-análise** do commit ou do PR e diz, em linguagem simples, se as regras do projeto foram seguidas. Ele **não substitui** a revisão de um colega: tira do caminho o que dá para checar automaticamente, para a revisão humana focar no que importa.

> [!NOTE]
> ✅ **Implementado** em `tools/verificar/`, com 82 testes (incluindo ponta a ponta com hooks de verdade num repositório temporário, e a guarda do Claude).

## 🧭 Onde ele roda

| Onde | Quando | O que confere | Obrigatório? |
|---|---|---|---|
| ☁️ **GitHub Actions** | todo PR aberto, atualizado ou com label mudado | **tudo** (V1–V17), lendo descrição e labels do PR. ❌ = check vermelho | ✅ **sim**: é a barreira final |
| ✍️ **pre-commit** | `git commit` | branch (V2, V13) + arquivos preparados (V4, V5, V6, V12, V16) | ligado automaticamente (abaixo) |
| ✍️ **commit-msg** | `git commit` | formato da mensagem (V1) + sem coautoria de IA (V17) | ligado automaticamente |
| ✍️ **pre-push** | `git push` | push na `main` (V13) + a branch inteira contra a `main` | ligado automaticamente |
| 💻 **Manual** | `python tools/verificar/verificar.py` | a branch inteira contra a `main`, sem saber labels | quando quiser |

✅ **D15 · Actions obrigatório + hooks ligados sem depender de ninguém lembrar.** Os hooks ficam em `.githooks/` e são ativados com `git config core.hooksPath .githooks`. Três caminhos fazem isso sozinhos:

| Caminho | Como | Pega quem… |
|---|---|---|
| 🤖 Claude Code | hook `SessionStart` em [`.claude/settings.json`](../../.claude/settings.json) roda o comando a cada sessão | abre o projeto no Claude Code |
| 📜 Outras IAs | [`AGENTS.md`](../../AGENTS.md) manda a IA conferir e ligar antes de qualquer ação, e proíbe `--no-verify` | usa Codex, Copilot, Cursor… |
| 🛠️ Front | `npm install` (T05) roda o comando | instala o front, mesmo sem IA |

> [!IMPORTANT]
> ✅ **Proteção da `main` ligada (09/11)**, ruleset `proteger-main` no GitHub: PR obrigatório com **1 aprovação** · check **verificar** obrigatório · só **merge** (sem squash nem rebase) · exclusão e force push bloqueados · **exceção só para admin e só via PR**: o dono pode mergear o próprio PR sem aprovação (o GitHub não deixa aprovar o próprio PR), mas ninguém dá push direto. ⚠️ Ao usar a exceção, o check também é pulado: confira se o Actions ficou verde antes de mergear. Hook local dá para pular com `--no-verify`; o ruleset, não.

## 🤖 Guarda do Claude Code

Além dos hooks de git, um hook `PreToolUse` em [`.claude/settings.json`](../../.claude/settings.json) roda [`tools/verificar/guarda_claude.py`](../../tools/verificar/guarda_claude.py) **antes de cada ferramenta** do Claude. Assim, as regras valem para o próprio Claude, e não só para o commit:

| # | O Claude é… | quando tenta… |
|---|---|---|
| G1 | ❌ barrado | usar `--no-verify` / `commit -n`, ou trocar ou apagar o `core.hooksPath` |
| G3 | ❌ barrado | editar o `README.md` abaixo da marca `<!-- ✍️ ESCRITO À MÃO … -->` (regra D9) |
| G4 | ❓ obrigado a pedir aprovação | mexer em `.githooks/`, `tools/verificar/`, `.claude/settings.json` ou `.github/workflows/` |
| G5 | ❌ barrado | editar arquivo com a `main` ativa (todo trabalho começa numa task) |

- O `attribution` vazio do `.claude/settings.json` faz o Claude Code não pôr `Co-Authored-By` nos commits (D27).

- Vale para **quem abrir o projeto no Claude Code**. Outras IAs seguem o [`AGENTS.md`](../../AGENTS.md), e o commit e o PR continuam fiscalizados pelos hooks e pelo Actions.
- Testada em `test_guarda_claude.py`, inclusive rodando o script como o Claude Code roda, com console cp1252 simulado.
- ⚠️ Se o Python não estiver instalado, o hook falha **sem bloquear** (comportamento padrão do Claude Code). O commit continua barrado pelos hooks de git, que também precisam do Python.

✅ **Só biblioteca padrão do Python**, sem instalar nada.

## 📏 As regras

**❌ bloqueia** · **⚠️ avisa** (o revisor decide)

| # | Regra | Nível | Como checa | Regra da spec |
|---|---|---|---|---|
| V1 | Mensagem no formato `tipo: descrição` | ❌ | regex `^(feat\|fix\|test\|docs\|refactor\|chore)(\(.+\))?: .+` | [08](08-processo.md) |
| V2 | Branch no formato `tipo/N-descricao` | ❌ | regex no nome da branch | [08](08-processo.md) |
| V3 | PR com `Closes #N` | ❌ | regex na descrição do PR | [08](08-processo.md) |
| V4 | **Núcleo sem biblioteca proibida** | ❌ | 🐍 `.py` em `core/` (lido com `ast`, até import dentro de função): só `import` de `MODULOS_PERMITIDOS` e do próprio `core` · proibido `heapq`, `queue` e qualquer biblioteca de terceiros · arquivo que não é Python válido também barra | D6, [05](05-arquitetura.md) |
| V5 | **Setas só para dentro** | ❌ | `core/grafo` não importa `core.dominio`, `core.casos_de_uso` nem `adapters` · `core/` nunca importa `adapters` · vale para import relativo (`from .. import dominio`) | [05](05-arquitetura.md) |
| V6 | **Python sem biblioteca de grafo** | ❌ | `import networkx`, `igraph`, `osmnx`, `rustworkx`, `scipy.sparse.csgraph`… só podem aparecer em `tools/benchmark/` | D6, [02](02-dados.md) |
| ~~V7~~ | ~~IA declarada pelo trailer e pelo label~~ | — | saiu na D27 | — |
| V8 | **README à mão** | ❌ | PR com label `feature-principal` → precisa mexer no `README.md` com `✍️ Escrito por:` | D9, [08](08-processo.md) |
| V9 | Contrato e mocks andam juntos | ⚠️ | mudou `06-api.md` sem mexer em `front/src/mocks/`, ou o contrário | [06](06-api.md) |
| V10 | Núcleo com teste | ⚠️ | mudou `core/` sem mexer em `tests/` | [08](08-processo.md) |
| V11 | UML em dia | ⚠️ | criou arquivo novo em `core/` sem mexer em `03-modelagem.md` | [03](03-modelagem.md) |
| V12 | Nada pesado no git | ❌ / ⚠️ | ❌ qualquer coisa em `data/raw/` · ⚠️ arquivo maior que 5 MB | [02](02-dados.md) |
| V13 | Nada direto na `main` | ❌ | commit com a `main` ativa, ou push para a `main` | [08](08-processo.md) |
| ~~V14~~ · ~~V15~~ | ~~ficha ✍️~~ | — | saíram com a ficha (D27) | — |
| V16 | **Adaptador só pela porta** | ❌ | `import` em `adapters/` que entra em `core` fora de `core.portas` · exceção: os pontos de montagem `adapters/http/servidor.py` e `adapters/cli/main.py` | D22, [05](05-arquitetura.md) |
| V17 | **Sem coautoria de IA** | ❌ | commit com `Co-Authored-By:` de ferramenta de IA (lista `FERRAMENTAS_IA`), no `commit-msg` e em cada commit do push e do PR | D27, [09](09-uso-de-ia.md) |

## 🖨️ Como fica a saída

```text
🛡️ Verificador · feat/9-dinic → main · 4 commits

✅ V1  mensagens de commit
✅ V2  nome da branch
✅ V4  núcleo sem biblioteca proibida
✅ V5  dependências apontam para dentro
❌ V17 a1b2c3d: o commit tem coautoria de IA (Co-Authored-By)
        → tire a linha Co-Authored-By; o uso de IA vai só em docs/ia/registro.md (D27)
⚠️ V10 core/grafo/dinic.py mudou e tests/ não mudou
        → faltou teste ou foi de propósito? diga no PR

Resultado: ❌ 1 bloqueio · ⚠️ 1 aviso
```

Cada ❌ diz **o que fazer** para resolver, não só o que está errado.

## 🙈 O que ele **não** consegue garantir

> [!WARNING]
> - Que um texto foi **mesmo** escrito à mão, ou que um código **não** veio de IA. Isso depende da **honestidade** do grupo, do registro e da revisão do colega.
> - Que o algoritmo está **certo**. Isso é papel dos testes e do benchmark ([04](04-algoritmos.md)).
>
> O verificador pega **esquecimento**, não má-fé. E precisa estar dito assim no relatório.

## 🧱 Por dentro

```text
tools/verificar/
├── verificar.py            lê o git (log, diff, show) e o evento do PR; um modo por gatilho
├── regras.py               uma função pura por regra → Achado(regra, nível, msg, dica)
├── test_regras.py          testes de cada regra
└── test_ponta_a_ponta.py   cria um repositório temporário e tenta commits/push/PR proibidos
.githooks/                  pre-commit · commit-msg · pre-push (chamam verificar.py)
.github/workflows/verificar.yml   testes do verificador + verificar.py --pr
```

- Uma regra = uma função pequena e testada.
- Listas que o grupo pode editar ficam **no topo** do `regras.py`: módulos permitidos no núcleo (`MODULOS_PERMITIDOS`), bibliotecas de grafo proibidas, ferramentas de IA reconhecidas, labels.
- Mudou uma regra? Mude o teste junto. O próprio CI roda os testes do verificador antes de usá-lo.
