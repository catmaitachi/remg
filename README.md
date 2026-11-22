<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/banner-dark.gif">
  <img src="docs/banner.gif" width="100%" alt="REMG: a câmera gira em volta da Praça Raul Soares, no centro de Belo Horizonte, com os prédios em 3D e os trechos da rede de distribuição sobre as ruas, em azul abaixo de 60% de uso e em laranja perto do limite">
</picture>

<p>
  <img alt="Python" src="https://img.shields.io/badge/Python-3.12%2B-3776AB?logo=python&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white">
  <img alt="MapLibre" src="https://img.shields.io/badge/MapLibre_GL-6-396CB2?logo=maplibre&logoColor=white">
</p>

A rede de distribuição de energia de **Belo Horizonte** simulada em um grafo, com **fluxo de energia**, **gargalos** e **pontos críticos**.

## 🚀 Como rodar

### 🐍 Núcleo e servidor

> 📦 Dependências: Python 3.12 ou mais novo.

```sh
python -m unittest discover -s tests -t .
python adapters/http/servidor.py
```

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

---

Mais detalhes em [docs/spec/README.md](docs/spec/README.md).

</div>