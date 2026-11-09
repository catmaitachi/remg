---
titulo: T21 · 🔀 Front: modo Religar e painel de resultado
labels: front, essencial, feature-principal
release: v0.4
depende: T20
---
## 🎯 O que é
O botão "achar rota" chama `POST /rota-alternativa`, as chaves que precisam fechar **piscam**, e depois o fluxo volta a animar com elas fechadas.

## 🤔 Por que importa
Fecha a história da demo: quebrou, vimos quem apagou, e o sistema mostra como religar.

## 🧭 Como começar
1. Chamar `/rota-alternativa` com as falhas atuais.
2. Destacar `chavesParaFechar` e `caminho`.
3. Chamar `/analise` com `chavesFechadas` e mostrar o antes e depois no painel.
4. Se `parcial: true`, avisar quanto ficou sem luz.

## ✅ Pronto quando
- [ ] fluxo completo: derrubar → achar rota → religar
- [ ] painel mostra demanda religada e tempo
- [ ] mostra "calculando…" enquanto o cálculo roda (~3 s em BH inteira, D26)
- [ ] 📝 subseção **"Na tela"** dentro de "🔀 Rotas alternativas" no `README.md`, **escrita à mão por você**

## 📚 Leia antes
[07](../spec/07-frontend.md) · [06 · /rota-alternativa](../spec/06-api.md)
