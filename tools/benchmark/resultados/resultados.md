# 📊 Benchmark: núcleo × NetworkX

Gerado por `tools/benchmark/benchmark.py` em 22/11/2026 19:46 · Python 3.13.18 · NetworkX 3.7 · Linux x86_64 · mediana de 3 rodada(s).

Tempo só do algoritmo, em milissegundos. **Razão** = núcleo ÷ NetworkX (abaixo de 1, o núcleo foi mais rápido).

| Grafo | V | E | Algoritmo | Núcleo (ms) | NetworkX (ms) | Razão | Mesma resposta? |
|---|---:|---:|---|---:|---:|---:|---|
| aleatório 1.000 | 1.000 | 1.500 | fluxo máximo · Dinic | 7,48 | 9,20 | 0,81 | sim |
| aleatório 1.000 | 1.000 | 1.500 | fluxo máximo · Edmonds-Karp | 1,87 | 16,70 | 0,11 | sim |
| aleatório 1.000 | 1.000 | 1.500 | Dijkstra (fonte 0) | 2,79 | 4,46 | 0,62 | sim |
| aleatório 1.000 | 1.000 | 1.500 | componentes · BFS | 0,51 | 0,75 | 0,68 | sim |
| aleatório 1.000 | 1.000 | 1.500 | pontes · Tarjan | 1,49 | 16,43 | 0,09 | sim |
| aleatório 1.000 | 1.000 | 1.500 | articulações · Tarjan | 1,42 | 1,30 | 1,09 | sim |
| aleatório 1.000 | 1.000 | 1.500 | árvore mínima · Kruskal | 2,18 | 10,31 | 0,21 | sim |
| aleatório 10.000 | 10.000 | 15.000 | fluxo máximo · Dinic | 65,38 | 440,03 | 0,15 | sim |
| aleatório 10.000 | 10.000 | 15.000 | fluxo máximo · Edmonds-Karp | 119,33 | 450,43 | 0,26 | sim |
| aleatório 10.000 | 10.000 | 15.000 | Dijkstra (fonte 0) | 57,01 | 55,54 | 1,03 | sim |
| aleatório 10.000 | 10.000 | 15.000 | componentes · BFS | 7,18 | 6,75 | 1,06 | sim |
| aleatório 10.000 | 10.000 | 15.000 | pontes · Tarjan | 13,64 | 420,75 | 0,03 | sim |
| aleatório 10.000 | 10.000 | 15.000 | articulações · Tarjan | 15,90 | 27,18 | 0,59 | sim |
| aleatório 10.000 | 10.000 | 15.000 | árvore mínima · Kruskal | 33,91 | 126,77 | 0,27 | sim |
| aleatório 50.000 | 50.000 | 75.000 | fluxo máximo · Dinic | 918,55 | 2.084,20 | 0,44 | sim |
| aleatório 50.000 | 50.000 | 75.000 | fluxo máximo · Edmonds-Karp | 1.217,29 | 2.135,32 | 0,57 | sim |
| aleatório 50.000 | 50.000 | 75.000 | Dijkstra (fonte 0) | 337,68 | 385,27 | 0,88 | sim |
| aleatório 50.000 | 50.000 | 75.000 | componentes · BFS | 69,32 | 55,33 | 1,25 | sim |
| aleatório 50.000 | 50.000 | 75.000 | pontes · Tarjan | 117,27 | 1.633,87 | 0,07 | sim |
| aleatório 50.000 | 50.000 | 75.000 | articulações · Tarjan | 117,22 | 195,15 | 0,60 | sim |
| aleatório 50.000 | 50.000 | 75.000 | árvore mínima · Kruskal | 194,02 | 1.179,27 | 0,16 | sim |
| BH · ruas | 35.829 | 53.230 | Dijkstra (fonte 0) | 109,52 | 144,45 | 0,76 | sim |
| BH · ruas | 35.829 | 53.230 | componentes · BFS | 28,31 | 24,82 | 1,14 | sim |
| BH · ruas | 35.829 | 53.230 | pontes · Tarjan | 51,16 | 1.061,87 | 0,05 | sim |
| BH · ruas | 35.829 | 53.230 | articulações · Tarjan | 59,80 | 68,12 | 0,88 | sim |
| BH · ruas | 35.829 | 53.230 | árvore mínima · Kruskal | 129,29 | 713,15 | 0,18 | sim |
| BH · rede elétrica | 35.164 | 71.122 | fluxo máximo · Dinic | 6.732,44 | 14.076,40 | 0,48 | sim |
| BH · rede elétrica | 35.164 | 71.122 | fluxo máximo · Edmonds-Karp | — | — | — | não terminou em 120 s |
