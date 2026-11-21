# T20 · Modo Derrubar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** clicar num trecho ou subestação no modo Derrubar põe o item na lista de falhas, pede `POST /analise` (ou o mock com árvore fixa) e pinta de cinza quem ficou sem luz.

**Architecture:** o `gerarAnalise` sai do script do mock para um módulo puro que o Node e o navegador importam, e passa a aceitar o pedido. No front, peças puras e testadas (pedido de análise, lista de falhas com um reducer que só aceita a resposta da versão atual, camadas de caído e sem luz) e a ligação delas no `App`, na `Barra`, na `Legenda` e no `CamadasDeck`.

**Revisão do Codex (21/11):** o plano já incorpora os 6 achados: rede pequena quebrando o gerador, caído ainda brilhando antes da resposta, chave clicável pela camada `trechos`, estado do modo testado como reducer, `useMemo` e `Set` no caminho pesado, e nada de regravar o mock.

**Tech Stack:** React 19, TypeScript, Vite 8, Vitest (ambiente node), deck.gl 9.4 (`MapboxOverlay`), MapLibre via react-map-gl 8.

**Spec:** `docs/superpowers/specs/2026-11-21-t20-modo-derrubar-design.md`

## Global Constraints

- O contrato do `06-api.md` não muda, e nenhum arquivo de `front/src/mocks/` muda (V9).
- Sem dependência nova (o `@deck.gl/extensions` não está instalado: o tracejado é feito no JS).
- Nenhuma biblioteca de grafo; a BFS é à mão, com fila indexada (sem `shift()`).
- Cores: trecho caído `#7f7f7f` claro / `#e0e0e0` escuro; sem luz `#8a8a86` claro / `#3d3d3d` escuro.
- Commits `tipo: descrição` em português, sem corpo, sem `Co-Authored-By`, nunca `--no-verify`.
- O README não é tocado (a subseção "Na tela" é do Lucas).
- Comentário só para o porquê; identificadores em português, como o resto do front.
- Números (ms, FPS) só de medição real.

## Review Focus

1. Clicar duas vezes no mesmo trecho antes da resposta (põe e tira): o estado final é sem falhas, com a análise inicial e nenhuma resposta velha por cima. Teste em Task 3 (`pôr e tirar antes da resposta volta ao início`).
2. Erro do servidor no meio de uma sequência: a lista fica, o aviso aparece e a próxima mudança tenta de novo. Teste em Task 3 (`erro mantém a lista e a última análise boa`).
3. Clique em camada que não se derruba (linha AT, chave, marcador de gargalo): não faz nada. Teste em Task 3 (`alvoDoClique ignora as outras camadas`).
4. Trocar o tema com falhas na tela: o tracejado e o ✕ trocam de cor. Teste em Task 4 (`caído muda de cor com o tema`).
5. Modo Observar: nada fica clicável e as falhas continuam. Teste em Task 4 (`fora do Derrubar nada é pickable`).

---

### Task 1: `gerarAnalise` com pedido e árvore fixa

**Files:**
- Create: `front/scripts/analise_sintetica.mjs`, `front/scripts/analise_sintetica.d.mts`
- Modify: `front/scripts/mock_de_csv.mjs` (tira o `gerarAnalise`, importa de lá)
- Test: `front/scripts/mock_de_csv.test.ts` (troca o import e as chamadas) e `front/scripts/analise_sintetica.test.ts` (novo)

**Interfaces:**
- Produces: `gerarAnalise(rede: Rede, pedido?: Partial<Pedido>, agora?: () => number): Analise` exportado de `front/scripts/analise_sintetica.mjs`, sem import de `node:*`. O `.d.mts` declara essa assinatura, com `Rede`, `Analise` e `Pedido` importados de `../src/api/tipos` (o `Pedido` é criado na Task 2; nesta task, declare `pedido` como `{ falhas?: { arestas?: string[]; subestacoes?: string[] }; chavesFechadas?: string[] }` e a Task 2 troca pelo tipo).

- [ ] **Step 1: Mover os testes do gerador para a assinatura nova.** Em `mock_de_csv.test.ts`, importar `gerarAnalise` de `./analise_sintetica.mjs` e trocar cada `gerarAnalise(x, () => 0)` por `gerarAnalise(x, {}, () => 0)`. O teste `analise.bh.json commitado … é o que o gerador produz` continua igual (é a regressão do pedido vazio).

