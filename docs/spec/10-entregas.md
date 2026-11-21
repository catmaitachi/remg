# 10 · 📦 Entregas e cronograma

> [!CAUTION]
> **A falta de qualquer item zera a nota, e cada integrante entrega a própria cópia.** Quem não entregar fica com zero, mesmo que o resto do grupo entregue.

## 🗓️ Cronograma (09/11 → 22/11)

🏷️ Cada marco abaixo fecha uma versão: ver [12-releases](12-releases.md).

| Quando | Meta | Pronto quando… |
|---|---|---|
| **Seg 09 – Ter 10** | 🔍 Revisões + 🚀 arranque | spec aprovada · issues no GitHub · **T01: arquitetura revisada e contrato congelado** · **T02: direção visual** · build rodando em **todas** as máquinas · dados de BH baixados |
| **Qua 11** | ❓ Q1 | professor respondeu se a Etapa 1 é um documento separado |
| **Qua 11 – Sáb 14** | 🧮 Base | BFS, Dijkstra e Dinic com testes · CSV de BH no repo · front com mapa + mocks · `RedeEletrica` montando o grafo |
| **Dom 15 – Ter 17** | 🔗 Integração | rede sintética · casos de uso · HTTP · front falando com o servidor · animação |
| **Qua 18** | 🧊 **Congelamento** | nada de feature nova · benchmark rodado · **READMEs à mão escritos** · UML final |
| **Qui 19 – Sáb 21** | 📑 Entregáveis | relatório · slides · vídeo · ensaio da apresentação · folga para bugs |
| **Dom 22, até 23:59** | 📤 Entrega | **cada integrante** envia o `.zip` no Canvas |

## 📦 O que entregar (checklist)

**No `.zip` de cada integrante**
- [ ] código-fonte do trabalho
- [ ] código-fonte do relatório (`.tex`)
- [ ] PDF do relatório

**Relatório** (template oficial SBC, LaTeX, Overleaf)
- [ ] entre **12 e 15 páginas**
- [ ] responsabilidades e o que **cada membro** fez
- [ ] modelagem, diagramas UML, resultados e **telas**
- [ ] corretude, complexidade e limitações
- [ ] seção **Papel da IA** ([09](09-uso-de-ia.md))

**Apresentação**
- [ ] slides
- [ ] **10 minutos**, com **todos** os membros falando
- [ ] demonstração da ferramenta

**Vídeo**
- [ ] entre **12 e 18 minutos**
- [ ] só funcionamento e explicação das **features de cada aluno**
- [ ] ❓ Q3: um vídeo do grupo ou trechos por pessoa?

**Repositório**
- [ ] histórico de commits com **commits individuais** de todos

## 📑 Esqueleto do relatório 🟡

Cada seção puxa de um arquivo da spec:

| # | Seção | Fonte | Páginas |
|---|---|---|---|
| 1 | Introdução e contexto | [00](00-visao-geral.md) | 1 |
| 2 | Dados (OSM, BH, rede sintética) | [02](02-dados.md) | 1 |
| 3 | Modelagem e UML | [03](03-modelagem.md) | 2–3 |
| 4 | Algoritmos e complexidade | [04](04-algoritmos.md) | 2–3 |
| 5 | Arquitetura e ferramenta (telas) | [05](05-arquitetura.md), [07](07-frontend.md) | 2 |
| 6 | Resultados e desempenho (× NetworkX, × Edmonds-Karp) | benchmark | 2 |
| 7 | Limitações | [00](00-visao-geral.md), [04](04-algoritmos.md) | 0,5 |
| 8 | Papel da IA | [09](09-uso-de-ia.md), registro | 1 |
| 9 | Responsabilidades por membro | kanban | 0,5 |
| 10 | Conclusão | — | 0,5 |

## 🎬 Roteiro sugerido do vídeo 🟡

1. Problema e ideia (1 min)
2. Tour pela tela com BH (2 min)
3. **Cada integrante** apresenta a própria feature usando a seção do README que escreveu (~3 min cada)
4. Desempenho e comparação com o NetworkX (1–2 min)
