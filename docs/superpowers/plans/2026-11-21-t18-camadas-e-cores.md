# T18 · Camadas da rede e cores de uso: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** desenhar a rede de BH inteira pintada pelo uso, com legenda e camadas liga/desliga, na identidade REMG no jeito do gov.br.

**Architecture:** um gerador em `front/scripts/` cria `analise.bh.json` (fluxo coerente por BFS com várias fontes). O front carrega rede e análise em paralelo. Funções puras (`cores.ts`, `resumo.ts`, `camadas.ts`) decidem cor, números e camadas do deck.gl, e componentes React finos montam a barra, os controles, o painel de camadas e a legenda.

**Tech Stack:** React 19, TypeScript, Vite 8, Vitest 5 (ambiente node, sem jsdom), deck.gl 9 (`@deck.gl/layers`, `@deck.gl/mapbox`), MapLibre 6 via `react-map-gl/maplibre`.

**Spec:** [`docs/superpowers/specs/2026-11-21-t18-camadas-e-cores-design.md`](../specs/2026-11-21-t18-camadas-e-cores-design.md)

## Global Constraints

- Sem biblioteca de grafo. A BFS do gerador é escrita à mão (AGENTS.md, regra 3).
- Contrato congelado: **nenhum** formato muda, nem no `docs/spec/06-api.md` nem nos mocks existentes. O arquivo novo `analise.bh.json` segue o formato de `POST /analise`, e o 06-api ganha só uma linha citando esse arquivo (Task 1, Step 6), porque a regra 6 do AGENTS.md pede mock e contrato mudando juntos.
- Nenhum número inventado na tela nem nos docs: FPS e contagens só de execução real; sem dado = "—" (AGENTS.md, regra 5).
- Nada da marca gov.br: sem logo, cabeçalho de governo, selo ou "Entrar com gov.br".
- Nome na tela: **REMG** · "Rede de Energia de Minas Gerais". Não renomear "Cintilante" em arquivos fora desta task.
- Fonte: `<link>` para `https://cdngovbr-ds.estaleiro.serpro.gov.br/design-system/fonts/rawline/css/rawline.css`, pilha `Rawline, Raleway, sans-serif`. Não copiar a fonte para o repositório.
- Paleta de uso (hex exatos):
  - claro: normal `#0081a1` · alerta `#c26a00` · gargalo `#c4004f`;
  - escuro: normal `#3db2ff` · alerta `#ffb000` · gargalo `#ff4f8b`;
  - sem fluxo: `#7f7f7f` (claro) · `#9ba7b5` (escuro).
- Faixas: normal `uso < 0.6` · alerta `0.6 ≤ uso < 0.9` · gargalo `uso ≥ 0.9`.
- Vidro:
  - claro: `rgb(255 255 255 / .66)`, borda `rgb(255 255 255 / .7)`, texto `#333333`, primário `#1351b4` com texto `#ffffff`, grão .35;
  - escuro: `rgb(7 29 65 / .70)`, borda `rgb(255 255 255 / .12)`, texto `#ffffff`, primário `#c5d4eb` com texto `#071d41`, grão .45;
  - nos dois: `blur(22px) saturate(170%)`, raio 16 px, a 12 px das bordas.
- Só desktop. Em tela estreita não pode haver rolagem horizontal.
- Commits `tipo: descrição` em português, curtos, sem corpo, sem `Co-Authored-By`. Nunca `--no-verify`.
- Arquivos de interface (`.tsx`, `.css`, `.html`): a trava do fluxo pede `impeccable` (ou `hallmark` + `ui-ux-pro-max`) antes de editar.

## Review Focus