- [ ] **Step 2: Escrever os testes novos em `analise_sintetica.test.ts`** (redes pequenas montadas no teste, como as `cadeia` e `triangulo` do arquivo vizinho):
  - `trecho da raiz caído apaga tudo abaixo dele`: cadeia s → p:a –t:1– p:b –t:2– p:c; com `{ falhas: { arestas: ["t:1"] } }`, `semEnergia.pontos` = `["p:b", "p:c"]`, `fluxo` sem `t:1` nem `t:2`, `fluxoTotal` = demanda de `p:a`.
  - `trecho fora da árvore caído não muda nada`: no triângulo, derrubar o trecho que ficou sem fluxo dá o mesmo resultado do pedido vazio (com `tempoMs` 0).
  - `a malha não religa por outro caminho`: no triângulo, derrubar um trecho da árvore apaga o ponto abaixo dele, mesmo existindo o terceiro trecho (é a árvore fixa).
  - `subestação caída apaga só a árvore dela`: duas subestações, cada uma com sua cadeia; derrubar `s:1` deixa sem luz só a cadeia de `s:1`.
  - `chave fechada liga como trecho`: rede com uma chave entre as duas árvores e `s:1` caída; com `chavesFechadas: ["c:1"]`, a árvore de `s:1` volta a ter luz pela chave.
  - `aresta ligada a subestação não quebra`: `gerarAnalise(rede.pequena.json, {}, () => 0)` devolve uma análise que passa no `validarAnalise` (hoje dá `TypeError`, porque `t:90` e `t:91` ligam ponto a subestação e a BFS só tem vizinhos para pontos).

- [ ] **Step 3: Rodar e ver falhar.** `npm --prefix front test -- scripts` → FAIL (módulo `./analise_sintetica.mjs` não existe).

- [ ] **Step 4: Implementar.** Mover o `gerarAnalise` para `analise_sintetica.mjs` com a assinatura acima. Duas passadas da mesma BFS: a primeira, sem pedido, guarda o conjunto dos trechos da árvore (a aresta de `pai`); a segunda só anda pelos trechos da árvore que não caíram, mais as chaves de `chavesFechadas`, e sai das raízes das subestações que não caíram. Fluxo, gargalos e `semEnergia` saem da segunda, com o código de hoje. Aresta com uma ponta que não é ponto (ligação à subestação) fica fora dos vizinhos: a subestação já entra pela raiz mais próxima. Escrever o `.d.mts`. Em `mock_de_csv.mjs`, importar `gerarAnalise` e chamar `gerarAnalise(rede)`.

- [ ] **Step 5: Rodar e ver passar.** `npm --prefix front test` → PASS, incluindo a regressão do `analise.bh.json` (que já ignora o `tempoMs`). Não rodar `mock:bh`: ele regrava o `tempoMs` medido e mudaria o mock versionado à toa.

- [ ] **Step 6: Commit.** `refactor: gerarAnalise aceita falhas com árvore fixa`

### Task 2: pedido de análise

**Files:**
- Modify: `front/src/api/tipos.ts`, `front/src/api/carregar.ts`, `front/scripts/analise_sintetica.d.mts`
- Test: `front/src/api/carregar.test.ts`

**Interfaces:**
- Consumes: `gerarAnalise` da Task 1.
- Produces:
  - `interface Pedido { falhas: { arestas: string[]; subestacoes: string[] }; chavesFechadas: string[] }` em `tipos.ts`.
  - `pedirAnalise(pedido: Pedido, rede: Rede, signal?: AbortSignal, usarMock?: boolean, buscar?: typeof fetch): Promise<Analise>` em `carregar.ts`.

- [ ] **Step 1: Testes que falham.**
  - `carregar.test.ts` › `pedirAnalise sem mock faz POST com o pedido inteiro`: corpo = `JSON.stringify(pedido)`, `method` `POST`, `signal` repassado.
  - `carregar.test.ts` › `pedirAnalise com mock calcula com o gerador`: com `rede.pequena.json` e um trecho caído, devolve uma `Analise` válida (`validarAnalise` sem erros) com o ponto abaixo em `semEnergia`.
  - `carregar.test.ts` › `pedirAnalise repassa o erro do servidor`: 500 com `{erro}` rejeita com a mensagem.

- [ ] **Step 2: Rodar e ver falhar.** `npm --prefix front test -- src/api` → FAIL (`pedirAnalise` não existe).

- [ ] **Step 3: Implementar.** `pedirAnalise`: no mock, `await import("../../scripts/analise_sintetica.mjs")` (fica fora do bundle do servidor) e passa o resultado pelo `validarAnalise`; no servidor, `buscarValidado` com `{ method: "POST", headers, body, signal }`. Trocar o tipo do `pedido` no `.d.mts` por `Partial<Pedido>`.

