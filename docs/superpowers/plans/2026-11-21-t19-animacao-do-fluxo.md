# T19 · Animação do fluxo: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** fazer o fluxo andar no mapa de BH, no sentido certo: ondas de luz por shader na cidade toda, raio de perto, botão para desligar, e o logo 4b do REMG.

**Architecture:** o contrato da análise ganha sinal no fluxo. Uma função pura calcula, por trecho, a distância até a origem seguindo o sinal. Uma `LayerExtension` do deck.gl desenha as ondas no fragmento a partir dessa distância e de um uniform de tempo. O raio de perto é calculado na CPU (porte do `eletrico.js`) só para os trechos visíveis. Um componente dentro do `<Map>` roda o `requestAnimationFrame` e monta as camadas.

**Tech Stack:** React 19, TypeScript, Vite 8, Vitest 5 (ambiente node, sem jsdom), deck.gl 9.4.1 (`@deck.gl/core`, `@deck.gl/layers`, `@deck.gl/mapbox`), MapLibre 6 via `react-map-gl/maplibre` 8.

**Spec:** `docs/superpowers/specs/2026-11-21-t19-animacao-do-fluxo-design.md`

## Global Constraints

- Sem dependência nova: nada de `@deck.gl/geo-layers` nem `@deck.gl/extensions` no `package.json` (ler o código do `PathStyleExtension` no GitHub, tag `v9.4.1`, só como referência).
- Contrato congelado: `docs/spec/06-api.md`, `front/src/mocks/` e o validador mudam no mesmo PR (regra 6 do AGENTS.md).
- Fluxo positivo = sentido `de → para` da aresta; negativo = `para → de`; zero não entra; `uso = |fluxo| / capacidade`, de 0 a 1.
- Ondas: `VEL` = 450 / 750 / 1100 m/s, `FORCA` = 0,35 / 0,7 / 1 (normal / alerta / gargalo), `PERIODO` = 3 s, `LARG` = 0,1.
- **Ruling (revisão do Codex, desvio do spec):** a fase da onda é o **tempo de chegada** (soma de `comprimento / VEL[faixa]` desde a origem), não a distância. Com a fase pela distância e velocidades diferentes por faixa, a onda se partia na junção entre um trecho normal e um de alerta. Agora o pulso atravessa a cadeia sem emenda, corre mais rápido onde o uso é maior e passa por cada lugar a cada 3 s (espaçamento de 1350 / 2250 / 3300 m). Custo se errado: o gargalo pulsa com a mesma frequência do normal, só que mais rápido e mais forte.
- Raio: fios 1 / 2 / 3, amplitude 2,5 / 3,5 / 5 px, faísca 0 / 4% / 18% por quadro, ponto a cada 6 px (máx. 60 por fio), teto de 500 trechos, estalo 24×/s, fio com 60% de opacidade e 1 px, faísca = 3 riscos de 3–8 px com 90% de opacidade.
- **Ruling (desvio do spec):** o raio entra com **zoom ≥ 14** (`ZOOM_RAIO = 14`), não 15. A prévia mediu o "zoom 15" em tiles de 256 px; o MapLibre usa 512 px, e a mesma escala (trecho mediano ≈ 17 px) é o zoom 14. Custo se errado: o raio aparece um zoom antes do que o Lucas viu; trocar a constante resolve.
- Escuro: ondas com mistura aditiva (`blendColorSrcFactor: "one"`, `blendColorDstFactor: "one"`) e **RGB pré-multiplicado pelo brilho** (`vec4(cor·b, b)`): sem isso, a soma acende a cor inteira mesmo onde a onda está apagada. Claro: mistura normal por alfa.
- Pixels do raio: Web Mercator de verdade, com o mundo de `512 · 2^zoom` px (`x = (lon+180)/360·W`, `y = (1 − ln(tan φ + sec φ)/π)/2·W`); calcula em px e volta para lon/lat.
- Com `prefers-reduced-motion: reduce`, a animação começa desligada e segue a mudança da preferência. A escolha não é guardada.
- O README não é tocado (a subseção 🎞️ é do Lucas, à mão). Nenhum `Co-Authored-By`. Commits `tipo: descrição` em português, sem corpo. Nunca `--no-verify`.
- Números (FPS, tempos) só medidos. Meta: ≥ 60 fps arrastando BH inteira, janela 800×522, `npm run dev`.

