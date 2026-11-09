# 04 · 🧮 Algoritmos

> [!IMPORTANT]
> Tudo aqui é **implementado no projeto em Python** (D26), sem biblioteca de grafo. O NetworkX entra **só** no benchmark, como gabarito e para comparar tempo.
> A IA pode ajudar a escrever o código, mas **cada função tem uma ficha ✍️ preenchida à mão** (abaixo).

## ✍️ Ficha de entendimento

✅ **D18.** A IA pode escrever o código de `core/grafo/`. Em troca, **toda função definida ali** tem, logo acima, uma ficha preenchida **à mão** por quem commita. Ela é a prova de que a pessoa entende o algoritmo, e é a base da parte dela no vídeo e no relatório.

```python
# ✍️ ENTENDIMENTO · por: Laura
# O que faz:      acha o fluxo máximo de S até T
# Como funciona:  BFS monta os níveis; uma DFS empurra fluxo só para o
#                 nível seguinte; repete até T sumir dos níveis
# Complexidade:   O(V²·E): cada fase custa O(V·E) e há no máximo V fases
# Exemplo:        grafo do papel em tests/test_dinic.py → fluxo 23
# Limitação:      energia não escolhe caminho assim na vida real
def fluxo_maximo(self, g, s, t):
```

| Regra | Detalhe |
|---|---|
| 📍 Onde | imediatamente acima de cada função **definida** (com corpo) em `core/grafo/`: em `.py`, um bloco de linhas `#` logo acima do `def` (e dos decoradores). Vale para todo `def` do módulo e de classe, inclusive `__init__`; `def` dentro de outro `def` não conta. Até a T33, os `.cpp`/`.hpp` que restam seguem com `/* … */` |
| ✍️ Campos | `por:` + O que faz · Como funciona · Complexidade · Exemplo · Limitação. Um campo pode ocupar várias linhas |
| ➖ Funções triviais | **Exemplo** e **Limitação** aceitam `—` (não se aplica). Os outros campos são sempre obrigatórios |
| 🤖 A IA | pode escrever o código e deixar o **modelo vazio** (`___` em todos os campos), mas **não preenche** a ficha |
| 🛡️ Quem cobra | verificador **V14** (função sem ficha, com campo vazio ou com `___` → commit barrado) · **V15** (commit com coautoria de IA que mexe em ficha → barrado) · guarda **G2** (o Claude é barrado se tentar preencher) |

> ⚠️ **Limite honesto:** o script não prova que **você** escreveu a ficha, só que ela existe, está completa e não veio num commit marcado como IA. O resto é a revisão do colega e o vídeo, onde quem assinou a ficha explica a função.

## 🗺️ Mapa rápido

| Pergunta | Algoritmo | Complexidade | Status |
|---|---|---|---|
| 🌳 Gerar a rede de distribuição | Dijkstra com várias fontes | O((V+E) log V) | ✅ |
| 🌊 Quanto de energia chega, e por onde? | **Dinic** (fluxo máximo) | O(V²·E) no pior caso | ✅ algoritmo 🟡 |
| 🚧 Onde estão os gargalos? | corte mínimo (BFS no grafo residual) | O(V+E) depois do fluxo | ✅ |
| 💥 Quem fica sem luz numa falha? | BFS a partir das subestações | O(V+E) | ✅ |
| 🎯 Quais pontos são críticos? | Tarjan: pontes e pontos de articulação | O(V+E) | 🟡 desejável |
| 🔀 Como religar? | Dijkstra por chaves abertas + Dinic para validar | O((V+E) log V) + fluxo | ✅ |
| 📏 Comparação | Edmonds-Karp | O(V·E²) | 🟡 desejável |
| 🌐 Expandir a rede gastando menos cabo | Kruskal + union-find | O(E log E) | 🔵 extra |

> [!WARNING]
> **Nada de recursão em grafo grande.** BH tem dezenas de milhares de vértices, e uma DFS recursiva estoura a pilha (o Python para em ~1000 chamadas). Tarjan e as buscas em profundidade do Dinic precisam ser **iterativos**, com pilha própria.

