---
titulo: T09 · 🌊 Dinic (fluxo máximo) + corte mínimo
labels: grafo, essencial
release: v0.2
depende: T07
---
> ⚠️ Entregue em C++; o porte para Python é da T33.

## 🎯 O que é
O algoritmo de **fluxo máximo de Dinic**: quanto de energia sai das fontes e chega aos consumidores, e quanto passa em cada aresta. Depois, o **corte mínimo**, que são as arestas que limitam tudo.

## 🤔 Por que importa
É o **coração** do projeto: alimenta a animação do fluxo e mostra os gargalos. No benchmark, ficou de 1,1 a 4 vezes mais rápido que o Edmonds-Karp.

## 🧭 Como começar
1. BFS por níveis + DFS que empurra fluxo, com ponteiro de "próxima aresta" por vértice.
2. ⚠️ A DFS precisa ser **iterativa** (pilha própria): com BH inteira, a recursão estoura.
3. Corte mínimo: BFS no grafo residual a partir de S. As arestas de "alcançável" para "não alcançável" formam o corte.
4. ✍️ A IA pode ajudar a escrever o código, mas **a ficha ✍️ de cada função é sua**, preenchida à mão ([04 · Ficha](../spec/04-algoritmos.md#-ficha-de-entendimento)).

## ✅ Pronto quando
- [ ] testes em grafos pequenos com a resposta calculada no papel
- [ ] teste confirmando que **a soma do corte é igual ao fluxo máximo**
- [ ] fluxo e uso (fluxo ÷ capacidade) disponíveis por aresta

## 📚 Leia antes
[04 · Fluxo máximo e Gargalos](../spec/04-algoritmos.md)