## Review Focus

1. Análise nula ou com erro de carga: nada de ondas nem raio, e o mapa não quebra. Teste na Task 3.
2. Fluxo com id fora da rede, ou trecho cujas pontas não têm coordenada: ignorado sem erro. Teste na Task 2.
3. Ciclo no fluxo (a T16 pode mandar): a distância cai para 0 nos pontos do ciclo, sem laço infinito. Teste na Task 2.
4. Trecho de comprimento zero (pontas iguais) ou de menos de 6 px na tela: sem `NaN` no raio, e fica fora dele. Teste na Task 4.
5. Trocar o tema com a animação ligada: a cor e a mistura das ondas trocam junto. Teste na Task 3.

---

### Task 0: Branch e documentos

**Files:** nenhum código.

- [ ] **Step 1:** confirme que o PR #39 foi mergeado (`gh pr view 39 --json state -q .state` → `MERGED`). Se não foi, pare: a T19 só começa depois do merge.
- [ ] **Step 2:** rode `git checkout -- front/src/mocks/rede.bh.json` (a modificação é só de fim de linha). Se o `python tools/dev/comecar.py 15` reclamar de arquivos não rastreados (o spec e este plano), rode `git stash -u`, depois o `comecar.py 15` e então `git stash pop`.
- [ ] **Step 3:** na `feat/15-…`, rode `git add docs/superpowers/specs/2026-11-21-t19-animacao-do-fluxo-design.md docs/superpowers/plans/2026-11-21-t19-animacao-do-fluxo.md` e depois `git commit -m "docs: design e plano da t19"`.

### Task 1: Contrato do sinal do fluxo

**Files:**
- Modify: `front/src/api/validar.ts` (`validarAnalise`, a linha do `f[1] <= 0`)
- Modify: `front/src/api/tipos.ts` (o comentário do `fluxo`)
- Modify: `front/scripts/mock_de_csv.mjs` (`gerarAnalise`)
- Modify: `front/src/mocks/analise.json` (`t:3` passa a −95)
- Regenerate: `front/src/mocks/analise.bh.json` (`npm --prefix front run mock:bh`)
- Modify: `docs/spec/06-api.md` (o bloco de resposta do `POST /analise` e a linha do `fluxo`)
- Test: `front/src/api/validar.test.ts`, `front/scripts/mock_de_csv.test.ts`

**Interfaces:**
- Produces: `Analise.fluxo` como `[id, fluxo, uso][]`, com `fluxo` de sinal livre e diferente de 0. `gerarAnalise(rede)` grava o sinal: positivo quando o pai na BFS é a ponta `de`.

- [ ] **Step 1: testes que falham.** Em `validar.test.ts`:
  - `"fluxo negativo é aceito"`: `validarAnalise({ ...analise, fluxo: [["t:1", -10, 0.5]] })` → `[]`.
  - `"fluxo zero, NaN e infinito são rejeitados"`: para cada valor em `[0, NaN, Infinity, -Infinity]`, `validarAnalise({ ...analise, fluxo: [["t:1", v, 0.5]] }).join()` casa `/fluxo/`.
  - No teste que confere o uso (linha ~70), troque `fluxo / cap` por `Math.abs(fluxo) / cap`.
  - Em `mock_de_csv.test.ts`, os testes existentes da cadeia (`t:bc`) e do triângulo (`t:ca`) têm a aresta escrita ao contrário: as expectativas passam a `-1`, e o módulo continua batendo com a demanda.

  Em `mock_de_csv.test.ts`:
  - `"o sinal do fluxo segue o sentido da BFS"`: no modelo atual do gerador (a subestação **não** tem aresta: fica perto de `p:a`, que vira raiz), com `p:a–p:b` escrita como `["t:x", "p:b", "p:a", "trecho", cap]` e `p:b–p:c` escrita `["t:y", "p:b", "p:c", …]`, o fluxo de `t:x` sai negativo e o de `t:y` positivo.
  - `"analise.json usa fluxo negativo no t:3"`: `analise.fluxo.find(f => f[0] === "t:3")[1]` vale `-95`.
