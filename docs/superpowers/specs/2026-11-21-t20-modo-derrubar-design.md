# T20 · 💥 Modo Derrubar: design

✅ decidido com o Lucas em 21/11/2026 (Aprofundar + brainstorm). Issue #16, depende da T18 (#14). A T19 (#15, PR #55) já está na `main`.

## 🎯 Intenção

A segunda pergunta do trabalho é **quem fica sem luz numa falha**. A T20 deixa a pessoa clicar num trecho ou numa subestação para derrubá-lo e ver, no mapa, a área que apagou. É a primeira metade da demo de ponta a ponta da v0.4 (derrubar → religar). A T21 traz o Religar e o painel de resultado em cima do que a T20 deixar pronto.

## ✅ Metas (o "pronto quando" da issue)

1. Derrubar e restaurar com o mock. Com o servidor, o mesmo código fala com `POST /analise`, mas só dá para testar depois da T16.
2. Várias falhas juntas: a lista cresce a cada clique e cada item pode ser tirado sozinho.
3. "calculando…" enquanto o pedido está em andamento.
4. A subseção **Na tela** de 💥 Falhas no README é escrita à mão pelo Lucas (regra 2 do AGENTS.md). O código não toca no README.

## 🚫 Não-metas

- Derrubar linha AT ou chave: o mock de BH só tem trechos (53.230) e nenhuma chave ou linha AT ligada. O pedido aceita esses ids, mas a tela não oferece o clique.
- Véu e contorno por região (rodadas 5/6 do protótipo), câmera a 50° e 3D.
- Painel de detalhes no modo Observar (capacidade, fluxo, uso): fica para depois.
- Modo Religar e painel de resultado: T21.
- Espera artificial no mock: o mock calcula em milissegundos, e o "calculando…" só pisca. Não vamos fingir os ~3 s do servidor.
- Conferir o mock contra o núcleo Python: os modelos são diferentes (o mock liga a subestação ao ponto mais próximo, o núcleo liga pela transformação), então os resultados nunca bateriam. A conferência real é com o servidor, na T16.

## ⛔ Anti-metas (falhou mesmo "funcionando")

- Uma resposta antiga chegando depois de uma nova e mostrando falhas que já não existem.
- Restaurar tudo e sobrar trecho cinza, ou o fluxo não voltar igual ao do começo.
- Derrubar um tronco perto da subestação e ninguém ficar sem luz.
- Clicar no mapa no modo Observar e derrubar algo sem querer.
- Erro de rede apagando a lista de falhas da pessoa.

## 🧭 Abordagens

| | Como | Troca |
|---|---|---|
| ✅ **1. Separar o `gerarAnalise`** (escolhida) | sai de `front/scripts/mock_de_csv.mjs` para `front/scripts/analise_sintetica.mjs`, sem `node:fs`, e passa a aceitar o pedido. O script `mock:bh` e o front no modo mock importam o mesmo código | uma lógica só; pedido vazio = `analise.bh.json` byte a byte. Custa um `.d.mts` para o TypeScript |
| 2. Reescrever em TS em `src/` | cópia tipada da BFS | duas cópias que podem divergir |
| 3. Mock parado | só pinta o que foi clicado | não mostra ninguém sem luz: não cumpre a meta 1 |

## 🔌 Contrato (não muda)

Pedido do `POST /analise`, igual ao `06-api.md`:

```json
{ "falhas": { "arestas": ["t:678"], "subestacoes": ["s:12"] }, "chavesFechadas": [] }
```

A resposta é a mesma `Analise` de hoje e passa pelo `validarAnalise`. Nenhum arquivo de `front/src/mocks/` muda (V9 do verificador).

## 🧮 O mock com falhas

`gerarAnalise(rede, pedido = {}, agora)` em `front/scripts/analise_sintetica.mjs`.

