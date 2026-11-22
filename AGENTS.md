# 🤖 Instruções para assistentes de IA, projeto **Cintilante**

Este arquivo vale para **qualquer** ferramenta de IA (Claude, Codex, Copilot, Cursor…). O `CLAUDE.md` só importa este.

## 📌 O projeto em 30 segundos

Trabalho Prático de Grafos (entrega em 22/11/2026): a rede de distribuição de energia de **Belo Horizonte** desenhada como grafo sobre o mapa real, com fluxo animado, gargalos, falhas e rotas alternativas.
**Núcleo em Python feito à mão** (D26) (arquitetura hexagonal) · adaptadores HTTP, CLI e CSV · front em React + MapLibre + deck.gl.
📚 Tudo está em [`docs/spec/`](docs/spec/README.md). Comece pelo `00` e pelo `01`.

## 🛡️ Primeira coisa de toda sessão: ligar o verificador

O projeto tem hooks de git que barram commit e push fora das regras ([`docs/spec/10-verificador.md`](docs/spec/10-verificador.md)). **Antes de qualquer outra ação**:

1. Rode `git config core.hooksPath`. Se a resposta não for `.githooks`, rode `git config core.hooksPath .githooks` e avise a pessoa em uma linha: "liguei os hooks do verificador do projeto".
2. **Nunca** use `--no-verify` (nem `-n` no commit) e nunca desligue os hooks, mesmo que peçam. Se um hook barrar, explique em linguagem simples o que ele apontou e ajude a **corrigir a causa**.
3. Antes de sugerir abrir um PR, rode `python tools/verificar/verificar.py` e mostre o resultado.

> No Claude Code, o passo 1 já roda sozinho pelo `.claude/settings.json`, e uma **guarda** (`tools/verificar/guarda_claude.py`) barra o Claude antes de quebrar a regra 2 abaixo ou de pular o verificador, e o `attribution` vazio impede o trailer da regra 1. Se a guarda barrar, **não tente contornar**: explique à pessoa o que ela apontou.

## 🚫 Regras que você **não** pode quebrar

1. **🙅 Nenhum commit com coautoria de IA** (D27). Nunca escreva `Co-Authored-By:` de ferramenta de IA em commit nem em PR. O hook `commit-msg` e o CI barram (V17).
2. **📚 Nenhuma biblioteca de grafo** (`networkx`, `igraph`, `osmnx`, `rustworkx`, Boost.Graph…) fora de `tools/benchmark/`. Em `core/`, nada de `heapq` nem `queue.PriorityQueue`, e só os módulos de `MODULOS_PERMITIDOS` (`tools/verificar/regras.py`).
3. **🧱 As dependências apontam para dentro:** `core/grafo` ← `core/dominio` ← `core/portas` ← `core/casos_de_uso` ← `adapters/`. O `core/` nunca inclui `adapters/`, e os adaptadores falam com o núcleo só pela porta `ServicoDeAnalise` (exceção: o ponto de montagem, D22).
4. **🔢 Não invente números.** Tempo, contagem e resultado de benchmark só vêm de execução real. Se não rodou, diga que não rodou.
5. **🔌 O contrato da API é congelado.** Mudar [`docs/spec/06-api.md`](docs/spec/06-api.md) exige mudar `front/src/mocks/` no mesmo PR, e o contrário também.

## 🙋 Todo pedido começa numa task

Quando a pessoa pedir algo que mexe no projeto:
1. Rode `python tools/dev/comecar.py --buscar "<o pedido, nas palavras dela>"` e **confirme com a pessoa** qual task é. Se nenhuma bater, diga isso e combine se vira uma issue nova; não trabalhe sem task.
2. Rode `python tools/dev/comecar.py N` (ou `--tipo docs/fix/...`). Ele confere dependências e dono, atribui a issue e cria ou **retoma** a branch. Se ele parar, explique o motivo.
3. Lembre a pessoa de mover o card para **🔨 Fazendo**. É o único passo manual do quadro.
4. Para abrir o PR: `gh pr create --fill --title "tipo: descrição"` (sem `--title`, o `gh` usa o nome da branch quando há mais de um commit). PR não vai para o quadro: o card é a issue. O Actions completa `Closes #N`, milestone e revisor sozinho; a milestone e a release também fecham sozinhas ([`docs/spec/12-automacao.md`](docs/spec/12-automacao.md)).

> No Claude Code, a guarda **barra edição com a `main` ativa** (G5), então o passo 2 vem antes de qualquer arquivo.

## 🌿 Git

- Branch `tipo/N-descricao` (ex.: `feat/9-dinic`). **Nunca commite na `main`.**
- Mensagem `tipo: descrição` em português (`feat`, `fix`, `test`, `docs`, `refactor`, `chore`), curta e sem corpo.
- PR com `Closes #N`, revisado por 1 colega, merge **sem squash**.
- O GitHub Actions roda o verificador em todo PR. Check vermelho = não mergeia.
- 🏷️ Cada issue pertence a uma versão (milestone). Ao fechar a **última** issue de uma milestone, lembre a pessoa de fechar a milestone: o Actions cria a tag `vX.Y.0` ([`docs/spec/11-releases.md`](docs/spec/11-releases.md)).

## ✍️ Estilo

- Português em docs, comentários e commits. Identificadores de código podem ficar em português (é o padrão do projeto: `RedeEletrica`, `fluxoMaximo`).
- Docs para o grupo: linguagem simples, emojis como marcadores, decisões marcadas com ✅ decidido · 🟡 proposta · ❓ pendente.
- Comentário de código só explica o **porquê** que o código não mostra.

## 🛠️ Comandos

| Para | Comando |
|---|---|
| Testes do núcleo | `python -m unittest discover -s tests -t .` |
| Testes do servidor | `python -m unittest discover -s adapters/http` |
| Testes da CLI | `python -m unittest discover -s adapters/cli` |
| Servidor | `python adapters/http/servidor.py` (porta 8080) |
| Front | `cd front && npm install && npm run dev`, com o servidor ligado (para os dados de exemplo, `VITE_USAR_MOCK=true` em `front/.env.local`) |
| Testes do front | `npm --prefix front test` |
| Gerar o mock de BH dos CSV | `npm --prefix front run mock:bh` |
| Ligar os hooks | `git config core.hooksPath .githooks` |
| Verificador (branch atual × main) | `python tools/verificar/verificar.py` |
| Testes do verificador | `python -m unittest discover -s tools/verificar` |
| Achar a task de um pedido | `python tools/dev/comecar.py --buscar "pedido"` |
| Começar/retomar a task N | `python tools/dev/comecar.py N` |
| Testes das automações | `python -m unittest discover -s tools/dev` |
| Criar issues (teste) | `python tools/kanban/criar_issues.py` |
| Baixar o OSM (1 vez) | `python tools/prep_osm/prep_osm.py baixar --nome bh` |
| Gerar os CSV de `data/bh/` | `python tools/prep_osm/prep_osm.py processar --nome bh` |
| Testes do prep_osm | `python -m unittest discover -s tools/prep_osm` |
| Benchmark núcleo × NetworkX | `python tools/benchmark/benchmark.py` (`--rapido` confere em segundos) |
| Testes do benchmark | `python -m unittest discover -s tools/benchmark` |