- [ ] **Step 4: Rodar e ver passar.** `npm --prefix front test` → PASS. `npx --prefix front tsc -b front` sem erros.

- [ ] **Step 5: Commit.** `feat: pedido de análise com falhas`

### Task 3: lista de falhas e estado do modo

**Files:**
- Create: `front/src/tela/falhas.ts`
- Test: `front/src/tela/falhas.test.ts`

**Interfaces:**
- Consumes: `Pedido` (Task 2), `Rede` e `Subestacao` de `tipos.ts`.
- Produces:
  - `type Alvo = { tipo: "aresta" | "subestacao"; id: string }`.
  - `alternarFalha(falhas: Alvo[], alvo: Alvo): Alvo[]`: tira se já está (pelo id), senão põe no fim.
  - `pedidoDe(falhas: Alvo[]): Pedido`: separa por tipo, na ordem da lista, `chavesFechadas: []`.
  - `rotuloDoAlvo(alvo: Alvo, rede: Rede): string`: subestação pelo nome; trecho como `Trecho 678`.
  - `alvoDoClique(camada: string, objeto: unknown): Alvo | null`: `trechos` e `caidos` → aresta pelo `objeto.id`, **só se `objeto.tipo === "trecho"`** (o `dados.trechos` também traz chaves); `subestacoes` → subestação pelo `objeto[0]`; qualquer outra → `null`.
  - O estado do modo como reducer puro (o ambiente do Vitest é node, sem React):
    - `interface EstadoFalhas { falhas: Alvo[]; inicial: Analise | null; atual: Analise | null; versao: number; calculando: boolean; erro: string | null }` e `ESTADO_INICIAL`.
    - `type Acao = { tipo: "inicial"; analise: Analise } | { tipo: "alternar"; alvo: Alvo } | { tipo: "restaurarTudo" } | { tipo: "resposta"; versao: number; resultado: { ok: Analise } | { erro: string } }`.
    - `reduzirFalhas(e: EstadoFalhas, a: Acao): EstadoFalhas`:
      - `alternar` sobe a `versao`; com lista não vazia, `calculando: true`; com lista vazia, volta `atual` para `inicial` e zera `calculando` e `erro`;
      - `restaurarTudo` faz o mesmo que esvaziar a lista;
      - `resposta` só vale se `versao` for a atual: `ok` vira `atual` e zera o `erro`, `erro` guarda a mensagem e mantém `atual` e `falhas`; nos dois, `calculando: false`;
      - `inicial` sempre guarda `inicial`, mas só troca `atual` se não houver falhas.

- [ ] **Step 1: Testes que falham** (`falhas.test.ts`), com `rede.pequena.json`:
  - `alternar põe no fim e tira pelo id`: `[]` → `[t:1]` → `[t:1, s:1]` → tirar `t:1` → `[s:1]`.
  - `pedido separa arestas e subestações`: `[t:1, s:1, t:2]` → `{ falhas: { arestas: ["t:1", "t:2"], subestacoes: ["s:1"] }, chavesFechadas: [] }`.
  - `rótulo usa o nome da subestação e o número do trecho`: `s:1` → `Subestação Centro (exemplo)`; `t:678` → `Trecho 678`.
  - `alvoDoClique ignora as outras camadas`: `linhas-at`, `chaves`, `gargalos-alerta` → `null`; `trechos` com `{ id: "t:1", tipo: "trecho" }` → aresta `t:1`; `subestacoes` com `["s:1", …]` → subestação `s:1`.
  - `alvoDoClique não derruba chave`: `trechos` com `{ id: "c:1", tipo: "chave" }` → `null`.
  - `pôr e tirar antes da resposta volta ao início`: `alternar(t:1)` duas vezes → `falhas: []`, `atual === inicial`, `calculando: false`; a `resposta` da primeira versão, chegando depois, não muda nada.
  - `resposta velha é ignorada`: duas `alternar`; a `resposta` da versão 1 não troca `atual`; a da versão 2 troca.
  - `erro mantém a lista e a última análise boa`: `resposta` com `erro` → `falhas` iguais, `atual` igual, `erro` com a mensagem, `calculando: false`; um `alternar` seguinte volta a `calculando: true`.
  - `restaurar tudo limpa erro e calculando`.
  - `análise inicial atrasada não apaga as falhas`: com uma falha e `atual` da resposta, a ação `inicial` guarda `inicial` e deixa `atual`.