- [ ] **Step 2:** rode `npm --prefix front test`. Esperado: FAIL nos testes novos.
- [ ] **Step 3: implemente.**
  - Em `validarAnalise`, a regra vira `!ehNumero(f[1]) || f[1] === 0` (o `ehNumero` já usa `Number.isFinite`, então barra `NaN` e infinito), com a mensagem `fluxo[i]: fluxo precisa ser diferente de 0 (o sinal dá o sentido)`.
  - Em `gerarAnalise`, guarde a ponta `de` de cada aresta e grave `sinal * f`, onde `sinal = pai === de ? 1 : -1`. O `uso` continua sobre `f`.
  - No `analise.json`, ponha `t:3` como `-95`.
  - Regenere o `analise.bh.json`.
  - No 06-api, troque o exemplo para `[["t:678", 640, 0.8], ["t:679", -120, 0.15]]` e a linha do `fluxo` para: "`[id, fluxo kVA, uso de 0 a 1]`, só com as arestas de fluxo diferente de zero. **Positivo = sentido `de → para` da aresta; negativo = `para → de`.** `uso = |fluxo| / capacidade`."
  - Ajuste o comentário em `tipos.ts`.
- [ ] **Step 4:** rode `npm --prefix front test`. Esperado: PASS, incluindo o teste de contrato do `analise.bh.json` (que compara o arquivo com o gerador).
- [ ] **Step 5:** rode `git add` nos arquivos acima e depois `git commit -m "feat: sinal do fluxo no contrato da análise"`.

### Task 2: Distância até a origem pelo fluxo

**Files:**
- Create: `front/src/mapa/sentido.ts`, `front/src/mapa/onda.ts` (só `ONDA`)
- Modify: `front/src/mapa/camadas.ts` (`Caminho` e `prepararDados`)
- Test: `front/src/mapa/sentido.test.ts`, `front/src/mapa/camadas.test.ts`

**Interfaces:**
- Consumes: `Analise.fluxo` com sinal (Task 1).
- Produces:
  ```ts
  export interface Sentido { distInicio: number; comprimento: number; tempoInicio: number; positivo: boolean }
  export function sentidoDoFluxo(rede: Rede, analise: Analise): Map<string, Sentido>
  ```
  `distInicio` e `comprimento` em metros (haversine); `tempoInicio` em segundos = soma de `comprimento / ONDA.VEL[faixa]` dos trechos anteriores pelo caminho escolhido (faixa pelo `uso`, com `faixaDoUso`); `positivo` = sinal do fluxo. As constantes `ONDA` nascem nesta task, em `onda.ts` (só o objeto; a função vem na Task 3). O `Caminho` de `camadas.ts` ganha `sentido?: Sentido`, que vem preenchido em todo item de `comFluxo`.

- [ ] **Step 1: testes que falham** (`sentido.test.ts`, com uma rede montada no próprio teste):
  - `"cadeia: distância cresce no sentido do fluxo"`: `s:1 → p:1 → p:2 → p:3`, com fluxos positivos. `distInicio` de `t(p:1,p:2)` é igual ao comprimento de `t(s:1,p:1)`, e o de `t(p:2,p:3)` é igual à soma dos dois anteriores (`toBeCloseTo`).
  - `"aresta escrita ao contrário com fluxo negativo"`: a mesma cadeia com `["t:2", "p:2", "p:1", …]` e fluxo `-5`. O `distInicio` de `t:2` é igual ao do caso positivo, e `positivo` vale `false`.
  - `"tempo acumula pela velocidade da faixa"`: `p:1→p:2` normal (uso 0,1) e `p:2→p:3` gargalo (uso 0,95). O `tempoInicio` do segundo é igual a `comprimento₁ / 450`.
  - `"ciclo não trava e vale 0"`: os fluxos `p:1→p:2→p:3→p:1`, sem nenhuma fonte, devolvem `distInicio` e `tempoInicio` 0 nos três.
  - `"linha_at fica fora"`: um fluxo em `at:1` não aparece no mapa, e a subestação continua sendo fonte.
  - `"id fora da rede é ignorado"`: um fluxo com id inexistente não aparece e não lança erro.
  - `"mock de BH: nenhum trecho anda para a origem"`: em `rede.bh.json` com `analise.bh.json`, para todo trecho, `distInicio ≥ 0`, e o `distInicio` de cada trecho filho é ≥ `distInicio + comprimento` do pai, menos 1e-6.

  Em `camadas.test.ts`:
  - `"comFluxo carrega o sentido"`: todo item de `dados.comFluxo` tem `sentido`, e o de `t:3` tem `positivo === false`.
