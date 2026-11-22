# 08 · 🗃️ Processo: kanban, issues e Git

## 📋 Kanban (GitHub Projects)

✅ As tasks entram **sem responsável**. Cada pessoa se atribui (assign) quando pegar a task.

| Coluna | Significa |
|---|---|
| 📥 Backlog | existe, mas ainda não dá para começar |
| 📋 A fazer | pronta para começar, e as dependências estão feitas |
| 🔨 Fazendo | tem responsável e branch aberta |
| 👀 Revisão | PR aberto esperando colega |
| ✅ Pronto | PR mergeado **e** definição de pronto cumprida |

🏷️ **Labels**
- Área: `arquitetura` · `grafo` · `dominio` · `http` · `cli` · `dados` · `front` · `processo` · `uml` · `relatorio` · `apresentacao`
- Tipo: `revisao` (decisão em grupo) · `feature-principal` (exige seção do README escrita à mão, e o verificador checa)
- Degrau: `essencial` · `desejavel` · `extra`

## ✔️ Definição de pronto

Toda issue só vai para ✅ **Pronto** com:

- [ ] critérios de aceite da issue cumpridos
- [ ] testes passando (se mexeu no núcleo)
- [ ] PR revisado e aprovado por **pelo menos 1 colega**
- [ ] 📝 **seção do README escrita à mão pelo responsável**, se for feature principal (abaixo)
- [ ] 🤖 registro de IA atualizado, se usou IA
- [ ] 📐 UML atualizado, se mudou a estrutura

## 📝 README escrito à mão

> [!IMPORTANT]
> **Regra do grupo (D9).** Cada feature principal ganha uma seção no `README.md` do projeto, escrita **pelo integrante responsável pela task, à mão, depois que a feature funciona**. A IA **não escreve nem reescreve** essa seção. Objetivo: **todo mundo saber explicar como o sistema funciona**, no vídeo, na apresentação e para o professor.

| Seção do README | Escrita por quem fechar a task |
|---|---|
| 🌳 Rede sintética | T12 |
| 🌊 Fluxo de energia · 🚧 Gargalos | T13 |
| 🎞️ Como a animação funciona | T19 |
| 💥 Falhas (+ subseção "Na tela") | T14 (+ T20) |
| 🔀 Rotas alternativas (+ subseção "Na tela") | T15 (+ T21) |

**O que cada seção precisa ter:**
1. o que a feature responde, em uma frase;
2. como funciona por dentro, com as próprias palavras (algoritmo, entrada e saída);
3. um exemplo pequeno, desenhado ou em texto;
4. limitações conhecidas;
5. `✍️ Escrito por: <nome>`.

💡 Essa seção vira o **roteiro** da parte da pessoa no vídeo.

## 🌿 Git

- 🙋 Começar uma task: `python tools/dev/comecar.py --buscar "o que você vai fazer"` e depois `python tools/dev/comecar.py N`. Ele confere dependências, atribui a issue e cria (ou retoma) a branch ([12](12-automacao.md)).
- 🌱 Branch por issue: `feat/7-dinic`, `fix/12-chave-aberta`, `docs/3-uml`.
- 💬 Commits pequenos, em português, no formato `tipo: o que mudou` (`feat`, `fix`, `test`, `docs`, `refactor`).
- 🔗 PR com `Closes #7` na descrição.
- 🔀 🟡 **P6:** merge commit, **sem squash**. O professor avalia commits individuais, e o squash junta tudo num commit só.
- 👤 Cada integrante commita com a **própria conta** (confira o `git config user.email`).
- 🚫 Nada de commit direto na `main`.
- 🛡️ O [verificador](10-verificador.md) confere tudo isso sozinho: hooks no commit e no push (ligados automaticamente) e check obrigatório no PR.

## 📥 Backlog (sem responsável)

✅ Cada task tem um arquivo em [`docs/tasks/`](../tasks/) com uma descrição amigável: **🎯 o que é · 🤔 por que importa · 🧭 como começar · ✅ pronto quando · 📚 leia antes**. O script `python tools/kanban/criar_issues.py --criar` transforma esses arquivos em issues (sem `--criar`, ele só mostra o que faria).

🏷️ Cada fase é uma **versão** com data-alvo: v0.1 Base · v0.2 Núcleo · v0.3 Análises · v0.4 Tela · v0.9 Congelamento · v1.0 Entrega ([11-releases](11-releases.md)).

✅ **As revisões vêm primeiro (D12):** arquitetura e direção visual são decididas antes de alguém escrever código que dependa delas.

| Fase | Tasks | ⛓️ |
|---|---|---|
| 🔍 **1 · Revisões** | [T01 Arquitetura + contrato](../tasks/T01-revisar-arquitetura.md) · [T02 Direção visual](../tasks/T02-direcao-visual.md) | — |
| 🛠️ **2 · Base** | [T03 Repo e build](../tasks/T03-repo-e-build.md) · [T04 Verificador](../tasks/T04-verificador.md) · [T05 Front base](../tasks/T05-front-base.md) · [T06 Dados OSM](../tasks/T06-prep-osm.md) | T01, T02 |
| 🧮 **3 · Núcleo de grafos** | [T07 Grafo + BFS](../tasks/T07-grafo-bfs.md) · [T08 Heap + Dijkstra](../tasks/T08-heap-dijkstra.md) · [T09 Dinic](../tasks/T09-dinic.md) | T03 |
| ⚡ **4 · Domínio** | [T10 Leitor CSV](../tasks/T10-leitor-csv.md) · [T11 RedeEletrica](../tasks/T11-rede-eletrica.md) · [T12 Rede sintética](../tasks/T12-rede-sintetica.md) · [T13 Fluxo e gargalos](../tasks/T13-calcular-fluxo.md) · [T14 Falha](../tasks/T14-simular-falha.md) · [T15 Rota alternativa](../tasks/T15-rota-alternativa.md) | fase 3 |
| 🔌 **5 · Adaptadores** | [T16 HTTP](../tasks/T16-servidor-http.md) · [T17 CLI](../tasks/T17-cli.md) | T11 |
| 🗺️ **6 · Front** | [T18 Camadas](../tasks/T18-front-camadas.md) · [T19 Animação](../tasks/T19-front-animacao.md) · [T20 Derrubar](../tasks/T20-front-derrubar.md) · [T21 Religar](../tasks/T21-front-religar.md) | T05 |
| 📊 **7 · Prova e entregas** | [T22 Benchmark](../tasks/T22-benchmark.md) · [T25 UML final](../tasks/T25-uml-final.md) · [T26 Relatório](../tasks/T26-relatorio.md) · [T27 Slides](../tasks/T27-slides.md) · [T28 Vídeo](../tasks/T28-video.md) | — |
| 🟡 **Desejável** | [T23 Tarjan](../tasks/T23-tarjan.md) · [T24 Edmonds-Karp](../tasks/T24-edmonds-karp.md) | T07 |
| 🔵 **Extra** | [T29 Região metropolitana](../tasks/T29-regiao-metropolitana.md) · [T30 Kruskal](../tasks/T30-kruskal.md) | essencial pronto |

> 💡 **Para o vídeo e a nota:** cada integrante deveria pegar pelo menos **uma task de núcleo** (fases 3 ou 4) e **uma `feature-principal`**. Assim todo mundo tem um algoritmo próprio e uma seção do README para explicar.