- [ ] **Step 2: Rodar e ver falhar.** `npm --prefix front test -- falhas` → FAIL.
- [ ] **Step 3: Implementar** as funções e o reducer em `falhas.ts`.
- [ ] **Step 4: Rodar e ver passar.** `npm --prefix front test` → PASS.
- [ ] **Step 5: Commit.** `feat: lista de falhas e estado do modo derrubar`

### Task 4: camadas de caído e sem luz

**Files:**
- Modify: `front/src/mapa/cores.ts`, `front/src/mapa/camadas.ts`
- Test: `front/src/mapa/cores.test.ts`, `front/src/mapa/camadas.test.ts`

**Interfaces:**
- Consumes: `Alvo` (Task 3).
- Produces:
  - `PALETA[tema].semLuz` e `PALETA[tema].caido` com os valores das Global Constraints.
  - `Caminho` ganha `tipo?: TipoAresta` (preenchido em `prepararDados`) e `semLuz?: boolean`: `true` quando as duas pontas estão em `analise.semEnergia.pontos`, consultado por um `Set` (com `includes` ficaria quadrático em BH).
  - `interface Caidos { ids: Set<string>; tracos: Caminho[]; marcas: Marco[] }` e `aplicarFalhas(d: Dados, falhas: Alvo[]): { dados: Dados; caidos: Caidos }` em `camadas.ts`. Com lista vazia devolve o mesmo `d` (mesma referência). Com falhas, `comFluxo`, `destaques`, `gargalos` e `alertas` saem sem os caídos, para o trecho caído parar de brilhar e de animar na hora do clique, antes da resposta. `trechos` fica o mesmo array (os 53 mil caminhos não são refeitos; o caído some pelo alfa). Os `tracos` são 4 traços por trecho caído (o segmento em 7 partes iguais, traços nas partes 0, 2, 4 e 6), cada um com o `id` do trecho. As `marcas` são o meio de cada trecho caído e a posição de cada subestação caída, com o id do alvo.
  - `Opcoes` ganha `caidos?: Caidos` e `derrubando?: boolean`.
  - Camadas novas `caidos` (PathLayer, cor `caido`) e `caidos-x` (TextLayer `✕`, cor `caido`), as duas logo acima de `subestacoes`, só quando `caidos.ids.size > 0`.
  - A camada `trechos` usa `semLuz` → `PALETA.semLuz` e alfa 0 para ids em `caidos.ids`. `subestacoes` caídas ficam sem preenchimento (`getFillColor` com alfa 0) e com contorno `caido` (`getLineColor`); os dois acessores ganham `updateTriggers` com `caidos.ids` e `tema`. `trechos`, `caidos` e `subestacoes` têm `pickable: derrubando` e `autoHighlight: derrubando`, com `highlightColor` do `primario`.

- [ ] **Step 1: Testes que falham.**
  - `cores.test.ts` › `semLuz e caído têm os valores do tokens.md`: os quatro hex exatos.
  - `camadas.test.ts` › `trecho com as duas pontas sem energia é sem luz`: com uma análise cujo `semEnergia.pontos` cobre as duas pontas de `t:2`, `dados.trechos` de `t:2` tem `semLuz: true` e a cor da camada `trechos` é `rgb(PALETA.claro.semLuz)`; um trecho de fronteira (uma ponta só) não é `semLuz`.
  - `camadas.test.ts` › `caído vira tracejado com ✕ e some da linha cheia`: `aplicarFalhas(dados, [{ tipo: "aresta", id: "t:1" }])` dá 4 `tracos` com id `t:1` e 1 marca no meio; com `caidos` nas opções, as camadas `caidos` e `caidos-x` existem e a cor de `t:1` em `trechos` tem alfa 0.
  - `camadas.test.ts` › `caído para de brilhar antes da resposta`: com o mesmo `dados` (sem análise nova), `t:1` caído não está em `comFluxo`, `destaques` nem `gargalos` do `dados` devolvido, e o `trechos` é o mesmo array.
  - `camadas.test.ts` › `sem falhas, nada muda`: `aplicarFalhas(dados, []).dados === dados`.
  - `camadas.test.ts` › `subestação caída fica vazada com ✕`: marca na posição de `s:1` e a cor de preenchimento dela com alfa 0.
  - `camadas.test.ts` › `caído muda de cor com o tema`: no escuro a cor de `caidos` é `rgb("#e0e0e0")`.
  - `camadas.test.ts` › `fora do Derrubar nada é pickable`: sem `derrubando`, `trechos`, `subestacoes` e `caidos` com `pickable` falso; com `derrubando: true`, verdadeiro.
  - O teste `oito camadas…` continua igual (sem falhas, a lista de camadas não muda).

