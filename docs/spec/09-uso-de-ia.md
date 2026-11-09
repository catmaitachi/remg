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
| 🟡 Com cuidado | **núcleo de grafos** (D18): a IA **pode escrever o código** de `core/grafo/`, mas cada função tem uma **ficha ✍️ preenchida à mão** por quem commita, provando que entende o algoritmo ([04](04-algoritmos.md#-ficha-de-entendimento)) |
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

## 🏷️ Marcação no Git

- PR com ajuda de IA recebe o label **`ia-assistida`**.
- Commit em que a IA escreveu parte do código leva o trailer `Co-Authored-By:` com o nome da ferramenta.

## 📑 No relatório: seção "Papel da IA"

Precisa ter:
1. **Quais ferramentas** e em que etapas (planejamento, código, testes, texto).
2. **Exemplos concretos do registro**: pelo menos uma sugestão aceita e uma rejeitada, com o motivo.
3. **O que foi decisão humana**: tema, área, arquitetura, escolhas de algoritmo e de escopo.
4. **Como garantimos o entendimento**: README à mão, revisão por colega, vídeo explicando cada feature.
5. **Limites e riscos** percebidos (respostas erradas, excesso de confiança).