✅ **Árvore fixa** (decidido com o Lucas, depois do builder check). O mock de BH é uma malha de ruas (53.230 trechos para 35.829 pontos). Se a BFS fosse refeita sem o trecho caído, a energia quase sempre chegaria por outro caminho e ninguém ficaria sem luz. Por isso a rede ligada é a **árvore da BFS do pedido vazio**, e os outros trechos são como chaves abertas: existem, mas não passam energia (já aparecem "sem fluxo" hoje). É como a distribuição real opera (radial, spec 02) e como o núcleo vai responder.

- **Primeira passada:** a BFS de hoje, sem falhas, marca quais trechos são da árvore.
- **Segunda passada:** a mesma BFS, só pelos trechos da árvore que não caíram (mais as chaves fechadas), saindo das raízes das subestações de pé. O fluxo e o resto saem dela.
- **Trecho caído** (`pedido.falhas.arestas`): apaga tudo abaixo dele na árvore.
- **Subestação caída** (`pedido.falhas.subestacoes`): não vira raiz, e a árvore dela inteira fica sem luz (cada árvore tem uma só subestação).
- **Chave fechada** (`pedido.chavesFechadas`): a chave entra como mais uma ligação. Não muda nada na T20 (o mock não tem chaves), mas deixa a T21 pronta.
- Com o pedido vazio, a segunda passada visita os pontos na mesma ordem que a primeira (cada ponto só é achado pelo pai), então a saída é a mesma de hoje.
- **Pedido vazio:** resultado idêntico ao `analise.bh.json` de hoje, menos `tempoMs` (é o teste de regressão).
- O resto não muda: o fluxo é a demanda a jusante, o gargalo é uso ≥ 0,9 e `semEnergia` é quem a BFS não alcançou.
- `mock_de_csv.mjs` passa a importar `gerarAnalise` dali e continua gerando os dois JSON iguais.

Onde entra o mock no front: `carregarAnalise(pedido, opcoes)` em `front/src/api/carregar.ts`.
- **Mock:** usa a rede já carregada e chama `gerarAnalise(rede, pedido)`. O pedido vazio continua lendo o `analise.bh.json`, e o resultado passa pelo `validarAnalise` como a resposta do servidor.
- **Servidor:** `POST /analise` com o corpo acima e `signal` do `AbortController`.

## 🖥️ Na tela

Barra lateral (decidido: opção A), de cima para baixo:

```text
┌ REMG ──────────────────────────┐
│ [ Observar | Derrubar ]        │  ← segmentado, padrão .segmentos da T19
│ Belo Horizonte          97%    │
│ ████████████████▒              │
│ 312 pontos sem luz             │
│ ⟳ calculando…                  │  ← só com pedido em andamento
│ 💥 Falhas (2)       ↺ Restaurar│  ← só com falhas
│  Trecho 678                 ✕  │
│  SE Barreiro                ✕  │
│ (blocos: energia, demanda…)    │
```

- **Modo:** `Observar` (padrão) ou `Derrubar`. No Observar o clique no mapa não faz nada. Trocar de modo não limpa as falhas.
- **Clique no Derrubar:** trecho ou subestação de pé entra na lista; clicar num item já caído tira ele da lista. Cursor de mão e destaque ao passar o mouse só neste modo.
- **Lista:** subestação pelo nome (`rede.subestacoes`), trecho como "Trecho 678" (o id sem o `t:`). Cada item tem um botão ✕ ("Restaurar Trecho 678"). ↺ Restaurar limpa tudo e volta à análise inicial sem pedir de novo.
- **Ordem:** a mais recente embaixo.
- **calculando…:** `role="status"`, aparece enquanto o pedido está em andamento.
- **Erro:** aviso como os de hoje (`role="alert"`) com a mensagem do `carregar.ts`; a lista fica e o mapa continua na última análise boa. Mudar a lista de novo tenta de novo.

### Mapa (cores do `tokens.md` › Outros estados)

