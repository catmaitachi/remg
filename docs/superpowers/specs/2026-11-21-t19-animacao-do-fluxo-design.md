# T19 · 🎞️ Animação do fluxo: design

✅ decidido com o Lucas em 21/11/2026 (brainstorm com prévias no visual companion). Issue #15, depende da T18 (#14, PR #39).

## 🎯 Intenção

A energia tem que **andar** na tela. Hoje (T18) o mapa mostra o uso de cada trecho em cor e brilho, mas está parado. A T19 faz o fluxo correr **no sentido certo**, saindo das subestações, mais rápido e mais forte onde passa mais. De perto, entra o efeito elétrico (raio) do protótipo, suavizado para a rede densa. É a feature principal do trabalho: é o que a banca vê primeiro.

Junto, o REMG ganha o logo (selo da barra e favicon).

## ✅ Metas

1. Ondas de luz saindo das subestações e correndo pela cidade inteira, no sentido do fluxo, em todo zoom.
2. De perto (zoom ≥ 15), o raio por cima das ondas: fios tremendo e faíscas no gargalo.
3. O sentido vem da API: o fluxo passa a ter sinal (contrato muda junto com mocks e validador).
4. A pessoa pode desligar a animação. Com `prefers-reduced-motion`, ela começa desligada.
5. FPS medido com BH inteira, arrastando o mapa, anotado na issue e no `tokens.md`.
6. Logo 4b no selo da barra e no favicon.

## 🚫 Não-metas

- Partículas/`TripsLayer` (a issue cita, mas as ondas cumprem o "andar" sem dependência nova).
- Guardar a escolha de ligar/desligar entre visitas.
- Animar a alta tensão (linhas AT): ficam paradas como na T18.
- A fase 4 da skill de logo (vitrine com o Gemini).
- A subseção do README **🎞️ Como a animação funciona**: é escrita à mão pelo Lucas (regra 2 do AGENTS.md). O código não toca no README.

## ⛔ Anti-metas (falhou mesmo "funcionando")

- Fio correndo **em direção** à subestação que alimenta o trecho.
- O mapa travando ao arrastar a cidade inteira (abaixo da meta de FPS).
- Raio intenso demais na rede densa (pedido do Lucas na revisão da T18: "suavizado para não ficar intenso demais").
- Movimento com `prefers-reduced-motion` ligado, ou com a animação desligada.

## 📏 O que a medição mostrou

Rede de BH (`rede.bh.json`): 53.230 trechos; o trecho mediano tem **75 m** (p10 18 m, p90 176 m). Em pixels: zoom 12 ≈ 2 px, zoom 13 ≈ 4 px, zoom 15 ≈ 17 px, zoom 16 ≈ 33 px. Por isso o raio por trecho só se lê a partir do zoom 15, e o "andar" na cidade inteira tem que atravessar vários trechos seguidos (ondas pela distância até a subestação).

## 🧭 Caminhos considerados

| | Como | Troca | |
|---|---|---|---|
| A | Onda por trecho: a cada quadro, a CPU calcula 1 brilho por trecho e manda um buffer de cores | Simples, ~2 ms de CPU por quadro; de perto a onda "pula" de trecho em trecho | |
| B | Só o raio do protótipo, a partir do zoom 15 | O mais rápido de fazer; com a cidade inteira nada se mexe (fura a issue) | |
| **C** | **Onda num shader (extensão do `PathLayer`), raio de perto na CPU** | Onda lisa dentro de cada trecho e zero CPU por quadro para as ondas; mais tempo e risco (GLSL) | ✅ escolhido |

O Lucas escolheu a **C** vendo a prévia com os dados reais (`.superpowers/brainstorm/…/raio1-comparar.html`), **com a opção de desativar**. Na cidade inteira A e C ficam iguais (trechos de 1–4 px); a diferença é de perto.

**Saída de emergência:** se o shader travar (não compila, ou o `geometry.uv`/`vPathLength` não se comportar como abaixo), cair para a A: mesma fórmula da onda, um brilho por trecho calculado na CPU. Registrar a troca na issue.

## 🔌 Contrato: sinal do fluxo

Muda `docs/spec/06-api.md`, `front/src/mocks/` e o validador **no mesmo PR** (regra 6):

