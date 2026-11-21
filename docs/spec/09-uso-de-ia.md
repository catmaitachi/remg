# 09 · 🤖 Uso de IA com responsabilidade

> [!IMPORTANT]
> **Regra do grupo (D10).** O uso de IA **não é escondido**. Ele é registrado, marcado nos PRs e explicado no relatório. A IA é **ferramenta**: quem decide, escreve o que importa e responde pelo resultado são os integrantes.

## 🧭 Princípios

1. 👤 **A decisão é humana.** A IA sugere, e o grupo escolhe (e registra o porquê).
2. 🧠 **Quem commita entende.** Se você não consegue explicar uma linha no vídeo, ela não entra.
3. 🔍 **Tudo é revisado.** Sugestão de IA passa pelo mesmo PR e pela mesma revisão de colega que qualquer código.
4. 📒 **Tudo é registrado.** Uso relevante vira uma linha no registro.

## 🚦 Onde pode e onde não pode

| | Uso |
|---|---|
| ✅ Pode | discutir ideias e arquitetura · explicar conceitos e algoritmos · revisar código e apontar bugs · sugerir casos de teste · rascunhar documentação técnica (como esta spec) · ajudar no front, nos adaptadores e nos scripts |
| 🟡 Com cuidado | **núcleo de grafos**: a IA **pode ajudar no código** de `core/grafo/`, mas quem commita explica o algoritmo **à mão no README** (D9, D27) |
| 🚫 Não pode | escrever ou reescrever a **seção do README da sua feature** (D9) · inventar números, medições ou resultados · entrar texto de IA no relatório sem revisão e sem estar declarado |

## 📒 Registro

Arquivo: [`docs/ia/registro.md`](../ia/registro.md). Uma linha por uso **relevante**: um diálogo que gerou decisão, código ou texto que entrou no projeto.

| Coluna | O que escrever |
|---|---|
| Data | `dd/mm` |
| Quem | integrante |
| Ferramenta | ex.: Claude, ChatGPT, Copilot |
| Para quê | a pergunta ou tarefa, em uma frase |
| ✅ Aceito | o que entrou no projeto |
| ❌ Rejeitado / mudado | o que foi descartado ou alterado, **e por quê** |
| Link | PR, commit ou arquivo |

> 💡 O **❌ Rejeitado / mudado** é a coluna mais importante: é ela que mostra a parceria, e não só a aceitação.

## 🏷️ Nada de IA no Git (D27)

- Nenhum commit leva `Co-Authored-By:` de ferramenta de IA: o hook `commit-msg` e o CI barram (V17).
- PR sem label de IA. A declaração fica só no registro e no relatório.

## 📑 No relatório: seção "Papel da IA"

Precisa ter:
1. **Quais ferramentas** e em que etapas (planejamento, código, testes, texto).
2. **Exemplos concretos do registro**: pelo menos uma sugestão aceita e uma rejeitada, com o motivo.
3. **O que foi decisão humana**: tema, área, arquitetura, escolhas de algoritmo e de escopo.
4. **Como garantimos o entendimento**: README à mão, revisão por colega, vídeo explicando cada feature.
5. **Limites e riscos** percebidos (respostas erradas, excesso de confiança).