- [ ] **Step 2:** rode `npm --prefix front test`. Esperado: FAIL (o módulo não existe).
- [ ] **Step 3: implemente `sentidoDoFluxo`.**
  - Monte o grafo dirigido só com as arestas `trecho` e `chave` que têm fluxo, orientadas pelo sinal.
  - Faça uma ordem topológica de Kahn a partir dos pontos sem fluxo entrando, com `dist(fonte) = 0` e `dist(filho) = min(dist(filho), dist(pai) + comprimento)` (o `tempo` vai junto, pelo mesmo pai escolhido). Use a fila com índice, como no `gerarAnalise`.
  - Pontos que sobrarem ficam com `dist = 0`.
  - No `prepararDados`, chame a função quando `analise` não for nula e preencha `sentido` nos trechos com fluxo.
- [ ] **Step 4:** rode `npm --prefix front test`. Esperado: PASS.
- [ ] **Step 5:** rode `git commit -m "feat: sentido do fluxo por trecho"` com os arquivos acima.

### Task 3: Ondas no shader

**Files:**
- Create: `front/src/mapa/onda.ts`
- Modify: `front/src/mapa/camadas.ts` (`montarCamadas` ganha `quadro` e a camada `ondas`)
- Test: `front/src/mapa/onda.test.ts`, `front/src/mapa/camadas.test.ts`

**Interfaces:**
- Consumes: `Caminho.sentido` (Task 2).
- Produces:
  ```ts
  export const ONDA = { VEL: [450, 750, 1100], FORCA: [0.35, 0.7, 1], PERIODO: 3, LARG: 0.1 } as const;   // criado na Task 2
  export function brilhoDaOnda(chegada: number, faixa: Faixa, t: number): number   // chegada em s desde a origem
  export const GLSL_ONDA: string            // as constantes acima em GLSL + a função equivalente
  export class ExtensaoOnda extends LayerExtension { … }
  export interface Quadro { tempo: number; zoom: number; limites: [number, number, number, number] } // oeste, sul, leste, norte
  export function montarCamadas(d: Dados, visiveis: Visiveis, tema: Tema, quadro?: Quadro | null): Layer[]
  ```

- [ ] **Step 1: testes que falham.** Em `onda.test.ts`:
  - `"fora da janela é 0"`: `brilhoDaOnda(0.5 * 3, "normal", 0)` vale `0`.
  - `"pico vale a força da faixa"`: `brilhoDaOnda(0.05 * 3, f, 0)` é `toBeCloseTo(ONDA.FORCA[i])` para as três faixas.
  - `"a onda anda para longe da origem"`: o pico em `t = 1` fica em `chegada = 0.05 * 3 + 1`.
  - `"onda contínua na troca de faixa"`: na junção de um trecho normal com um gargalo (o `tempoInicio` do segundo = o fim do primeiro), a fase é a mesma dos dois lados em qualquer `t`.
  - `"GLSL usa as mesmas constantes"`: `GLSL_ONDA` contém `3.0`, `0.1` e cada valor de `VEL` e de `FORCA`.

  Em `camadas.test.ts`:
  - O teste de ordem continua com 8 ids quando `quadro` é `null`.
  - `"com quadro, ondas logo acima dos trechos"`: `montarCamadas(dados, VISIVEIS_INICIAL, "claro", Q)` põe `"ondas"` logo depois de `"trechos"`, com `props.data === dados.comFluxo` e `props.tempo === Q.tempo`.
  - `"ondas: mistura aditiva só no escuro"`: no escuro, `props.parameters.blendColorDstFactor === "one"`; no claro, `parameters` não tem esse fator. Os `updateTriggers` das ondas mudam com o tema.
  - `"sem análise não há ondas"`: com `prepararDados(rede, null)` e `quadro`, `ondas.props.data` tem tamanho 0.
