# Console no topo e visual material: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** trocar a barra lateral de vidro por um console de duas linhas no topo, com superfícies opacas (material), cartão de contexto e logo com o M em raio.

**Architecture:**
- O App monta uma coluna fixa `.topo` com o console, os avisos, o cartão de contexto e a legenda.
- O `Barra.tsx` vira `Console.tsx`, só com o cabeçalho.
- O conteúdo que depende do modo vai para o `Contexto.tsx`.
- O Religar se divide em botão e resultado.
- O CSS troca `.vidro` por `.superficie`.

**Tech Stack:** React 19 + TS, CSS puro com tokens, vitest com `renderToStaticMarkup`.

**Spec:** [`docs/superpowers/specs/2026-11-21-console-material-design.md`](../specs/2026-11-21-console-material-design.md)

## Global Constraints

**Do projeto:**
- Commits `tipo: descrição` em português, sem corpo, sem coautoria de IA. Só `feat/fix/test/docs/refactor/chore`.
- Contrato 06 e mocks intocados. O README não é editado (o "Na tela" é do Lucas).
- CSS só com tokens de `src/estilo/tokens.css`. Arquivos em CRLF continuam em CRLF.

**Do design:**
- Cantos de 8 px (`--raio-md`), sombra `--sombra`, cores do gov.br de hoje.
- Ponto de quebra do celular: `max-width: 639px`.
- Nenhum `vidro`, `grao` ou `backdrop-filter` no `front/src` ao fim.

## Review Focus

1. **Cartão vazio:** com o modo Observar, sem falhas, sem seleção e fora do mock, o cartão de contexto não pode aparecer como uma caixa vazia.
2. **Leitor de tela:** os `role="status"` (Calculando e o resultado do Religar) continuam montados antes da mudança, para o leitor de tela anunciar.
3. **Clique no mapa:** a `.topo` não pode engolir o clique do mapa (`pointer-events`), principalmente no vão entre o cartão e a legenda.
4. **Celular, 375 px:**
   - a linha de comando cabe sem rolagem horizontal;
   - o cartão no pé não cobre o zoom.
5. **Painel de camadas:**
   - abre abaixo do botão e dentro da tela em 1024 px;
   - o Esc e o clique fora continuam fechando, como hoje no `Controles`.

---

### Task 1: Superfície material no lugar do vidro

**Files:**
- Modify: `front/src/estilo/tokens.css`, `front/src/index.css`, `front/src/tela/tela.css`, `front/src/App.tsx`, `front/src/tela/Barra.tsx`, `front/src/tela/Controles.tsx`, `front/src/tela/Legenda.tsx`

**Interfaces:**
- Produces: a classe `.superficie` e os tokens `--superficie`, `--superficie-borda`, `--sombra` e `--bloco-hover`, com os valores da tabela do design.

- [ ] **Step 1:** Em `tokens.css`, tirar `--vidro*`, `--vidro-contorno` e `--grao` dos dois temas e pôr os 4 tokens novos com os valores do design. `--barra-largura` sai na Task 4, junto com o layout.
- [ ] **Step 2:** Em `index.css`:
  - trocar `.vidro` e `.vidro::before` por `.superficie`, com `position: fixed; z-index: 1; box-sizing: border-box; border: 1px solid var(--superficie-borda); border-radius: var(--raio-md); background: var(--superficie); box-shadow: var(--sombra)`;
  - no comentário, dizer que é a superfície material.
- [ ] **Step 3:** Fazer as trocas restantes:
  - `className="vidro …"` → `"superficie …"` nos 5 arquivos;
  - em `tela.css`, `var(--vidro-forte)` → `var(--superficie)` nos fundos (`.controles`, `.painel`) e → `var(--bloco-hover)` nos hovers (`.segmentos button:hover`, `.falhas-tirar:hover`);
  - a legenda deixa `--raio-pilula` e passa a `--raio-md`.
