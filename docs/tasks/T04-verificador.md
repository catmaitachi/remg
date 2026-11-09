---
titulo: T04 · 🛡️ Ligar a proteção da main e conferir o verificador
labels: processo, essencial
release: v0.1
depende: —
---
## 🎯 O que é
O verificador **já está pronto** (`tools/verificar/`, rodando no GitHub Actions em todo PR). Falta o que só o **dono do repositório** consegue fazer no GitHub: ligar a proteção da `main` e criar os labels. E todo mundo precisa conferir que os hooks estão ativos na própria máquina.

## 🤔 Por que importa
Sem a proteção ligada, o check fica vermelho, mas o botão de merge continua funcionando, e a regra vira sugestão. Com ela, **nada fora do padrão entra na `main`**.

## 🧭 Como começar
1. **Dono do repo:** Settings → Branches → regra para `main`:
   - ☑ exigir pull request antes do merge, com **1 aprovação**
   - ☑ exigir o check **verificar** passando
   - ☑ não permitir push direto (inclusive para admins)
2. **Dono do repo:** criar os labels rodando `python tools/kanban/criar_issues.py --criar` (o script cria os labels junto com as issues).
3. **Cada integrante:** rodar `git config core.hooksPath` e confirmar que aparece `.githooks`. Abrir o projeto no Claude Code já liga sozinho.
4. **Cada integrante:** fazer um commit de teste com a mensagem errada numa branch qualquer e ver o hook barrar. Depois, apagar a branch.

## ✅ Pronto quando
- [x] proteção da `main` ligada: ruleset `proteger-main`, ativo desde 09/11
- [ ] os 4 integrantes viram o hook barrar um commit errado
- [ ] o primeiro PR do projeto passou pelo check verde

## 📚 Leia antes
[11 · Verificador](../spec/11-verificador.md) · [08 · Processo](../spec/08-processo.md)