- `fluxo`: `[id, fluxo kVA, uso de 0 a 1]`. **Fluxo positivo = sentido `de → para` da aresta** (as pontas como estão em `rede.arestas`); **negativo = `para → de`**. Zero não entra na lista.
- `uso` continua de 0 a 1 = `|fluxo| / capacidade`.
- Corrigir o exemplo do 06-api, que hoje traz `["t:678", 0, 0.0]` contra a própria regra.
- `fluxoTotal`, `demandaTotal`, `gargalos`, `semEnergia` não mudam.
- `validarAnalise`: aceita fluxo negativo; rejeita 0, `NaN` e infinito. O teste que conferia `uso ≈ fluxo / capacidade` passa a usar `|fluxo|`.
- Gerador do mock (`front/scripts/mock_de_csv.mjs`, `gerarAnalise`): grava o sinal pela BFS (pai → filho = sentido do fluxo); regenerar `analise.bh.json`. `analise.json` (mock pequeno) ganha ao menos um fluxo negativo.
- A T16 (servidor) vai seguir esta regra; o núcleo não muda nesta task.

## 🌊 As ondas (shader)

**Distância até a subestação.** Função pura no front, a partir da rede e da análise com sinal: monta o grafo dirigido só com as arestas que têm fluxo, no sentido do sinal; as fontes são os pontos sem fluxo entrando (Kahn/BFS); cada aresta recebe `distInicio` = distância, em metros pela rede, do seu ponto de entrada até a fonte, e `comprimento` em metros. Ponto que sobrar num ciclo (fluxo real pode ter) recebe distância 0. Calculada uma vez por análise, junto do `prepararDados`.

✍️ Decisão do Claude: o grafo dirigido usa só `trecho` e `chave`; `linha_at` fica fora (não é animada e, se a T16 mandar fluxo nela, uma subestação "alimentada" pela outra deixaria de ser origem). As fontes saem do próprio fluxo, não de `rede.subestacoes`: no mock de BH a subestação não tem aresta (a raiz é o ponto mais próximo); no mock pequeno ela liga por `trecho` e vira fonte naturalmente, por não ter fluxo entrando.

**Onda.** Para um ponto a `d` metros da subestação, no tempo `t` (s):

```
p = frac((d − VEL[faixa] · t) / LAMBDA)
brilho = p < LARG ? sin(π · p / LARG) · FORCA[faixa] : 0
```

No fragmento, `d = distInicio + comprimento · q`, com `q = uv.y / vPathLength` no fluxo positivo e `q = 1 − uv.y / vPathLength` no negativo (o `path` continua `[de, para]`; inverter o caminho também serve) (uv.y e vPathLength vêm do `PathLayer`; cada trecho é um segmento só, então a fração é direta). O tempo entra como uniform, atualizado por `requestAnimationFrame`.

> ⚠️ Corrigido depois da revisão do Codex (ver as Global Constraints do plano): a fase passa a ser o **tempo de chegada** (`Σ comprimento / VEL`), com `PERIODO` = 3 s no lugar de `LAMBDA`, para a onda não se partir na troca de faixa. O raio entra com zoom ≥ **14** no MapLibre (tiles de 512 px), que é a escala do "zoom 15" da prévia (256 px).

**Valores (os da prévia aprovada, suavizados):**

| | normal | alerta | gargalo |
|---|---|---|---|
| `VEL` (m/s) | 450 | 750 | 1100 |
| `FORCA` | 0,35 | 0,7 | 1 |

`LAMBDA` = 2200 m · `LARG` = 0,1. Cor da onda = cor da faixa (`PALETA`), por cima do trecho. ✍️ Decisão do Claude, igual à prévia: no tema escuro a mistura é aditiva (`ONE, ONE`); no claro é a mistura normal por alfa, porque somar luz sobre o fundo claro some. A prévia foi vista nos dois temas, com o escuro como padrão. Largura da camada de ondas: a do trecho da T18 (2 px) ou levemente maior; ajuste fino é do builder, olhando a tela.

## ⚡ O raio (de perto)

Por **trecho** (um fio preso nas duas pontas de cada trecho, como na prévia aprovada; não se juntam cadeias). Só com zoom ≥ 15, só nos trechos com fluxo **visíveis** na tela, no máximo **500** (gargalo primeiro, depois alerta, depois normal). Lógica portada de `docs/design/prototipo/eletrico.js` para TS puro e testável (`ruido`, `tremer`):

| | normal | alerta | gargalo |
|---|---|---|---|
| fios | 1 | 2 | 3 |
| amplitude (px) | 2,5 | 3,5 | 5 |
| chance de faísca por quadro | 0 | 4% | 18% |

