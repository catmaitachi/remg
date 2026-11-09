---
titulo: T17 · 💻 CLI para testes e benchmark
labels: cli, essencial
release: v0.3
depende: T11
---
## 🎯 O que é
Um programa de linha de comando (`cintilante-cli`) que lê um grafo de arquivo, roda um algoritmo e imprime o resultado e o tempo.

## 🤔 Por que importa
É por ele que o benchmark compara nosso núcleo com o NetworkX **no mesmo arquivo**: a prova de que o resultado está certo.

## 🧭 Como começar
1. CLI em `adapters/cli/main.py` (ponto de montagem, como o servidor).
2. Formato de entrada simples: `V E S T` na 1ª linha, depois `u v cap` por linha.
3. Subcomandos: `fluxo`, `pontes`, `dijkstra`, `componentes` e `exportar` (gera a rede de BH e grava no formato do passo 1, fora do git, para o benchmark: D24).
4. Saída fácil de ler por script (uma linha `chave=valor`, ou JSON).

## ✅ Pronto quando
- [ ] os 5 subcomandos funcionando
- [ ] exemplo de uso no `README.md`

## 📚 Leia antes
[04 · Como provar](../spec/04-algoritmos.md) · [05](../spec/05-arquitetura.md)
