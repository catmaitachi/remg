# 12 · ⚙️ Automação do fluxo (DevOps)

✅ **D20.** O grupo não vai lembrar de passos de processo. Regra: **o que dá para fazer por script roda no GitHub Actions**, que é garantido. **O resto fica com o agente** (Claude ou outra IA, pelo [`AGENTS.md`](../../AGENTS.md)). ✅ **Sem token extra**: só o token automático do Actions.

## 🔄 O ciclo de uma task

| Etapa | Quem faz | O que acontece |
|---|---|---|
| 1. 🙋 Pegar a task | 🤖 agente roda `python tools/dev/comecar.py N` | confere se as dependências da issue já fecharam · atribui a issue a você · cria a branch `tipo/N-descricao` a partir da `main` atualizada |
| 2. 🗂️ Card → Fazendo | 👤 você (o agente lembra) | arrastar o card. É o **único passo manual do quadro**, porque mover card exige token de projeto (D20) |
| 3. ✍️ Commits | ✅ hooks (já existe) | o verificador barra o que estiver fora da regra |
| 4. 🔀 Abrir o PR | 🤖 agente: `gh pr create --fill` | — |
| 5. 🪄 Arrumar o PR | ☁️ Action **automática** | põe `Closes #N` (vem do nome da branch) · copia a milestone da issue · pede revisão a um colega (rodízio pela [lista da equipe](../../.github/equipe.txt)) |
| 6. 🛡️ Check | ☁️ Action (já existe) + **build** | verificador + testes do verificador, das automações e do prep_osm + testes do núcleo e do servidor (`python -m unittest discover -s tests -t .` e `-s adapters/http`) + build do front (se existir `front/package.json`). É o mesmo check obrigatório, então o build já nasce exigido |
| 7. 🗂️ Card → Revisão | ☁️ quadro (já existe) | PR ligado à issue move o card |
| 8. ✅ Merge | 👤 colega aprova · você mergeia | a issue fecha sozinha (`Closes #N`) · card → Pronto · **branch apagada no GitHub** (configuração do repositório) |
| 9. 🏷️ Release | ☁️ Action **automática** | fechou a última issue aberta da milestone → **fecha a milestone e cria a tag `vX.Y.0`** na mesma execução |
| 10. 🧹 Limpeza local | ✍️ hook `post-merge` | depois do `git pull`, apaga as branches locais cujo PR já entrou |

## 🧱 Peças novas

| Peça | Tipo | Testada por |
|---|---|---|
| `tools/dev/comecar.py` | script (stdlib + `gh`) | testes das partes puras: nome da branch, leitura das dependências |
| `tools/dev/arrumar_pr.py` | script do Action | testes das partes puras: `Closes` e escolha do revisor |
| `tools/dev/release.py` | script do Action | testes: versão a partir do título, "milestone vazia?" |
| `.github/equipe.txt` | lista de logins, um por linha | — |
| `.github/workflows/verificar.yml` | ganha o job **arrumar** antes do check, e os passos de build | primeiro PR depois desta mudança |
| `.github/workflows/release.yml` | passa a disparar também em **issue fechada** | primeira milestone que esvaziar |
| `.githooks/post-merge` | hook | teste de ponta a ponta |
| repositório | apagar branch após o merge · desligar squash/rebase nos botões | configuração (feita uma vez) |

## ⚠️ Detalhes que mudam o desenho

- **Ação feita pelo token do Actions não dispara outro workflow.** Por isso: (a) arrumar o PR roda **dentro** do workflow do verificador, antes do check, e o verificador relê descrição e labels **atualizados**; (b) a Action que fecha a milestone já **cria a release ali mesmo**, em vez de esperar o evento "milestone fechada".
- **O revisor sorteado precisa ter aceitado o convite.** Enquanto não aceitar, o pedido de revisão falha em silêncio e o PR segue sem revisor (o check não depende disso).
- **Milestone com desejável parada** (v0.9): ela só fecha quando *todas* as issues dela fecharem. Desejável que não sair até o dia 18 precisa **mudar de milestone** (regra de corte do [11](11-releases.md)).
- **O build no check** usa comandos padrão (`python -m unittest discover -s tests -t .`, `npm ci && npm run build`). O `-t .` exige `tests/__init__.py`. Quem mudar o jeito de rodar os testes ou o front ajusta o workflow junto.

## 🙅 Fora (de propósito)

- Mover card para **Fazendo** e **A fazer** automaticamente: precisa de token (decisão D20). O `comecar.py` cobre o que importa, que é não começar task com dependência aberta.
- Aviso diário de atraso: a página de Milestones já mostra prazo e porcentagem.