Pontos a cada 6 px (máx. 60 por linha), pontas presas (taper senoidal), estalo trocando 24×/s, ondulação correndo no sentido do fluxo. Fio com 60% de opacidade, 1 px. Faísca: 3 riscos curtos (3–8 px) saindo de um ponto do trecho. Trecho com menos de 6 px na tela não ganha raio. Desenhado numa `PathLayer` cujos dados são recalculados por quadro só para as linhas visíveis.

## 🔘 Desligar

Botão na coluna de controles (à direita), com o ícone do raio e `aria-pressed`, rótulo "Pausar animação"/"Animar fluxo". Desligado: nem ondas nem raio, sobra o brilho parado da T18. Começa **desligado** se `prefers-reduced-motion: reduce`, e segue a mudança dessa preferência como o tema segue o sistema. A escolha não é guardada. ✍️ Decisão do Claude (posição e forma): o Lucas pediu "opção de desativar"; pode mudar para um switch no painel de camadas sem mexer no resto.

Aba escondida: o `requestAnimationFrame` já para sozinho; nada a fazer.

## 🎨 Logo (4b · raio na malha)

Escolhido em duas rodadas com a `logo-generator-skill` (SKILL.md seguido à mão, sem a fase do Gemini). SVG final, `viewBox 0 0 100 100`, `currentColor`:

```svg
<g fill="currentColor" opacity=".35">
  <circle cx="25" cy="20" r="5.5"/><circle cx="50" cy="20" r="5.5"/>
  <circle cx="50" cy="80" r="5.5"/><circle cx="75" cy="80" r="5.5"/>
</g>
<polyline points="75,20 25,50 75,50 25,80" fill="none" stroke="currentColor" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/>
<circle cx="75" cy="20" r="9" fill="currentColor"/>
<circle cx="25" cy="80" r="9" fill="currentColor"/>
```

- Selo da barra (`Barra.tsx`, hoje o texto "RE"): o símbolo em `currentColor` dentro do quadrado 36 px (claro: branco sobre `--primario`; escuro: segue os tokens).
- Favicon: `front/public/favicon.svg` com o símbolo em `#1351b4`.
- O mesmo raio vira o ícone do botão de desligar.

## 🧪 Como provar

- **Contrato:** `validarAnalise` aceita negativo, rejeita 0/`NaN`/infinito; teste de contrato do `analise.bh.json` continua batendo com o gerador.
- **Sentido:** no mock de BH, para todo trecho com fluxo, a ponta de entrada (pelo sinal) está mais perto da subestação que a de saída (`distInicio` cresce na direção do fluxo); nenhum trecho "anda" para a subestação. Teste numa cadeia pequena com uma aresta escrita ao contrário (`para → de`) e fluxo negativo. No `analise.json`, o `t:3` (`p:4→p:5`) hoje contradiz a alimentação por `s:2→p:5`: é o candidato natural ao fluxo negativo.
- **Onda:** função pura `brilho(d, faixa, t)` testada (fora da janela = 0; pico = `FORCA`; anda para longe com o tempo). O shader repete a fórmula.
- **Raio:** `tremer` mantém as pontas presas e respeita a amplitude; seleção de linhas respeita zoom ≥ 15, visibilidade e o teto de 500.
- **Desligar:** com o botão desligado ou reduced-motion, nenhuma camada animada é montada.
- **FPS:** contador de `requestAnimationFrame` durante arrastes, BH inteira, mesma janela da T18 (800×522, dev). Meta **≥ 60 fps**; referência T18: 133,8 fps sem animação. Anotar na issue e no `tokens.md`.

## 🧱 Restrições

- Sem dependência nova (nada de `@deck.gl/geo-layers`); `@deck.gl/core`/`layers` 9.4.1 já instalados.
- Tokens da T18 (`tokens.css`, `PALETA`); visual gov.br sem a marca gov.br.
- Contrato congelado: 06-api + mocks + validador no mesmo PR.
- Não inventar números: o FPS só entra medido.
- Branch: a T19 só começa depois do merge do #39 (`comecar.py 15`).

## 🛠️ Fica com o builder

Divisão em arquivos e nomes; como registrar os atributos por trecho na extensão; largura exata da camada de ondas; ritmo de recálculo do raio (todo quadro ou 30 Hz); ícone exato do botão no estado desligado.
