---
titulo: T24 · 📏 Edmonds-Karp para comparação
labels: grafo, desejavel
release: v0.9
depende: T07, T33
---
## 🎯 O que é
Uma segunda implementação de fluxo máximo, mais simples (BFS por caminho), só para **comparar** com o Dinic no relatório.

## 🤔 Por que importa
Mostra no relatório que a **escolha do algoritmo** importa, e com números reais da rede de BH.

## 🧭 Como começar
1. Iterativo, sem recursão (o Python para em ~1000 chamadas).
2. BFS acha um caminho de S até T, empurra o mínimo e repete.
3. Reaproveitar o `Grafo` da T07.
4. ✍️ A IA pode ajudar a escrever o código, mas **a ficha ✍️ de cada função é sua**, preenchida à mão ([04 · Ficha](../spec/04-algoritmos.md#-ficha-de-entendimento)).

## ✅ Pronto quando
- [ ] mesmo fluxo que o Dinic em todos os testes
- [ ] entrada no CLI (`python adapters/cli/main.py fluxo --algoritmo ek`)

## 📚 Leia antes
[04](../spec/04-algoritmos.md)
