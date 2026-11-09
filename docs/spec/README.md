# 📚 Spec do projeto **Cintilante**

> Rede de distribuição de energia de Belo Horizonte desenhada como grafo sobre o mapa real, com o fluxo animado, os gargalos, as falhas e as rotas alternativas.
> Trabalho Prático de Grafos, tema 4 ("Monitoramento de distribuição de energia ou água"). **Entrega: 22/11/2026.**

## 🧭 Como ler

Cada arquivo cuida de um assunto só. Se você vai pegar uma task, leia o **00**, o **01** e o arquivo da sua área.

| # | Arquivo | Do que trata | Quem mais usa |
|---|---|---|---|
| 00 | [Visão geral](00-visao-geral.md) | problema, ideia, escopo, o que fica de fora | todos |
| 01 | [Decisões](01-decisoes.md) | o que já foi decidido e o que falta | todos |
| 02 | [Dados](02-dados.md) | de onde vem o mapa e a rede, e como viram arquivo | dados |
| 03 | [Modelagem do grafo](03-modelagem.md) | vértices, arestas, pesos e diagramas UML | todos |
| 04 | [Algoritmos](04-algoritmos.md) | o que cada algoritmo resolve, Big-O e limites | núcleo |
| 05 | [Arquitetura](05-arquitetura.md) | hexágono, camadas e pastas do repositório | todos |
| 06 | [API](06-api.md) | contrato JSON entre front e back | front e back |
| 07 | [Front-end](07-frontend.md) | tela, interações e animação | front |
| 08 | [Processo](08-processo.md) | kanban, issues, branches e definição de pronto | todos |
| 09 | [Uso de IA](09-uso-de-ia.md) | regras para usar IA com responsabilidade | todos |
| 10 | [Entregas e cronograma](10-entregas.md) | o que entregar, quando e o checklist final | todos |
| 11 | [Verificador](11-verificador.md) | script que confere se o commit ou PR segue as regras | todos |
| 12 | [Releases](12-releases.md) | versões v0.1 → v1.0, o que entra em cada uma e quando | todos |
| 13 | [Automação](13-automacao.md) | o ciclo da task: o que é automático, o que é do agente e o que é seu | todos |

📋 **Tasks:** [`docs/tasks/`](../tasks/), uma por arquivo, com descrição amigável · 🤖 **Regras para IA:** [`AGENTS.md`](../../AGENTS.md) · 📒 **Registro de IA:** [`docs/ia/registro.md`](../ia/registro.md)

📄 O enunciado do professor está em [Introdução.pdf](Introdução.pdf).

## 🏷️ Legenda usada em todos os arquivos

| Marca | Significa |
|---|---|
| ✅ | **Decidido.** Só muda com conversa no grupo e com registro em [01-decisoes](01-decisoes.md) |
| 🟡 | **Proposta.** É o caminho padrão, e quem pegar a task pode ajustar e registrar |
| ❓ | **Pendente.** Alguém precisa decidir antes de a task começar |
| ⚠️ | Risco ou pegadinha |
| 💡 | Dica ou ideia |
