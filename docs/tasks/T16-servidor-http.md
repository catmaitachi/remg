---
titulo: T16 · 🌐 Servidor HTTP em Python com o contrato da API
labels: http, essencial
release: v0.3
depende: T11
---
## 🎯 O que é
O adaptador HTTP, em Python: recebe os pedidos do front, chama a porta `ServicoDeAnalise` importando o núcleo direto (mesmo processo Python, D26) e devolve o JSON **exatamente** como está no [06-api](../spec/06-api.md).

## 🤔 Por que importa
É a ponte entre o mapa e o núcleo. Seguindo o contrato à risca, o front troca o mock pelo servidor sem mudar nada.

## 🧭 Como começar
1. Escolher o framework HTTP do Python 🟡 e carregar a rede **uma vez** quando o servidor sobe.
2. Rotas: `/saude`, `/rede`, `/analise`, `/rota-alternativa`, `/criticos`.
3. Começar com respostas fixas e ir ligando os casos de uso conforme ficarem prontos.
4. Liberar CORS para o endereço do front em desenvolvimento.

## ✅ Pronto quando
- [ ] todas as rotas respondem no formato do contrato
- [ ] o front funciona com `VITE_USAR_MOCK=false`
- [ ] erro de entrada devolve 400 com mensagem em português

## 📚 Leia antes
[06](../spec/06-api.md) · [05](../spec/05-arquitetura.md)