1. **A análise falha** (servidor fora do ar, JSON fora do contrato) mas a rede carrega: o mapa mostra a rede em cinza neutro e um aviso; a barra mostra "—". Teste na Task 2 e na Task 4.
2. **A análise cita ids que não existem na rede** (mock gerado de um CSV antigo): esses ids são ignorados, sem erro. Teste na Task 4.
3. **`semEnergia` vazio ou `demandaTotal` 0:** 100% e "Toda a cidade com luz", sem divisão por zero. Teste na Task 3.
4. **Uso exatamente em 0.6, em 0.9 e em 1** cai na faixa certa. Teste na Task 3.
5. **Ligar e desligar camada ou trocar o tema** não remonta os 53 mil caminhos (só `visible` e as cores mudam). Teste na Task 4: `prepararDados` roda uma vez, e `montarCamadas` com outra visibilidade reaproveita os mesmos arrays.

---

### Task 1: gerador da análise de BH

**Files:**
- Modify: `front/scripts/mock_de_csv.mjs` (nova `gerarAnalise`, e o bloco `main` passa a gravar também `src/mocks/analise.bh.json`)
- Modify: `front/scripts/mock_de_csv.test.ts`
- Create (gerado): `front/src/mocks/analise.bh.json`

**Interfaces:**
- Produces: `gerarAnalise(rede: Rede, agora?: () => number): Analise`. O `agora` padrão é `performance.now` e serve para medir o `tempoMs`.

- [ ] **Step 1: testes que falham** em `mock_de_csv.test.ts`. Os trechos **não têm direção**: a adjacência vale nos dois sentidos (03-modelagem). Duas redes feitas à mão, sempre com 1 subestação `s:1` em (0, 0) e demanda 1 por ponto:
  - **Cadeia** `p:a` (0, 0.001) — `t:ab` — `p:b` (0, 0.002) — `t:bc` — `p:c` (0, 0.003), escrita com `t:bc` de c para b (para provar que não há direção), mais `p:x` (5, 5) ilhado com `t:xx`. Capacidade 1000, exceto `t:ab`, com 2:
    - `test("fluxo soma a demanda a jusante da subestação")`: `s:1` liga em `p:a`; `t:ab` → 2 e `t:bc` → 1;
    - `test("uso é fluxo/capacidade limitado a 1 e gargalo é uso ≥ 0,9")`: `t:ab` com uso 1, `t:ab` em `gargalos` e `t:bc` fora;
    - `test("ponto sem alcance vira semEnergia")`: `semEnergia` é `{ pontos: ["p:x"], demanda: 1 }`;
    - `test("totais e contrato")`: `demandaTotal` 4, `fluxoTotal` 3, `tempoMs` igual ao `agora` falso (`() => 0` → 0) e `validarAnalise(r)` igual a `[]`.
  - **Triângulo** `p:a`, `p:b`, `p:c` com `t:ab`, `t:bc` e `t:ca`, todos com capacidade 1000: `test("aresta do ciclo fora da árvore não entra em fluxo")`: `t:ab` → 1, `t:ca` → 1 e `t:bc` ausente de `fluxo`.
- [ ] **Step 2:** `npm --prefix front test -- mock_de_csv` → FAIL (`gerarAnalise` não existe).
- [ ] **Step 3: implementar `gerarAnalise`.**
  - Cada subestação liga ao ponto mais próximo: menor `(Δlat)² + (Δlon·cos lat)²`, com o `cos` da latitude da subestação.
  - BFS com fila de várias fontes, guardando o pai de cada ponto e a aresta que levou até ele. Use um índice no array, não `shift()`, porque são 35 mil pontos.
  - Subárvores somadas em ordem reversa da BFS.
  - `fluxo` só com fluxo > 0; uso `Math.min(1, fluxo / capacidade)` arredondado a 3 casas; `gargalos` = uso ≥ 0.9.
  - Ignorar arestas `chave` e `linha_at`: as chaves ficam abertas, como no pedido vazio.
