# 📊 Benchmark: núcleo × NetworkX

Gerado por `tools/benchmark/benchmark.py` em 21/11/2026 17:28 · Python 3.12.10 · NetworkX 3.7 · Windows AMD64 · mediana de 3 rodada(s).

Tempo só do algoritmo, em milissegundos. **Razão** = núcleo ÷ NetworkX (abaixo de 1, o núcleo foi mais rápido).

| Grafo | V | E | Algoritmo | Núcleo (ms) | NetworkX (ms) | Razão | Mesma resposta? |
|---|---:|---:|---|---:|---:|---:|---|
| aleatório 1.000 | 1.000 | 1.500 | fluxo máximo · Dinic | 7,47 | 14,79 | 0,51 | sim |
| aleatório 1.000 | 1.000 | 1.500 | fluxo máximo · Edmonds-Karp | 2,30 | 13,13 | 0,18 | sim |
| aleatório 1.000 | 1.000 | 1.500 | Dijkstra (fonte 0) | 4,53 | 4,82 | 0,94 | sim |
| aleatório 1.000 | 1.000 | 1.500 | componentes · BFS | 0,59 | 0,53 | 1,12 | sim |
| aleatório 1.000 | 1.000 | 1.500 | pontes · Tarjan | 3,02 | 25,19 | 0,12 | sim |
| aleatório 1.000 | 1.000 | 1.500 | articulações · Tarjan | 3,25 | 2,27 | 1,43 | sim |
| aleatório 1.000 | 1.000 | 1.500 | árvore mínima · Kruskal | 3,23 | 10,31 | 0,31 | sim |
| aleatório 10.000 | 10.000 | 15.000 | fluxo máximo · Dinic | 67,51 | 454,77 | 0,15 | sim |
| aleatório 10.000 | 10.000 | 15.000 | fluxo máximo · Edmonds-Karp | 109,97 | 457,75 | 0,24 | sim |
| aleatório 10.000 | 10.000 | 15.000 | Dijkstra (fonte 0) | 51,15 | 52,08 | 0,98 | sim |
| aleatório 10.000 | 10.000 | 15.000 | componentes · BFS | 6,23 | 9,96 | 0,63 | sim |
| aleatório 10.000 | 10.000 | 15.000 | pontes · Tarjan | 19,15 | 298,36 | 0,06 | sim |
| aleatório 10.000 | 10.000 | 15.000 | articulações · Tarjan | 18,53 | 35,15 | 0,53 | sim |
| aleatório 10.000 | 10.000 | 15.000 | árvore mínima · Kruskal | 36,50 | 170,21 | 0,21 | sim |
| aleatório 50.000 | 50.000 | 75.000 | fluxo máximo · Dinic | 828,91 | 2.530,87 | 0,33 | sim |
| aleatório 50.000 | 50.000 | 75.000 | fluxo máximo · Edmonds-Karp | 1.109,31 | 2.612,90 | 0,42 | sim |
| aleatório 50.000 | 50.000 | 75.000 | Dijkstra (fonte 0) | 344,75 | 353,04 | 0,98 | sim |
| aleatório 50.000 | 50.000 | 75.000 | componentes · BFS | 75,89 | 61,70 | 1,23 | sim |
| aleatório 50.000 | 50.000 | 75.000 | pontes · Tarjan | 94,54 | 2.014,20 | 0,05 | sim |
| aleatório 50.000 | 50.000 | 75.000 | articulações · Tarjan | 109,54 | 160,71 | 0,68 | sim |
| aleatório 50.000 | 50.000 | 75.000 | árvore mínima · Kruskal | 260,12 | 1.209,69 | 0,22 | sim |
| BH · ruas | 35.829 | 53.230 | Dijkstra (fonte 0) | 136,74 | 168,52 | 0,81 | sim |
| BH · ruas | 35.829 | 53.230 | componentes · BFS | 25,84 | 29,10 | 0,89 | sim |
| BH · ruas | 35.829 | 53.230 | pontes · Tarjan | 51,47 | 1.073,65 | 0,05 | sim |
| BH · ruas | 35.829 | 53.230 | articulações · Tarjan | 46,97 | 85,53 | 0,55 | sim |
| BH · ruas | 35.829 | 53.230 | árvore mínima · Kruskal | 143,30 | 806,21 | 0,18 | sim |
| BH · rede elétrica | 35.164 | 71.122 | fluxo máximo · Dinic | 3.396,19 | 3.740,36 | 0,91 | sim |
| BH · rede elétrica | 35.164 | 71.122 | fluxo máximo · Edmonds-Karp | — | — | — | não terminou em 120 s |