- [ ] **Step 4:** Rodar `grep -rnE "vidro|--grao|backdrop" front/src`. Expected: nenhuma linha.
- [ ] **Step 5:** Rodar `npm --prefix front test` e `npm --prefix front run build`. Expected: 162/162 e build sem erro.
- [ ] **Step 6:** `git commit -m "feat: superfície material no lugar do vidro com grão"`

### Task 2: Logo com o M em raio

**Files:**
- Modify: `front/src/tela/Logo.tsx`, `front/public/favicon.svg`
- Test: `front/src/tela/Logo.test.tsx`

**Interfaces:**
- Produces: `Logo()` → `<span className="logo" role="img" aria-label="REMG · Rede de Energia de Minas Gerais">`, com `<span className="logo-letra">RE</span>`, o `<svg className="logo-m">` e `<span className="logo-letra">G</span>`.
  - O SVG usa `viewBox="56 0 44 40"` e a polilinha `58,36 66,6 78,28 90,6 98,36` (`stroke-width` 5), com círculos de r 4,5 em (58,36) e (98,36), tudo em `currentColor`.

- [ ] **Step 1: Teste**
  - `Logo.test.tsx`, teste "a logo se lê como REMG": o HTML tem `aria-label="REMG · Rede de Energia de Minas Gerais"`, `>RE<`, `>G<` e `points="58,36 66,6 78,28 90,6 98,36"`.
- [ ] **Step 2:** Rodar `npm --prefix front test -- Logo`. Expected: FAIL, porque o aria-label não existe.
- [ ] **Step 3:** Reescrever o `Logo.tsx` pela interface. O favicon passa a ser o mesmo M em `#1351b4`, com `viewBox="54 0 48 44"`.
- [ ] **Step 4:** Rodar `npm --prefix front test -- Logo`. Expected: PASS.
- [ ] **Step 5:** `git commit -m "feat: logo do REMG com o M em raio"`. O CSS de `.logo` entra na Task 4 junto com o console; até lá a `Barra` segue usando o `selo` antigo, sem quebrar o build.

### Task 3: Religar dividido em botão e resultado

**Files:**
- Modify: `front/src/tela/Religamento.tsx`, `front/src/tela/Religamento.test.tsx`

**Interfaces:**
- Produces:
  - `dicaDoReligar(p: { usandoMock: boolean; temFalhas: boolean; temSemLuz: boolean; calculando: boolean; temResultado: boolean }): string | null`, com a mesma regra da `dica` de hoje.
  - `AcharRota({ rota, dica, calculando, aoAcharRota })`: um `<button className="botao-primario">` com o mesmo texto por fase e `disabled={dica !== null || calculando}`.
  - `Religamento({ rota, faltando, dica })`: a `<section className="religamento">` com a dica (quando houver) e o `<div role="status">` de hoje, sem o botão.

- [ ] **Step 1: Testes em `Religamento.test.tsx`**
  - "a dica segue a ordem mock → sem falhas → sem ponto sem luz":
    - com `usandoMock`, "O Religar precisa do servidor.";
    - sem falhas, "Derrube algo no modo Derrubar primeiro.";
    - sem ponto sem luz e sem resultado, "Nenhum ponto sem luz para religar.";
    - sem ponto sem luz e com resultado, `""`;
    - com ponto sem luz, `null`;
    - sem ponto sem luz e com `calculando`, `null`.
  - "o botão fica desligado com dica": o HTML de `AcharRota` com `dica: ""` tem `disabled`; com `dica: null` não tem.
  - O teste de status de hoje continua, renderizando `<Religamento rota faltando dica={null} />`.
- [ ] **Step 2:** Rodar `npm --prefix front test -- Religamento`. Expected: FAIL, porque `dicaDoReligar` não é exportada.
- [ ] **Step 3:** Dividir o componente pela interface. No `App.tsx`, por ora, renderizar `<AcharRota/>` e `<Religamento/>` juntos onde hoje está o `<Religamento/>`, com a `dica` calculada uma vez.
- [ ] **Step 4:** Rodar `npm --prefix front test`. Expected: tudo verde.
- [ ] **Step 5:** `git commit -m "refactor: religar separa o botão do resultado"`