- [ ] **Step 4:** `npm --prefix front test -- mock_de_csv` → PASS.
- [ ] **Step 5: gerar e conferir.** `npm --prefix front run mock:bh`. A linha impressa ganha a análise, e o esperado é exatamente o medido no spec: **35.127 pontos alcançados, 702 sem alcance, 35.103 trechos com fluxo, 104 gargalos**. Número diferente = parar e investigar a diferença antes de seguir.
- [ ] **Step 6: citar o mock novo no contrato.** Uma linha em `docs/spec/06-api.md`, logo abaixo do aviso de contrato congelado, sem mudar formato nenhum: "`front/src/mocks/analise.bh.json`: resposta de `POST /analise` com pedido vazio para BH, sintética (fluxo coerente da T18), gerada por `npm --prefix front run mock:bh`." Isso atende a regra 6 do AGENTS.md e o V9 do verificador.
- [ ] **Step 7:** `git add front/scripts front/src/mocks/analise.bh.json docs/spec/06-api.md` e depois `git commit -m "feat: mock de análise de bh com fluxo coerente"`.

### Task 2: carregar a análise

**Files:**
- Modify: `front/src/api/carregar.ts`
- Modify: `front/src/api/carregar.test.ts`

**Interfaces:**
- Consumes: `analise.bh.json` (Task 1), `validarAnalise` (já existe).
- Produces:
  - `urlDaAnalise(usarMock: boolean): string`;
  - `carregarAnalise(usarMock = import.meta.env.VITE_USAR_MOCK === "true", buscar: typeof fetch = fetch): Promise<Analise>`. Com o mock faz GET no `?url`; sem o mock, `POST ${SERVIDOR}/analise` com corpo `{}` e `Content-Type: application/json`.

- [ ] **Step 1: testes que falham:**
  - `urlDaAnalise(true)` casa com `/analise\.bh\.json$/` e `urlDaAnalise(false)` é `"http://localhost:8080/api/analise"`;
  - sem mock, o `buscar` falso recebe `method: "POST"` e `body: "{}"`;
  - devolve `analise.json` quando ele segue o contrato;
  - 500 com `{erro}` vira a mensagem;
  - servidor fora do ar cita `localhost:8080`;
  - fora do contrato rejeita com `/contrato/`.
- [ ] **Step 2:** `npm --prefix front test -- carregar` → FAIL.
- [ ] **Step 3:** implementar, extraindo o miolo comum de `carregarRede` num helper interno `buscarValidado(url, init, validar, oQue)`, para as duas funções não duplicarem o tratamento de erro. `carregarRede` mantém a assinatura.
- [ ] **Step 4:** `npm --prefix front test` → PASS (os testes antigos de `carregarRede` também).
- [ ] **Step 5:** `git commit -m "feat: carregar a análise da rede"`.

### Task 3: cores, faixas e resumo da cidade

**Files:**
- Create: `front/src/mapa/cores.ts` e `front/src/mapa/cores.test.ts`
- Create: `front/src/tela/resumo.ts` e `front/src/tela/resumo.test.ts`

**Interfaces:**
- Produces, em `cores.ts`:
  - `type Tema = "claro" | "escuro"`;
  - `type Faixa = "normal" | "alerta" | "gargalo"`;
  - `faixaDoUso(uso: number): Faixa`;
  - `PALETA: Record<Tema, { normal: string; alerta: string; gargalo: string; semFluxo: string; at: string; subestacao: string; contorno: string; primario: string; fundo: string }>`, em hex. `at`, `subestacao` e `contorno` vêm do `CORES` atual de `camadas.ts`; `primario` é `#1351b4`/`#c5d4eb`; `fundo` é `#f2f3f0`/`#0c0c0c`;
  - `rgb(hex: string): [number, number, number]`.
- Produces, em `resumo.ts`:
  - `resumoDaCidade(a: Analise): { porcento: number; frase: string }`;
  - `formatarPotencia(kva: number): string`;
  - `formatarTempo(ms: number): string`.

