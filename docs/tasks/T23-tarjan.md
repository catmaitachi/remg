---
titulo: T23 · 🎯 Tarjan iterativo: pontes e pontos de articulação
labels: grafo, desejavel
release: v0.9
depende: T07, T33
---
## 🎯 O que é
Encontrar as **pontes** (trechos cuja queda separa a rede) e os **pontos de articulação** (pontos cuja queda separa a rede), com o algoritmo de Tarjan **sem recursão**, e expor em `GET /criticos`.

## 🤔 Por que importa
Mostra os pontos frágeis **antes** de qualquer falha. O dado interessante é **onde nem a chave de manobra salva**.

## 🧭 Como começar
1. Tarjan com `disc` e `low`, usando uma pilha própria no lugar da recursão (o Python para em ~1000 chamadas recursivas).
2. Rodar com as chaves consideradas **fechadas**: o que continua sendo ponte é crítico de verdade.
3. ✍️ A IA pode ajudar a escrever o código, mas **a ficha ✍️ de cada função é sua**, preenchida à mão ([04 · Ficha](../spec/04-algoritmos.md#-ficha-de-entendimento)).

## ✅ Pronto quando
- [ ] testes em grafos pequenos (ciclo, árvore, dois ciclos ligados por uma ponte)
- [ ] resultado igual ao `networkx.bridges` no benchmark
- [ ] camada "Críticos" no front (combinar com quem está no front)

## 📚 Leia antes
[04 · Pontos críticos](../spec/04-algoritmos.md)
