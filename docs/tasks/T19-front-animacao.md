---
titulo: T19 · 🎞️ Front: animação do fluxo
labels: front, essencial, feature-principal
release: v0.4
depende: T18
---
## 🎯 O que é
Fazer a energia "andar" nas linhas: partículas no sentido do fluxo, com velocidade e densidade de acordo com quanto passa, e cor de acordo com o uso.

## 🤔 Por que importa
É a assinatura visual do projeto, a primeira coisa que chama atenção na demo e no vídeo.

## 🧭 Como começar
1. deck.gl `TripsLayer`: cada aresta vira um caminho com tempos, e o "relógio" roda em loop.
2. Mais fluxo = mais rápido ou mais denso. Cor: 🟢 < 60% · 🟡 60–90% · 🔴 ≥ 90%.
3. ⚠️ Animar só o que **está na tela**.
4. Plano B: o traço animado do MapLibre (`line-dasharray` trocado em loop).

## ✅ Pronto quando
- [ ] animação fluida com BH inteira (anotar o FPS)
- [ ] sentido do fluxo correto (vem do sinal do fluxo na API)
- [ ] 📝 subseção **"🎞️ Como a animação funciona"** no `README.md`, **escrita à mão por você**

## 📚 Leia antes
[07 · Animação](../spec/07-frontend.md)