- [ ] **Step 1: testes que falham:**
  - `faixaDoUso`: 0.59 → normal; 0.6 → alerta; 0.89 → alerta; 0.9 → gargalo; 1 → gargalo.
  - **Paleta**, copiando para o teste as funções `contraste`, `lab`, `deltaE` e as matrizes de `docs/design/prototipo/cores.test.cjs`:
    - cada cor de uso tem ≥ 3:1 com `fundo` nos dois temas;
    - as 3 cores de uso ficam com ΔE ≥ 20 entre si em visão normal, deuteranopia e protanopia;
    - `normal` × `primario` ≥ 20 nas 3 visões.
  - `resumoDaCidade`:
    - `semEnergia: { pontos: [], demanda: 0 }`, `demandaTotal: 100` → `{ porcento: 100, frase: "Toda a cidade com luz" }`;
    - `demandaTotal: 0` → 100 e a mesma frase;
    - 702 pontos com demanda 702 e `demandaTotal` 35829 → `{ porcento: 98, frase: "702 pontos sem luz" }`;
    - 1 ponto → `"1 ponto sem luz"`;
    - 1500 pontos → `"1.500 pontos sem luz"`;
    - demanda 1 de 1000 → 99 (arredonda para baixo; 100 só quando ninguém está sem luz).
  - `formatarPotencia`: 640 → `"640 kVA"`; 35127 → `"35,1 MVA"`. `formatarTempo`: 104 → `"104 ms"`.
- [ ] **Step 2:** `npm --prefix front test -- cores resumo` → FAIL.
- [ ] **Step 3:** implementar. Formatação com `toLocaleString("pt-BR")`.
- [ ] **Step 4:** `npm --prefix front test -- cores resumo` → PASS.
- [ ] **Step 5:** `git commit -m "feat: cores de uso e resumo da cidade"`.

### Task 4: camadas do deck.gl com uso e visibilidade

**Files:**
- Modify: `front/src/mapa/camadas.ts`
- Modify: `front/src/mapa/camadas.test.ts`

**Interfaces:**
- Consumes: `PALETA`, `faixaDoUso`, `rgb`, `Tema` (Task 3); `Analise`, `Rede`.
- Produces:
  - `type Visiveis = { at: boolean; distribuicao: boolean; subestacoes: boolean; chaves: boolean }` e `VISIVEIS_INICIAL: Visiveis`, com tudo ligado;
  - `type Dados` (opaco para quem chama);
  - `prepararDados(rede: Rede, analise: Analise | null): Dados`, que monta os caminhos uma vez;
  - `montarCamadas(dados: Dados, visiveis: Visiveis, tema: Tema)`, que devolve as camadas;
  - ids das camadas, **nesta ordem de desenho** (o deck.gl desenha na ordem do array, e o halo tem de ficar por baixo): `"halo-gargalos"`, `"trechos"`, `"linhas-at"`, `"chaves"`, `"subestacoes"`, `"gargalos-alerta"`, `"gargalos-alerta-texto"`;
  - `CENTRO_BH` e `estiloDoMapa` continuam como estão.

- [ ] **Step 1: testes que falham** (adaptar os atuais à assinatura nova, usando `rede.pequena.json` + `analise.json`):
  - as 7 camadas existem **na ordem acima**, e `trechos` tem tantos itens quanto as arestas que não são `linha_at`;
  - cada trecho tem a cor da sua faixa, numa **cópia local** de `analise.json` feita no teste (o mock original não tem uso 0.8): `t:1` trocado para uso 0.8 recebe `rgb(PALETA.claro.alerta)`, `t:3` (0.95) recebe `gargalo`, `t:2` (0.125) recebe `normal`, e um trecho ausente de `fluxo` recebe `semFluxo`;
  - `halo-gargalos` e `gargalos-alerta` têm `gargalos.length` itens;
  - **analise `null`:** todos os trechos em `semFluxo` e as camadas de gargalo vazias;
  - **id de análise que não está na rede** (`["t:nao-existe", 5, 0.95]` + `gargalos: ["t:nao-existe"]`): nada quebra e as camadas de gargalo o ignoram;
  - `visiveis.distribuicao = false` → `trechos`, `halo-gargalos` e os dois de alerta com `props.visible === false`, e `props.data` **é o mesmo array** (`toBe`) de antes;
  - tema escuro troca as cores (`PALETA.escuro.*`), e o `updateTriggers.getColor` muda com o tema.
