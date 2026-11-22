# 11 · 🏷️ Releases

✅ **D19.** Cada fase do backlog vira uma **versão** com data-alvo. Quando a última task de uma versão entra na `main`, sai uma **tag + release no GitHub**. Assim o grupo vê se está em dia, e o relatório e o vídeo podem citar "o que tinha na v0.3".

## 🗺️ Previsão

| Versão | Nome | Tasks | Pronto quando… | Meta |
|---|---|---|---|---|
| ~~v0.0~~ | 📚 Fundação | T00 | ✅ feita | Seg 09/11 |
| ~~v0.1~~ | 🧱 Base | T01 a T06 | ✅ feita | Qua 11/11 |
| **v0.2** | 🧮 Núcleo | T07 · T08 · T09 · T10 · T11 | grafo, BFS, Dijkstra e Dinic testados, e a rede de BH carregada no núcleo | Sáb 14/11 |
| **v0.3** | ⚡ Análises | T12 · T13 · T14 · T15 · T16 · T17 | rede sintética, fluxo, gargalos, falha e rota alternativa respondendo pela API | Ter 17/11 |
| **v0.4** | 🗺️ Tela completa | T18 · T19 · T20 · T21 | demo de ponta a ponta: ver o fluxo, derrubar e religar | Ter 17/11 |
| **v0.9** | 🧊 Congelamento | T22 · T25 · (T23 · T24 🟡) | benchmark contra o NetworkX e UML final. Daqui em diante, só correção | Qua 18/11 |
| **v1.0** | 📤 Entrega | T26 · T27 · T28 | relatório, slides e vídeo prontos: é o que vai no `.zip` | Dom 22/11 |
| v1.1 | 🔵 Extras | T29 · T30 | só se tudo acima estiver pronto | — |

> 💡 A v0.3 (back) e a v0.4 (front) andam **em paralelo** e têm a mesma meta. Elas só se encontram na integração.
> 🟡 As desejáveis (T23, T24) entram na v0.9 se estiverem prontas no dia 18. Se não estiverem, mudam de milestone e não seguram a release.

## ⚙️ Como funciona

| Passo | Quem / o quê |
|---|---|
| 1. Cada task tem `release:` no topo do arquivo em `docs/tasks/` | já preenchido |
| 2. `python tools/kanban/criar_issues.py --criar` cria as **milestones** (com a data-alvo) e põe cada issue na sua | quem criar as issues |
| 3. Quando a última issue da milestone fecha, a **milestone fecha sozinha** | automático ([12](12-automacao.md)) |
| 4. O workflow [`release.yml`](../../.github/workflows/release.yml) cria a tag `vX.Y.0` na `main` e a release com as notas geradas pelos PRs | automático |
| 5. Correção depois da release → tag de patch à mão: `gh release create v0.3.1 --generate-notes` | quem corrigiu |

## 🚦 Como saber se está em dia

- A página **Milestones** do GitHub mostra a % de cada versão e a data-alvo. Milestone vermelha (atrasada) = assunto da próxima conversa do grupo.
- ⚠️ **Regra de corte:** se a v0.3 ou a v0.4 não fecharem até **Qua 18**, o que faltar sai do escopo (vira 🟡 ou 🔵), porque o congelamento não muda de data.