- [ ] **Step 2:** rode `npm --prefix front test`. Esperado: FAIL.
- [ ] **Step 3: implemente.**
  - `brilhoDaOnda`: `p = frac((chegada − t)/PERIODO)`; `p < LARG ? sin(π·p/LARG)·FORCA[faixa] : 0`.
  - `GLSL_ONDA`, gerada a partir de `ONDA`, para não divergir.
  - `ExtensaoOnda` para `PathLayer`, seguindo o padrão do `PathStyleExtension` 9.4.1:
    - atributos por trecho via `this.getAttributeManager().addInstanced` (os métodos da extensão rodam com `this` = a camada; o `AttributeManager` replica o valor pelos `startIndices` do `PathLayer`): `instanceTempoInicio`, `instanceComprimento`, `instanceSentido` (1 ou −1) e `instanceFaixa` (0, 1 ou 2), com os acessores `getTempoInicio`, `getComprimento`, `getSentido` e `getFaixa`. Eles vão do vertex para o fragment por **varyings** (`vs:#decl`/`vs:#main-end`, `fs:#decl`);
    - um shader module `onda` com bloco de uniforms (`uniformTypes: { tempo: "f32" }`), atualizado no `draw` da extensão com `this.setShaderModuleProps({ onda: { tempo: this.props.tempo } })`;
    - no `fs:DECKGL_FILTER_COLOR`: `q = vPathLength > 0 ? geometry.uv.y / vPathLength : 0`, invertido (`1 − q`) quando o sentido é −1; `chegada = tempoInicio + comprimento·q / VEL[faixa]`; `b = brilho(chegada)`; saída `vec4(corDaFaixa·b, b)` (pré-multiplicada, por causa da mistura aditiva no escuro).
  - Camada `ondas`: `PathLayer` sobre `d.comFluxo`, cor da `PALETA[tema]`, largura 2 px (`widthUnits: "pixels"`), `visible: visiveis.distribuicao`, inserida só quando `quadro` não é nulo.
  - **Saída de emergência:** se o shader não compilar ou não animar depois de uma tentativa honesta de depuração (`superpowers:systematic-debugging`), troque a extensão por cor calculada na CPU por trecho, com `brilhoDaOnda` no ponto médio e `updateTriggers.getColor: quadro.tempo`. Registre como `Ruling:`.
- [ ] **Step 4:** rode `npm --prefix front test` (esperado: PASS) e `npm --prefix front run build` (esperado: sem erro de tipo).
- [ ] **Step 5: prova no renderer** (os testes em node não veem o shader). Ligue a camada provisoriamente com `tempo` fixo, no mock pequeno (`?url` do `analise.json`), e tire dois prints em `tempo` 0 e 1,5. O pulso tem que mudar de lugar e correr no sentido certo no `t:3` (negativo) e no `t:1` (positivo). No escuro, um trecho fora da janela fica idêntico à T18. O console fica sem erro de shader.
- [ ] **Step 6:** rode `git commit -m "feat: ondas do fluxo no shader"`.

### Task 4: Raio de perto

**Files:**
- Create: `front/src/mapa/raio.ts`
- Modify: `front/src/mapa/camadas.ts` (camadas `raio` e `faiscas`)
- Test: `front/src/mapa/raio.test.ts`, `front/src/mapa/camadas.test.ts`

**Interfaces:**
- Consumes: `Quadro`, `Caminho` com `faixa` e `sentido`, `ONDA.VEL`.
- Produces:
  ```ts
  export const RAIO = { ZOOM: 14, MAX: 500, PASSO_PX: 6, MAX_PONTOS: 60, FIOS: [1, 2, 3], AMP_PX: [2.5, 3.5, 5], FAISCA: [0, 0.04, 0.18] } as const;
  export function ruido(k: number, fase: number, desloc: number): number            // em [-1, 1]
  export function tremer(a: LonLat, b: LonLat, ampPx: number, zoom: number, fase: number, desloc: number): LonLat[]
  export function escolherRaio(comFluxo: Caminho[], quadro: Quadro): Caminho[]
  export function montarRaio(sel: Caminho[], quadro: Quadro, aleatorio?: () => number): { fios: Caminho[]; faiscas: Caminho[] }
  ```
  A escala de pixels é a do MapLibre: o mundo tem `512 · 2^zoom` px. Projete as pontas em Web Mercator de verdade (fórmula nas Global Constraints), trema em px e volte para lon/lat.

