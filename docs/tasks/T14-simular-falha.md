---
titulo: T14 · 💥 Simular falha
labels: dominio, essencial, feature-principal
release: v0.3
depende: T13
---
## 🎯 O que é
O caso de uso `SimularFalha`: recebe trechos e subestações que caíram e responde **quem ficou sem energia** (pontos e demanda), além do fluxo novo.

## 🤔 Por que importa
É a pergunta que a operadora faz quando algo quebra, e a parte mais "uau" da demo: clicar e ver um bairro apagar.

## 🧭 Como começar
1. Aplicar as falhas numa **cópia** das capacidades (a API não guarda estado).
2. BFS a partir das subestações ativas, só por trechos normais e chaves fechadas.
3. Ponto não visitado = sem energia. Somar a demanda.
4. Rodar o `CalcularFluxo` de novo.

## ✅ Pronto quando
- [ ] teste: derrubar o tronco de um alimentador apaga tudo abaixo dele
- [ ] teste: derrubar uma subestação apaga a área dela
- [ ] 📝 seção **"💥 Falhas"** no `README.md`, **escrita à mão por você**

## 📚 Leia antes
[04 · Falhas](../spec/04-algoritmos.md) · [03 · Sequência](../spec/03-modelagem.md)