### Task 4: Console no topo e cartão de contexto

**Files:**
- Create: `front/src/tela/Console.tsx` (vindo de `git mv front/src/tela/Barra.tsx`), `front/src/tela/Contexto.tsx`
- Modify: `front/src/tela/Controles.tsx`, `front/src/App.tsx`, `front/src/tela/tela.css`, `front/src/estilo/tokens.css`
- Test: `front/src/tela/Console.test.tsx`

**Interfaces:**
- Consumes: `AcharRota`, `Religamento` e `dicaDoReligar` (Task 3), `Logo` (Task 2), `.superficie` (Task 1).
- Produces:
  - `Console({ area, analise, faltando, calculando, modo, aoMudarModo, acao?: ReactNode, ferramentas?: ReactNode })`:
    - um `<header className="superficie console" aria-label="Resumo da rede">`;
    - grid com as áreas `marca modos . acao ferramentas` / `cidade cidade . numeros numeros`;
    - a linha da cidade de hoje (com o `role="status"` do Calculando) e os 4 números de hoje num `<dl className="numeros">`.
  - `Falhas({ falhas, aoRestaurar })`: a seção de falhas de hoje, sem o "Restaurar tudo". Vive no `Console.tsx`.
  - `Contexto({ children })`: devolve `null` quando `Children.toArray(children)` está vazio; senão, `<aside className="superficie contexto" aria-label="Detalhes">`.
  - `Controles` passa a ter só zoom e norte. `Ferramentas({ visiveis, aoMudar, temChaves, tema, aoTrocarTema, animando, aoAlternarAnimacao, intensidade, aoMudarIntensidade })` leva o tema, as camadas e o painel, com o Esc e o clique fora de hoje. O painel ganha `position: absolute; top: calc(100% + var(--espaco-2)); right: 0`, relativo a `.ferramentas`.

- [ ] **Step 1: Testes em `Console.test.tsx`**
  - "a ação do modo fica no console": o `Console` com `acao={<button>Achar rota</button>}` contém `Achar rota` dentro de `<header`.
  - "o cartão de contexto vazio não aparece": `renderToStaticMarkup(<Contexto>{false}{null}</Contexto>)` dá `""`; com `<p>x</p>`, contém `aria-label="Detalhes"`.
  - "a falha sai pelo X e o Restaurar tudo não mora mais na lista": `Falhas` com 1 falha tem `Restaurar Subestação X` e não tem `Restaurar tudo`.
- [ ] **Step 2:** Rodar `npm --prefix front test -- Console`. Expected: FAIL, porque o módulo não existe.
- [ ] **Step 3:** Fazer `git mv` da `Barra` para o `Console` e mudar pela interface. Depois, separar `Ferramentas` de `Controles`.
- [ ] **Step 4: Montar o App** (troca `.barra` por `.topo`):
  ```
  <div className="topo">
    <Console … acao={modo === "religar" ? <AcharRota …/> : modo === "derrubar" && falhas.length ? <button className="botao-texto">Restaurar tudo</button> : null}
      ferramentas={<Ferramentas …/>} />
    {avisos}
    <Contexto>
      {dica do modo}
      {modo === "religar" && <Religamento …/>}
      {falhas.length > 0 && <Falhas …/>}
      {Selecionado}
      {nota do mock}
    </Contexto>
    <Legenda …/>
  </div>
  <Controles …/>
  ```
  A dica do Derrubar sem falhas ("Clique num trecho…") é a dica do modo.