- [ ] **Step 1: testes que falham** (`raio.test.ts`):
  - `"ruido fica em [-1, 1]"`, para 1.000 valores de `k` e `fase`.
  - `"tremer prende as pontas"`: o primeiro e o último ponto são iguais a `a` e `b`.
  - `"tremer respeita a amplitude"`: projetados de volta em px, nenhum ponto se afasta da reta mais que `ampPx` (tolerância de 1%), num trecho horizontal e num diagonal.
  - `"tremer adensa a cada 6 px e para em 60"`: um trecho de 120 px dá 21 pontos, e um de 1.000 px dá 61.
  - `"trecho de comprimento zero não gera NaN"`: `tremer(a, a, …)` devolve `[a, a]`.
  - `"escolherRaio: nada abaixo do zoom 14"`.
  - `"escolherRaio: só visíveis, gargalo primeiro, teto 500"`: com 600 trechos visíveis de faixas misturadas, devolve 500, com todos os gargalos dentro. Um trecho fora dos `limites` fica de fora, e um com menos de 6 px também.
  - `"montarRaio: fios por faixa e faísca pela chance"`: com `aleatorio = () => 0`, um gargalo dá 3 fios e 1 faísca de 3 riscos; com `aleatorio = () => 0.99`, nenhuma faísca. Um normal dá 1 fio e nunca faísca.
  - `"fio de fluxo negativo corre de para → de"`: o caminho do fio começa em `path[1]`.

  Em `camadas.test.ts`:
  - `"com quadro de perto, raio e faíscas acima das ondas"`: a ordem fica `…"trechos", "ondas", "raio", "faiscas", "linhas-at"…`.
- [ ] **Step 2:** rode `npm --prefix front test`. Esperado: FAIL.
- [ ] **Step 3: implemente.**
  - Porte `ruido` e `tremer` de `docs/design/prototipo/eletrico.js`: metade ondulação suave e metade estalo, com taper senoidal nas pontas.
  - Use `fase = floor(tempo·24)` e `desloc = tempo·VEL[faixa]/25`.
  - Camadas `raio` e `faiscas`: `PathLayer` de 1 px, na cor da faixa, com alfa 153 (fio) e 230 (faísca).
- [ ] **Step 4:** rode `npm --prefix front test`. Esperado: PASS.
- [ ] **Step 5:** rode `git commit -m "feat: raio do fluxo de perto"`.

### Task 5: Laço de animação e botão de desligar

**Files:**
- Create: `front/src/mapa/CamadasDeck.tsx` (sai do `App.tsx`)
- Modify: `front/src/App.tsx` e `front/src/tela/Controles.tsx`
- Create: `front/src/mapa/animacao.ts` (lógica pura, sem `matchMedia` nem `window` no topo do módulo)
- Test: `front/src/mapa/animacao.test.ts`

**Interfaces:**
- Consumes: `montarCamadas(d, visiveis, tema, quadro)` e `Quadro`.
- Produces:
  - `CamadasDeck({ dados, visiveis, tema, animando })`, dentro do `<Map>`. Ele usa `useMap().current` para ler zoom e limites a cada `requestAnimationFrame` e monta as camadas. Com `animando === false`, passa `quadro = null` e não agenda quadros.
  - Em `animacao.ts`: `animacaoInicial(reduzir: boolean): boolean` (devolve `!reduzir`) e `criarLaco(agendar: (cb: (agora: number) => void) => number, cancelar: (id: number) => void, aoQuadro: (agora: number) => void): { parar(): void }`. O `CamadasDeck` usa o `criarLaco` com `requestAnimationFrame`.
  - O hook `useAnimacao(): [boolean, () => void]` no `App` segue `matchMedia("(prefers-reduced-motion: reduce)")` como o `useTema`: a mudança da preferência reescreve o estado.
  - `Controles` ganha as props `animando: boolean; aoAlternarAnimacao: () => void`.

