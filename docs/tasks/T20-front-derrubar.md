---
titulo: T20 · 💥 Front: modo Derrubar
labels: front, essencial, feature-principal
release: v0.4
depende: T18
---
## 🎯 O que é
O modo em que clicar num trecho ou numa subestação o **derruba**: o front chama `POST /analise` e pinta de cinza a área que ficou sem luz.

## 🤔 Por que importa
É a interação principal da demo: o usuário causa o problema e vê a consequência na hora.

## 🧭 Como começar
1. Guardar a lista de falhas no estado do React.
2. A cada clique, `POST /analise` com **todas** as falhas (a API não guarda estado).
3. Pontos de `semEnergia` em cinza. Painel com % sem luz e tempo de cálculo.
4. Botão ↺ **Restaurar** limpa tudo.

## ✅ Pronto quando
- [ ] derrubar e restaurar funcionando com o mock e com o servidor
- [ ] várias falhas ao mesmo tempo
- [ ] mostra "calculando…" enquanto o cálculo roda (~3 s em BH inteira, D26)
- [ ] 📝 subseção **"Na tela"** dentro de "💥 Falhas" no `README.md`, **escrita à mão por você**

## 📚 Leia antes
[07 · Interações](../spec/07-frontend.md) · [06 · /analise](../spec/06-api.md)