- [ ] **Step 2:** `npm --prefix front test -- camadas` → FAIL.
- [ ] **Step 3: implementar.**
  - `prepararDados` faz uma passada: o `Map` de posições como hoje, mais um `Map<id, uso>` da análise; guarda em cada caminho o id e a faixa (ou `null`).
  - Gargalo: halo `PathLayer` largura 8 na cor `fundo` por baixo; `gargalos-alerta` é `ScatterplotLayer` (raio 9 px, cor `gargalo`, contorno `fundo`) no ponto médio; `gargalos-alerta-texto` é `TextLayer` com `"!"` branco, peso 800.
  - `chaves`: `ScatterplotLayer` não faz quadrado, então use `IconLayer` com um SVG de quadrado com contorno em data URL, no ponto médio das arestas `chave`. Dados vazios com o mock de BH.
  - Larguras: alta tensão 6 px, trecho 2 px, como hoje.
- [ ] **Step 4:** `npm --prefix front test -- camadas` → PASS.
- [ ] **Step 5:** `git commit -m "feat: camadas pintadas pelo uso com liga e desliga"`.

### Task 5: tela REMG no jeito do gov.br

**Files:**
- Create: `front/src/estilo/tokens.css` (tokens do gov.br usados, vidro dos dois temas, grão)
- Modify: `front/src/index.css` (importa os tokens; o vidro do `.aviso` passa a usar os tokens)
- Create: `front/src/tela/Barra.tsx`, `front/src/tela/Controles.tsx`, `front/src/tela/Legenda.tsx`
- Modify: `front/src/App.tsx` e `front/index.html` (título `REMG · Belo Horizonte`, `<link>` da Rawline)

**Interfaces:**
- Consumes: `carregarRede`, `carregarAnalise` (Task 2); `resumoDaCidade`, `formatarPotencia`, `formatarTempo` (Task 3); `prepararDados`, `montarCamadas`, `Visiveis`, `VISIVEIS_INICIAL` (Task 4); `PALETA`, `Tema` (Task 3).
- Props:
  - `Barra({ area: string; analise: Analise | null; usandoMock: boolean })`;
  - `Controles({ visiveis: Visiveis; aoMudar: (v: Visiveis) => void; temChaves: boolean })`, renderizado dentro de `<Map>`;
  - `Legenda({ tema: Tema })`.

- [ ] **Step 1:** chamar `impeccable` (UI existente) antes da primeira edição de arquivo de interface.
- [ ] **Step 2: `App` carrega a rede e a análise em paralelo.**
  - A rede é obrigatória: se falhar, aparece o erro de hoje.
  - A análise é opcional: se falhar, a barra mostra "—", o mapa fica em `semFluxo` e um `.aviso` diz "Não deu para carregar a análise: {mensagem}".
  - `useMemo(() => prepararDados(rede, analise), [rede, analise])` e `useMemo(() => montarCamadas(dados, visiveis, tema), [dados, visiveis, tema])`.
  - O zoom e o recentralizar usam `useMap()` do `react-map-gl`, que **só funciona em componentes dentro de `<Map>`**. Por isso `<Controles>` é renderizado como filho de `<Map>`, e o próprio `Controles` chama `useMap()` (as props `aoZoom` e `aoCentralizar` saem).