- [ ] **Step 5: CSS em `tela.css`**
  - `.topo`: `position: fixed; inset: var(--margem); display: flex; flex-direction: column; align-items: flex-start; gap: var(--espaco-2); pointer-events: none; z-index: 1`. Os filhos diretos têm `pointer-events: auto`; o `.superficie` dentro da `.topo` fica `position: relative`.
  - `.console`: `align-self: stretch`.
  - `.contexto`: `width: min(340px, 100%); max-height: …; overflow-y: auto`.
  - `.legenda`: `margin-top: auto`.
  - `.aviso`: `align-self: center`.
  - `.controles`: `bottom: calc(var(--margem) + 24px); right: var(--margem)`.
  - Tirar `.barra`, `.marca`, `.selo` e `.blocos` e o `--barra-largura` do `tokens.css`.
  - Estilizar `.logo`, com as letras a 20 px/800 e o `.logo-m` a `0.72em` em `--primario`.
- [ ] **Step 6:** Rodar `npm --prefix front test` e `npm --prefix front run build`. Expected: verde e sem erro de tipo.
- [ ] **Step 7:** No navegador (preview `front` com o servidor), a 1440 px e a 1024 px:
  - o console não quebra a linha;
  - o painel de camadas abre no lugar;
  - o clique no mapa funciona no vão.
- [ ] **Step 8:** `git commit -m "feat: console no topo e cartão de contexto no lugar da barra lateral"`

### Task 5: Celular

**Files:**
- Modify: `front/src/tela/tela.css`

- [ ] **Step 1:** Em `@media (max-width: 639px)`:
  - `.logo-letra { display: none }`;
  - segmentos com `font-size: 13px` e `padding` menor;
  - o grid do console passa a `marca modos ferramentas` / `cidade cidade cidade` / `acao acao acao`, com o `.numeros` escondido;
  - `.contexto { margin-top: auto; width: 100%; max-height: 40dvh }`, com a `.legenda` logo depois;
  - a `.legenda` com `max-width: calc(100% - 56px)`, para não cobrir o zoom.
- [ ] **Step 2:** No navegador a 375 px (resize_window mobile), conferir os quatro pontos:
  - sem rolagem horizontal (`document.documentElement.scrollWidth <= 375`);
  - linha de comando numa linha só;
  - "Achar rota" na terceira linha;
  - cartão no pé sem cobrir o zoom.
- [ ] **Step 3:** `git commit -m "feat: console e cartão de contexto no celular"`

### Task 6: Docs da tela

**Files:**
- Modify: `docs/spec/07-frontend.md` (desenho "A tela" e o parágrafo "🎨 Design"), `docs/design/tokens.md` (seção 🏛️ gov.br: o vidro com grão vira a superfície material, com a tabela dos tokens novos)

- [ ] **Step 1:** Fazer as mudanças:
  - redesenhar o ASCII da tela com o console de duas linhas, o cartão de contexto, a legenda e o zoom;
  - no "🎨 Design", trocar "barra lateral de vidro com grão" por "console no topo com superfície material (T21)";
  - na tabela do tokens.md, trocar Vidro, Borda e Grão por Superfície, Borda e Sombra;
  - apagar a frase do `blur` e marcar ✅ decidido pelo Lucas em 21/11.
- [ ] **Step 2:** `git commit -m "docs: console no topo e visual material na spec 07 e nos tokens"`

### Task 7: Verificação final

- [ ] **Step 1:** Rodar `npm --prefix front test`, `npm --prefix front run lint` e `npm --prefix front run build`. Expected: tudo verde.
- [ ] **Step 2:** Rodar `grep -rnE "vidro|--grao|backdrop" front/src`. Expected: vazio.
- [ ] **Step 3:** No navegador com o servidor, a 1440, 1024 e 375 px, em claro e em escuro:
  - derrubar `s:173217432` → Religar → "Achar rota";
  - o Selecionado no Observar;
  - console sem erros.
- [ ] **Step 4:** Rodar o `impeccable detect` na URL e nos arquivos. Expected: `[]`.
- [ ] **Step 5:** Rodar `python tools/verificar/verificar.py`. Expected: 0 bloqueios.