- [ ] **Step 1: testes que falham** (`animacao.test.ts`, com `agendar`/`cancelar` falsos):
  - `"reduced-motion começa desligado"`: `animacaoInicial(true)` vale `false`, e `animacaoInicial(false)` vale `true`.
  - `"o laço agenda o próximo quadro"`: depois de 3 quadros disparados, `aoQuadro` foi chamado 3 vezes.
  - `"parar cancela e ignora o quadro pendente"`: `parar()` chama `cancelar` com o último id; um callback antigo disparado depois não chama `aoQuadro` nem agenda outro.
- [ ] **Step 2:** rode `npm --prefix front test`. Esperado: FAIL.
- [ ] **Step 3: implemente.**
  - Mova `CamadasDeck` e a chamada de `montarCamadas` do `App` para `CamadasDeck.tsx`. O `App` passa `dados`, `visiveis`, `tema` e `animando`.
  - O `tempo` do quadro é `performance.now() / 1000`.
  - No `Controles`, o botão fica entre o tema e as camadas: `className="controle"`, `aria-pressed={animando}`, `aria-label={animando ? "Pausar animação" : "Animar fluxo"}`, com o ícone do raio (o traço do logo da Task 6; até lá, a polyline `75,20 25,50 75,50 25,80` num viewBox 100).
- [ ] **Step 4:** rode `npm --prefix front test` e `npm --prefix front run build`. Esperado: PASS e build sem erro.
- [ ] **Step 5:** rode `git commit -m "feat: laço da animação e botão de pausar"`.

### Task 6: Logo 4b

**Files:**
- Create: `front/src/tela/Logo.tsx`
- Modify: `front/src/tela/Barra.tsx` (o selo "RE"), `front/src/tela/Controles.tsx` (o ícone do botão) e `front/public/favicon.svg` (troca o raio padrão do Vite)

**Interfaces:**
- Produces: `Logo({ className?: string })`, um `<svg viewBox="0 0 100 100" aria-hidden="true">` com o SVG do spec (seção 🎨) em `currentColor`. O favicon é o mesmo SVG com `#1351b4` no lugar de `currentColor`.

- [ ] **Step 1:**
  - Crie o `Logo.tsx` com o SVG exato do spec.
  - No `Barra.tsx`, troque `RE` por `<Logo />` dentro do `.selo` (24 px; o tamanho vai no `tela.css`).
  - No `Controles.tsx`, use só o traço do raio no botão.
  - Reescreva o `favicon.svg`.
- [ ] **Step 2:** rode `npm --prefix front run build`. Esperado: sem erro. A conferência visual fica na Task 7.
- [ ] **Step 3:** rode `git commit -m "feat: logo do remg no selo e no favicon"`.

### Task 7: Verificação na tela, FPS e documentos

**Files:**
- Modify: `docs/design/tokens.md` (nova seção da T19: valores da onda e do raio, e o FPS medido)
- Modify: `docs/superpowers/specs/2026-11-21-t19-animacao-do-fluxo-design.md` (nota do zoom 14 e da escala de 512 px)

- [ ] **Step 1:** rode `npm --prefix front run dev` com `VITE_USAR_MOCK=true` (`preview_start`) e confira nos dois temas:
  - as ondas saem das subestações na cidade inteira;
  - com zoom ≥ 14, o raio e as faíscas aparecem;
  - o botão pausa e retoma;
  - com reduced-motion emulado, nada se mexe, e ao desligar a emulação com a página aberta a animação volta;
  - o selo e o favicon mostram o logo;
  - o console fica sem erros de shader.
- [ ] **Step 2:** meça o FPS como na T18: um contador de `requestAnimationFrame` durante arrastes, BH inteira, janela 800×522, animação ligada. Anote o número real. Abaixo de 60, investigue antes de seguir (`superpowers:systematic-debugging`).
- [ ] **Step 3:** escreva a seção da T19 no `tokens.md` e a nota do zoom no spec.
- [ ] **Step 4:** rode `npm --prefix front test`, `npm --prefix front run build` e `python tools/verificar/verificar.py`. Esperado: todos verdes e `❌ 0 bloqueio(s)`.
- [ ] **Step 5:** rode `git commit -m "docs: tokens e fps da t19"`.
