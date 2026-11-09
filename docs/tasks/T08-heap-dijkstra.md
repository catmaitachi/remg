---
titulo: T08 · 🧮 Heap binária + Dijkstra com várias fontes
labels: grafo, essencial
release: v0.2
depende: T07, T33
---
## 🎯 O que é
Uma **fila de prioridade feita à mão** (heap binária) e o **Dijkstra** que aceita várias origens ao mesmo tempo e devolve distância, pai e "qual fonte chegou primeiro" em cada vértice.

## 🤔 Por que importa
O Dijkstra entra em dois lugares: na **geração da rede** (cada rua fica com a subestação mais próxima) e na **rota alternativa** (achar a chave para religar).

## 🧭 Como começar
1. Heap com `push`, `pop` e `vazia`. Nada de `heapq` nem `queue.PriorityQueue` (o verificador barra).
2. Dijkstra com "várias fontes" = todas entram na heap com distância 0.
3. O peso vem por parâmetro (comprimento da rua ou outra regra).
4. ✍️ A IA pode ajudar a escrever o código, mas **a ficha ✍️ de cada função é sua**, preenchida à mão ([04 · Ficha](../spec/04-algoritmos.md#-ficha-de-entendimento)).

## ✅ Pronto quando
- [ ] testes da heap (ordem certa, valores repetidos)
- [ ] testes do Dijkstra com 1 e com 2 fontes em grafo desenhado à mão
- [ ] Big-O anotado no comentário do topo do arquivo

## 📚 Leia antes
[04 · Gerar a rede](../spec/04-algoritmos.md)