| Estado | ☀️ Claro | 🌙 Escuro | Além da cor |
|---|---|---|---|
| ✕ Trecho caído | `#7f7f7f` | `#e0e0e0` | tracejado + ✕ no meio |
| ✕ Subestação caída | mesma cor, sem preenchimento | | ✕ por cima |
| 🌑 Trecho sem luz | `#8a8a86` | `#3d3d3d` | sem brilho, ondas nem raio |

- **Sem luz** = trecho com as duas pontas em `semEnergia.pontos`. Sai das camadas `brilho`, `ondas`, `raio` e `faiscas`. Trecho de fronteira (uma ponta com luz, outra sem) fica no cinza de "sem fluxo": com a árvore fixa, ele não passa energia mesmo (decisão minha).
- ✅ **As ilhas iniciais também são "sem luz"** (decidido com o Lucas). Já com a rede intacta, o mock tem 702 pontos que nenhuma subestação alcança, e a barra mostra "702 pontos sem luz" desde o início. Toda área sem energia usa o mesmo cinza, com ou sem falha. No escuro, essas ilhas ficam um pouco mais apagadas que na T18.
- **Caído:** desenhado já no clique, antes da resposta chegar, a partir da lista de falhas (não da análise).
- **Tracejado** sem dependência nova: o trecho caído vira pedaços no JS (tem poucos, então custa nada). O `@deck.gl/extensions` não está instalado.
- **Legenda:** ganha "Sem luz" sempre que `semEnergia` não estiver vazio, e "Linha caída" quando há falha.
- **Clique:** `pickable` nas camadas `trechos`, `caidos` e `subestacoes` só no modo Derrubar, e `pickingRadius` no `MapboxOverlay` para acertar linha de 2 px. O deck.gl entrega a camada de cima, então a subestação ganha do trecho no ponto de ligação. O trecho caído responde pela camada tracejada com o mesmo id (decisões minhas).
- **Custo do mock:** `gerarAnalise` roda na thread principal (duas BFS em 35 mil pontos e 25 subestações × 35 mil na busca do ponto mais próximo). Precisa ser medido. Se passar de ~100 ms por clique, vira achado; Worker não entra agora (decisão minha).

## 🔁 Pedidos e corrida

- **Fonte da verdade:** a lista de falhas, no estado do `App`. Toda mudança dispara um pedido novo com a lista inteira (a API não tem estado, 05-arquitetura).
- **Corrida:** cada pedido novo aborta o anterior (`AbortController`), e uma resposta só é aceita se for do pedido mais recente. A regra fica numa função pura, testada sem React.
- **Lista vazia:** volta para a análise inicial guardada, sem pedido.
- **Depois da resposta:** `prepararDados(rede, analise)` roda de novo com a análise nova. O tempo disso em BH precisa ser medido; se passar de ~150 ms, vira achado e não muda o design.

## 🧪 Provas

- **Vitest, `gerarAnalise`:**
  - pedido vazio é igual a `analise.bh.json` (menos `tempoMs`);
  - derrubar o trecho que sai da raiz de uma subestação deixa sem luz toda a árvore abaixo dele;
  - trecho fora da árvore (sem fluxo) caído não muda nada;
  - subestação caída numa rede pequena deixa sem luz a árvore dela inteira, e só ela;
  - restaurar (pedido vazio de novo) volta ao início.
- **Vitest, lista de falhas e corrida:** pôr, tirar (clicar no caído), restaurar; resposta antiga ignorada; erro mantém a lista.
- **Vitest, camadas:** trecho sem luz fora das camadas animadas; caído tracejado com ✕.
- **Navegador (mock, BH):** derrubar um tronco perto da subestação e ver a área ficar cinza e a % cair; derrubar três; restaurar um; restaurar tudo e conferir que volta igual; claro e escuro.
- **Com o servidor:** fica ❓ até a T16.

## 🛠️ Deixado para quem constrói

- Nome dos tipos e do hook (ex.: `Pedido`, `useFalhas`).
- O passo do tracejado e o tamanho do ✕, desde que se leia em zoom 12 e 16.
- Texto exato do aviso de erro, no tom dos que já existem.
