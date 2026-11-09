---
titulo: T10 · 📂 Leitor dos CSV (porta FonteDeRede)
labels: dados, essencial
release: v0.2
depende: T03, T06
---
## 🎯 O que é
O adaptador que lê os CSV de `data/bh/` e entrega as listas (pontos, trechos, subestações, linhas AT) para o núcleo, implementando a porta `FonteDeRede`.

## 🤔 Por que importa
É o que separa "de onde vem o dado" do núcleo. Trocar BH pela região metropolitana, ou CSV por outro formato, mexe **só aqui**.

## 🧭 Como começar
1. Declarar a porta `core/portas/fonte_de_rede.py` (classe `abc.ABC`) com o grupo da T01.
2. Implementar em `adapters/dados/`. Aqui pode usar biblioteca, se ajudar.
3. Erros com mensagem clara: arquivo faltando, coluna errada, linha quebrada.

## ✅ Pronto quando
- [ ] carrega `data/bh/` inteiro e imprime as contagens
- [ ] teste com um CSV pequeno de exemplo em `tests/dados/`
- [ ] o núcleo **não** importa nada de `adapters/`

## 📚 Leia antes
[02](../spec/02-dados.md) · [05](../spec/05-arquitetura.md)
