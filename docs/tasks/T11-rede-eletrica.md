---
titulo: T11 · ⚡ RedeEletrica: do domínio para o grafo
labels: dominio, essencial
release: v0.2
depende: T07, T10, T33
---
## 🎯 O que é
As classes do domínio (`Subestacao`, `Ponto`, `Trecho`, `Chave`) e o `RedeEletrica::montarGrafo()`, que transforma a rede num `Grafo` com super-fonte **S**, super-sorvedouro **T**, chaves abertas e falhas aplicadas.

## 🤔 Por que importa
É o "tradutor" entre energia e grafo. Os algoritmos não sabem o que é subestação, e é aqui que essa ponte acontece.

## 🧭 Como começar
1. Ler a tabela "O grafo" no [03-modelagem](../spec/03-modelagem.md).
2. Ids internos inteiros e um mapa para os ids externos (`"t:678"`).
3. Chave aberta ou trecho em falha = capacidade 0.
4. Ligação da alta tensão: ponta de linha a menos de 200 m de uma subestação se liga a ela. Se der errado, use o plano B do [03](../spec/03-modelagem.md).

## ✅ Pronto quando
- [ ] teste: rede pequena montada à mão vira o grafo esperado
- [ ] teste: falha e chave mudam a capacidade certa
- [ ] diagrama de classes do [03](../spec/03-modelagem.md) bate com o código

## 📚 Leia antes
[03](../spec/03-modelagem.md) · [05](../spec/05-arquitetura.md)
