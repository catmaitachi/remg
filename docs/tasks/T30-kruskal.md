---
titulo: T30 · 🌳 Expansão da rede com Kruskal
labels: grafo, extra
release: v1.1
depende: T07
---
> ⚠️ Entregue em C++; o porte para Python é da T33.

## 🎯 O que é
Dado um conjunto de pontos novos, achar a forma de ligá-los à rede **gastando o mínimo de cabo**, com Kruskal + union-find.

## 🤔 Por que importa
Responde a uma pergunta de **planejamento** ("onde puxar cabo novo?") e mostra mais um algoritmo clássico. **Só depois de todo o essencial pronto.**

## 🧭 Como começar
1. Union-find com compressão de caminho e união por tamanho.
2. Ordenar as arestas candidatas por custo e juntar enquanto não formar ciclo.
3. ✍️ A IA pode ajudar a escrever o código, mas **a ficha ✍️ de cada função é sua**, preenchida à mão ([04 · Ficha](../spec/04-algoritmos.md#-ficha-de-entendimento)).

## ✅ Pronto quando
- [ ] testes em grafos pequenos (custo igual ao calculado no papel)
- [ ] resultado igual ao `networkx.minimum_spanning_tree` no benchmark

## 📚 Leia antes
[04](../spec/04-algoritmos.md)
