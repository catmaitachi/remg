---
titulo: T15 · 🔀 Rota alternativa por chaves de manobra
labels: dominio, essencial, feature-principal
release: v0.3
depende: T08, T14
---
## 🎯 O que é
O caso de uso `RotaAlternativa`: depois de uma falha, descobre **quais chaves fechar** para religar quem ficou sem luz e quanto da demanda volta.

## 🤔 Por que importa
Fecha a história da demo: algo quebra, o sistema mostra quem apagou e **como resolver**. É assim que a distribuidora faz de verdade.

## 🧭 Como começar
1. Dijkstra com várias fontes **a partir dos pontos sem energia**, podendo atravessar chaves abertas (com penalidade, para preferir poucas chaves).
2. Parar ao chegar num ponto com energia. As chaves no caminho = `chavesParaFechar`.
3. Fechar as chaves, rodar o fluxo de novo e informar se o religamento foi **parcial**.

## ✅ Pronto quando
- [ ] teste: área isolada com uma chave para a vizinha é religada fechando aquela chave
- [ ] teste: sem chave possível, a resposta diz isso com clareza
- [ ] 📝 seção **"🔀 Rotas alternativas"** no `README.md`, **escrita à mão por você**

## 📚 Leia antes
[04 · Rota alternativa](../spec/04-algoritmos.md)