## 🌳 Gerar a rede (Dijkstra com várias fontes)

- **Entrada:** grafo das ruas (peso = comprimento) e a lista de subestações.
- **Como funciona:** todas as subestações entram na fila com distância 0. Cada ponto fica com a subestação **mais perto pelas ruas**, e a árvore de caminhos mínimos vira o alimentador.
- **Saída:** trechos da árvore viram **cabo**. A rua que liga áreas de subestações diferentes vira **chave aberta**. As outras ruas ficam sem cabo.
- **Fila de prioridade feita à mão** (heap binária). Nada de `heapq` nem `queue.PriorityQueue`, para não haver dúvida sobre a regra do PDF. 🟡

## 🌊 Fluxo máximo (Dinic)

- **Modelo:** S → subestações → trechos → pontos com demanda → T (ver [03](03-modelagem.md)).
- **Por que Dinic:** no benchmark, ficou de 1,1 a 4 vezes mais rápido que o Edmonds-Karp (ver [01](01-decisoes.md)).
- **Saída:** fluxo total, fluxo em cada aresta e **uso = fluxo ÷ capacidade**. É isso que alimenta a animação.
- ⚠️ **Limitação:** fluxo máximo não é física elétrica. A energia "escolhe" o caminho que maximiza a entrega, e na vida real quem decide é a impedância. Isso vai para o relatório.

## 🚧 Gargalos (corte mínimo)

- Depois do Dinic, uma BFS a partir de S no grafo residual separa os vértices **alcançáveis** dos **não alcançáveis**.
- As arestas que vão de alcançável para não alcançável formam o **corte mínimo**, e a soma das capacidades delas é igual ao fluxo máximo (teorema do fluxo máximo e corte mínimo).
- 🟡 **P4 · Regra do domínio:** também é gargalo qualquer trecho com **uso ≥ 90%**. Isso é regra de negócio, então mora no domínio, não no algoritmo.

## 💥 Falhas

- Os trechos e subestações em falha passam a ter capacidade 0.
- BFS a partir de todas as subestações ativas, só pelos trechos normais e pelas chaves **fechadas**. Ponto não visitado = **sem energia**.
- Depois, o Dinic roda de novo para mostrar o fluxo novo.

## 🎯 Pontos críticos (Tarjan)

- **Ponte:** trecho cuja queda separa a rede. **Ponto de articulação:** ponto cuja queda separa a rede.
- Numa rede radial, quase todo trecho é ponte. O dado interessante é **onde a chave de manobra não salva**: rodar o Tarjan considerando as chaves como fechadas e mostrar o que continua sendo ponte.

## 🔀 Rota alternativa

1. Pegar os pontos sem energia (resultado da falha).
2. Dijkstra com várias fontes **a partir deles**, andando pelos trechos normais e podendo atravessar **chaves abertas**. O peso da chave é o comprimento + uma penalidade, para preferir fechar poucas chaves. 🟡
3. Parar ao chegar num ponto que tem energia. As chaves do caminho são as que precisam ser **fechadas**.
4. Fechar essas chaves e rodar o Dinic de novo. **Se a capacidade não der conta, mostrar quanto da demanda foi religado** (religamento parcial).

## 🧪 Como provar que está certo

| Teste | Gabarito | ❌ Mostra que está errado se… |
|---|---|---|
| Grafos pequenos (5 a 10 vértices) desenhados à mão | resposta calculada no papel, e o desenho vai para o relatório | o resultado bater só às vezes |
| Grafos aleatórios e a rede de BH | `networkx.maximum_flow_value`, `bridges`, `articulation_points`, `single_source_dijkstra_path_length`, `connected_components` | qualquer valor diferente do NetworkX |
| Teorema do fluxo máximo e corte mínimo | soma das capacidades do corte | soma diferente do fluxo total |
| Tempo | NetworkX e Edmonds-Karp no mesmo grafo | o tempo crescer muito acima do Big-O esperado |

💡 O **adaptador CLI** (ver [05](05-arquitetura.md)) lê um grafo de arquivo e imprime o resultado. O script de benchmark em Python roda o CLI e o NetworkX no **mesmo arquivo** e compara.
