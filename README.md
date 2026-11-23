<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/banner-dark.gif">
  <img src="docs/banner.gif" width="100%" alt="REMG: a câmera gira em volta da Praça Raul Soares, no centro de Belo Horizonte, com os prédios em 3D e os trechos da rede de distribuição sobre as ruas, em azul abaixo de 60% de uso e em laranja perto do limite">
</picture>

<br>

<p>
  <img alt="Python" src="https://img.shields.io/badge/Python-3.12%2B-3776AB?logo=python&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white">
  <img alt="MapLibre" src="https://img.shields.io/badge/MapLibre_GL-6-396CB2?logo=maplibre&logoColor=white">
</p>

A rede de distribuição de energia de **Belo Horizonte** simulada em um grafo, com **fluxo de energia**, **gargalos** e **pontos críticos**.

</div>

## 🔗 Referências

- [Vídeo no YouTube](https://youtu.be/XknTZmISgS4)
- [Vídeo no Google Drive](https://drive.google.com/file/d/1kZfWUKoKRcz-UQVe7cYbcfVxxSwFGoO0/view?usp=sharing)
- [Relatório (PDF)](docs/relatorio/relatorio.pdf)
- [Slides da apresentação (PPTX)](docs/apresentacao/Apresenta%C3%A7%C3%A3o.pptx)

> 📊 A Tabela 5 do relatório vem de uma rodada do benchmark no Windows (Python 3.13.14, 22/11/2026). Os arquivos em `tools/benchmark/resultados/` são de outra rodada, no Linux (Python 3.13.18, 22/11/2026): os tempos mudam com a máquina, e as respostas são as mesmas nas duas, iguais às do NetworkX em todos os casos que terminaram.

## 🚀 Como rodar

### 🐍 Núcleo e servidor

> 📦 Dependências: Python 3.12 ou mais novo.

```sh
python -m unittest discover -s tests -t .
python adapters/http/servidor.py
```

### 💻 CLI

> Roda um algoritmo do núcleo num grafo de arquivo e mostra o resultado e o tempo. É o que o benchmark usa.

```sh
python adapters/cli/main.py caminhos     grafo.txt 0     # Dijkstra: distância de 0 até cada vértice
python adapters/cli/main.py fluxo        grafo.txt 0 3   # Dinic: fluxo máximo de 0 a 3
python adapters/cli/main.py componentes  grafo.txt       # BFS: componente de cada vértice
python adapters/cli/main.py pontes       grafo.txt       # Tarjan: arestas que são pontes
python adapters/cli/main.py articulacoes grafo.txt       # Tarjan: pontos de articulação
python adapters/cli/main.py arvore       grafo.txt       # Kruskal: árvore geradora mínima
```

O `grafo.txt` é não direcionado: a primeira linha é o número de vértices e cada linha seguinte é `u v capacidade [peso]` (peso padrão 1). `#` começa um comentário. Com `--json`, a saída vira uma linha só, `{"resultado": …, "tempoMs": …}`.

### 🗺️ Front

> 📦 Dependências: Node 22, npm 10 ou mais novo.

```sh
cd front
npm install
npm run dev
```

## 🏛️ Arquitetura hexagonal

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/diagramas/hexagono-dark.svg">
  <img src="docs/diagramas/hexagono.svg" alt="Arquitetura hexagonal do REMG: front e benchmark entram pelos adaptadores, passam pela porta ServicoDeAnalise e chegam ao núcleo Python (casos de uso, domínio e grafo); os dados entram pela porta FonteDeRede, implementada pelo leitor de CSV">
</picture>

## 🎯 Casos de uso

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/diagramas/casos-de-uso-dark.svg">
  <img src="docs/diagramas/casos-de-uso.svg" alt="Casos de uso: o operador vê a rede e o fluxo, vê gargalos, simula falha (que inclui calcular quem ficou sem energia), vê rota alternativa (que estende simular falha) e vê pontos críticos">
</picture>

<div align="center">

Mais detalhes em [docs/spec/README.md](docs/spec/README.md).

</div>