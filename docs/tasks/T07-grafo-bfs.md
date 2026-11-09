---
titulo: T07 · 🧮 Estrutura do grafo + BFS
labels: grafo, essencial
release: v0.2
depende: T03
---
> ⚠️ Superada pela D26 (núcleo em Python). Ver T32/T33.

## 🎯 O que é
A classe `Grafo` do núcleo, guardada em vetores (`head`, `prox`, `para`, `cap`), com arestas em **pares** (`e` e `e^1`), e uma **BFS** que encontra os componentes conectados.

## 🤔 Por que importa
É a base de **todos** os outros algoritmos. O jeito de guardar o grafo decide se BH inteira cabe e roda rápido.

## 🧭 Como começar
1. Ler "Representação na memória" no [03-modelagem](../spec/03-modelagem.md).
2. `addAresta(u, v, cap)` cria os dois arcos e devolve o índice.
3. BFS com `std::deque` ou com fila feita à mão.
4. ✍️ A IA pode ajudar a escrever o código, mas **a ficha ✍️ de cada função é sua**, preenchida à mão ([04 · Ficha](../spec/04-algoritmos.md#-ficha-de-entendimento)).

## ✅ Pronto quando
- [ ] testes com 3 grafos pequenos desenhados à mão (conexo, desconexo, com vértice isolado)
- [ ] o desenho dos grafos de teste salvo em `docs/testes/` (vai para o relatório)
- [ ] `core/grafo/` não inclui nada de fora da camada (o verificador checa)

## 📚 Leia antes
[03](../spec/03-modelagem.md) · [04](../spec/04-algoritmos.md)
