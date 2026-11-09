---
titulo: T22 · 📊 Benchmark: núcleo × NetworkX
labels: cli, essencial
release: v0.9
depende: T17
---
## 🎯 O que é
Um script Python em `tools/benchmark/` que gera grafos de vários tamanhos, roda o nosso CLI (núcleo Python, D26) e o NetworkX **no mesmo arquivo**, confere se os resultados batem e mede o tempo.

## 🤔 Por que importa
O PDF pede para **demonstrar corretude e analisar desempenho**. Esse é o gabarito externo: se der diferente do NetworkX, tem bug.

## 🧭 Como começar
1. Aqui o NetworkX **pode** (é o único lugar, regra do PDF).
2. Tamanhos: 1 mil, 10 mil, 60 mil vértices + a rede real de BH.
3. Comparar: fluxo máximo, pontes, Dijkstra e componentes.
4. Gerar gráficos de tempo × tamanho (PNG para o relatório).

## ✅ Pronto quando
- [ ] todos os resultados **iguais** ao NetworkX
- [ ] tabela e gráfico prontos para o relatório
- [ ] comparação Dinic × Edmonds-Karp (se a T24 estiver pronta)

## 📚 Leia antes
[04 · Como provar](../spec/04-algoritmos.md) · [01 · Medição](../spec/01-decisoes.md)