- [ ] **Step 2: Rodar e ver falhar.** `npm --prefix front test -- mapa` → FAIL.
- [ ] **Step 3: Implementar.** `updateTriggers` do `getColor` de `trechos` passa a incluir `caidos?.ids`; os de `subestacoes` como acima. Pôr `semLuz` e `caido` na `PALETA`; se o teste de contraste do `cores.test.ts` cobrir todas as chaves, ele vale para estas também. Se reprovar, é achado (as cores vêm do tokens.md): registrar e não trocar a cor por conta própria.
- [ ] **Step 4: Rodar e ver passar.** `npm --prefix front test` → PASS.
- [ ] **Step 5: Commit.** `feat: camadas de trecho caído e sem luz`

### Task 5: tela do modo Derrubar

**Files:**
- Modify: `front/src/App.tsx`, `front/src/mapa/CamadasDeck.tsx`, `front/src/tela/Barra.tsx`, `front/src/tela/Legenda.tsx`, `front/src/tela/tela.css`, `docs/design/tokens.md`

**Interfaces:**
- Consumes: tudo das Tasks 2 a 4.
- Produces: tela final. Na `Barra`, novas props `modo: "observar" | "derrubar"`, `aoMudarModo`, `falhas: { alvo: Alvo; rotulo: string }[]`, `aoRestaurar(alvo)`, `aoRestaurarTudo()`, `calculando: boolean`. No `CamadasDeck`, novas props `falhas: Alvo[]`, `derrubando: boolean`, `aoClicar(alvo: Alvo)`. Na `Legenda`, `semLuz: boolean` e `caidos: boolean`.

UI: chamar `impeccable` antes de editar (a tela já existe; nada de hallmark).

- [ ] **Step 1: `App`.** `modo` em `useState` (padrão `observar`; trocar não mexe na lista). O resto em `useReducer(reduzirFalhas, ESTADO_INICIAL)`. A análise inicial carregada despacha `inicial`. O `aoClicar` do `CamadasDeck` e o ✕ da lista despacham `alternar`, e o ↺ despacha `restaurarTudo`. Um `useEffect` em `[estado.versao]`, quando há falhas, faz `pedirAnalise(pedidoDe(falhas), rede, controller.signal)` e despacha `resposta` com a versão daquele pedido; o cleanup chama `controller.abort()` (cobre clique novo e desmontagem). `estado.erro` vira o aviso `role="alert"` "Não deu para calcular a falha." com a mensagem. `dados` continua em `useMemo(() => prepararDados(redeOk, estado.atual), [redeOk, estado.atual])`. A `Barra` recebe `estado.atual`.
- [ ] **Step 2: `CamadasDeck`.** `const { dados: vista, caidos } = useMemo(() => aplicarFalhas(dados, falhas), [dados, falhas])`, e `montarCamadas` recebe `vista`. O `MapboxOverlay` recebe `pickingRadius: 6`, `onClick` (com `alvoDoClique(info.layer?.id, info.object)` → `aoClicar`) e `getCursor` (mão quando `derrubando && isHovering`).
- [ ] **Step 3: `Barra`, `Legenda` e CSS.** O segmentado `Observar | Derrubar` (padrão `.segmentos`, `aria-pressed`) fica logo abaixo da marca. A seção "Falhas (n)" com ↺ Restaurar só aparece com falhas, e cada item tem um botão ✕ com `aria-label="Restaurar <rótulo>"`. O "calculando…" usa `role="status"`. Na `Legenda`: "Sem luz" com `semLuz` e "Linha caída" tracejada com `caidos`.
- [ ] **Step 4: Testes e tipos.** `npm --prefix front test` → PASS; `npx --prefix front tsc -b front` sem erros; `npm --prefix front run build` ok.
- [ ] **Step 5: Navegador (mock, BH, preview do Vite).**
  - Derrubar o trecho que sai de uma subestação: a área fica cinza e a % da barra cai.
  - Derrubar três itens e restaurar um pelo ✕.
  - ↺ Restaurar: tudo volta igual ao início (% e gargalos iguais ao carregamento).
  - Repetir no claro e no escuro.
  - No modo Observar, o clique não faz nada.
  - Medir: tempo do `gerarAnalise` por clique, tempo do clique até a pintura, FPS arrastando com 3 falhas e FPS passando o mouse pelas linhas no modo Derrubar (o picking). Anotar os números.
- [ ] **Step 6: `tokens.md`.** Seção curta "💥 Derrubar (T20) ✅" com as cores usadas e os números medidos no Step 5.
- [ ] **Step 7: Commit.** `feat: modo derrubar na barra lateral`