- [ ] **Step 3: `Barra`.**
  - Selo "RE" + "REMG" + "Rede de Energia de Minas Gerais".
  - Cartão com `area`, `porcento` em 30 px, barra de 8 px no primário e a `frase`.
  - 4 blocos: Energia entregue, Demanda, Gargalos, Tempo de cálculo, com "—" sem análise.
  - O aviso "Dados de exemplo até o servidor ficar pronto." só com `usandoMock`.
  - Largura `clamp(280px, 23vw, 340px)`; rola por dentro se não couber.
- [ ] **Step 4: `Controles`.**
  - Coluna de vidro: `+`, `−`, recentralizar e Camadas, todos `<button>` de 34 px com `aria-label`.
  - Camadas tem `aria-expanded` e `aria-controls`, e abre o painel de vidro ao lado.
  - O painel tem 4 linhas: amostra do traço ou ícone, nome e `<button role="switch" aria-checked>`.
  - Fecha com Esc, com clique fora ou com o próprio botão.
  - Chaves com `temChaves = false`: o switch fica habilitado, com o texto de apoio "nenhuma nesta rede".
- [ ] **Step 5: `Legenda`.**
  - Faixa de vidro em pílula no pé, entre a barra e a coluna de controles, com 3 itens: amostra SVG na cor de `PALETA[tema]` e os textos "Normal, abaixo de 60%", "Perto do limite, 60 a 90%" e "Gargalo, 90% ou mais".
  - A amostra do gargalo leva o halo.
- [ ] **Step 6: estilo.**
  - Só tokens em `:root` e nos blocos de tema (`@media (prefers-color-scheme: dark)`).
  - `:focus-visible` em tudo que é clicável; `overflow-x: clip` em `html` e `body`.
  - Corpo com 16 px, rótulos com 14 px no mínimo.
  - Grão num `::before` com `mix-blend-mode: overlay`.
  - Sem `transition: all`.
- [ ] **Step 7:** `npm --prefix front run build` e `npm --prefix front run lint` → sem erro; `npm --prefix front test` → PASS.
- [ ] **Step 8: conferir no navegador** (`VITE_USAR_MOCK=true`, `npm --prefix front run dev`):
  - os dois temas;
  - painel de camadas, Esc e foco pelo teclado;
  - desligar Distribuição esconde os trechos e os gargalos;
  - a tela abre em 98% e "702 pontos sem luz";
  - os gargalos têm halo e "!";
  - nenhuma rolagem horizontal em 1024 px.
- [ ] **Step 8b: provar que os caminhos não são remontados.** Com a aba Performance aberta (ou um `console.count` temporário em `prepararDados`), alterne Distribuição e troque o tema: `prepararDados` não roda de novo. Remova o contador antes do commit.
- [ ] **Step 9: medir o FPS.** No zoom inicial, com BH inteira, conte quadros por `requestAnimationFrame` durante 5 s enquanto arrasta o mapa, e anote o número medido. **Abaixo de 30** → aplicar a saída do spec (corte por zoom) e medir de novo.
- [ ] **Step 10:** `git commit -m "feat: tela remg no estilo gov.br com camadas e legenda"`.

### Task 6: docs e fechamento

**Files:**
- Modify: `docs/design/tokens.md` (nova seção "🏛️ gov.br (T18)": paleta híbrida com as medidas do spec, vidro com grão, Rawline do CDN, cartão em barra)
- Modify: `docs/spec/07-frontend.md` (a seção 🎨 Design aponta para o gov.br e para essa seção do tokens.md)

- [ ] **Step 1:** escrever as duas mudanças, só com números que vêm do spec ou da Task 5 (FPS).
- [ ] **Step 2:** `superpowers:verification-before-completion`, depois `npm --prefix front test`, `npm --prefix front run build` e `python tools/verificar/verificar.py` → tudo verde.
- [ ] **Step 3:** `git commit -m "docs: tokens do gov.br e fps da t18"`.
- [ ] **Step 4:** anotar o FPS na issue #14 e abrir o PR com `gh pr create --fill`, só com o ok do Lucas.
