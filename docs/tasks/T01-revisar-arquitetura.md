---
titulo: T01 · 🏛️ Revisar a arquitetura e congelar o contrato da API
labels: revisao, arquitetura, essencial
release: v0.1
depende: —
---
> ⚠️ Superada pela D26 (núcleo em Python). Ver T32/T33.

## 🎯 O que é
Ler a arquitetura proposta (hexágono, núcleo em 2 camadas, portas, pastas) e o contrato da API **em grupo**, achar furos e fechar a versão que todo mundo vai seguir.

## 🤔 Por que importa
Tudo depende disso. Se o contrato da API mudar no meio, front e back se desencontram. Se as camadas não estiverem claras, o código do grafo acaba misturado com HTTP, e a regra do PDF fica difícil de provar.

## 🧭 Como começar
1. Cada um lê [05-arquitetura](../spec/05-arquitetura.md), [06-api](../spec/06-api.md) e [03-modelagem](../spec/03-modelagem.md) (≈ 20 min).
2. Reunião curta (30 a 45 min): cada um traz **uma dúvida e uma sugestão**.
3. Decidir a 🟡 **P1** (HTTP em C++ ou em Python) e revisar os 🟡 da [01-decisoes](../spec/01-decisoes.md).
4. Redesenhar o diagrama do hexágono com a skill `diagram-design`: ele vai para o relatório e para os slides.

## ✅ Pronto quando
- [ ] [01-decisoes](../spec/01-decisoes.md) atualizado: o que era 🟡 virou ✅ ou mudou
- [ ] contrato da API marcado como **congelado** no topo do [06-api](../spec/06-api.md)
- [ ] diagrama final da arquitetura salvo em `docs/diagramas/`

## 📚 Leia antes
[05](../spec/05-arquitetura.md) · [06](../spec/06-api.md) · [03](../spec/03-modelagem.md)
