# Console no topo e visual material: design

**Task:** T21 (#17), polimento final do front · **Branch:** `feat/17-front-modo-religar-e-painel-de-resultado`

## Por quê

Uma tela mais limpa para a entrega (22/11). A barra lateral de vidro ocupa um quarto da tela e, no celular, cobre o mapa. O vidro com grão vira ruído sobre a malha densa.

## Decidido pelo Lucas (21/11)

- ✅ **Sem vidro e sem granulado:** visual material, com superfícies opacas, sombra curta e cantos de 8 px. As cores do gov.br continuam.
- ✅ **A barra lateral vira um console no topo**, de duas linhas (opção C):
  - linha de comando: logo, modos, a ação do modo e as ferramentas;
  - linha de leitura: a cidade e os números.
- ✅ **Logo 1:** "REMG" com o M desenhado como o raio na malha (polilinha com os nós nas pontas).
- ✅ **O resto do layout:**
  - cartão de contexto à esquerda, abaixo do console, só quando tem conteúdo;
  - painel de camadas abaixo do botão;
  - zoom e norte no canto de baixo, à direita;
  - legenda no pé, à esquerda;
  - avisos abaixo do console.

## Objetivos

1. Tirar todo o `.vidro`: `backdrop-filter`, `::before` com ruído, `--vidro*` e `--grao`.
2. Montar o console de duas linhas e o cartão de contexto, sem perder nada do que a barra mostra hoje.
3. Fazer a logo nova e trocar o favicon pelo M.
4. Funcionar em 375 px, em claro e em escuro.
5. Atualizar a spec 07 e o `docs/design/tokens.md`.

## Fora

- Mudar dados, contrato 06, mocks ou o comportamento dos modos.
- O README ("Na tela" é escrito à mão pelo Lucas).

## Anti-objetivos

- O console cobrir o mapa mais do que a barra lateral cobria.
- Mostrar a mesma ação ou o mesmo número em dois lugares.
- Um texto que mude de lugar entre os temas.

## Abordagens

| | Como | Troca |
|---|---|---|
| A | Faixa inteira de uma linha | Cabe mais sem clique, mas aperta no celular |
| B | Ilha central com gaveta | Mais limpa, mas um clique a mais para os números |
| ✅ **C** | **Console de duas linhas** | Escolha do Lucas: lê como sala de controle e ocupa duas linhas o tempo todo |

## Design

### Superfície (tokens)

`.vidro` vira `.superficie`: opaca, com borda de 1 px, cantos de 8 px (`--raio-md`) e sombra curta.

| Token novo | ☀️ Claro | 🌙 Escuro |
|---|---|---|
| `--superficie` | `#ffffff` | `#071d41` |
| `--superficie-borda` | `rgb(7 29 65 / .12)` | `rgb(255 255 255 / .14)` |
| `--sombra` | `0 1px 2px rgb(7 29 65 / .12), 0 2px 8px rgb(7 29 65 / .10)` | `0 1px 2px rgb(0 0 0 / .5), 0 2px 8px rgb(0 0 0 / .35)` |
| `--bloco-hover` (no lugar de `--vidro-forte` nos hovers) | `rgb(19 81 180 / .12)` | `rgb(255 255 255 / .12)` |

- Saem `--vidro`, `--vidro-forte`, `--vidro-borda`, `--vidro-sombra`, `--vidro-brilho`, `--vidro-contorno`, `--grao` e `--barra-largura`.

### Montagem (App)

- Uma coluna `.topo` fixa a 12 px das bordas, com `pointer-events: none` (os filhos voltam a `auto`), nesta ordem:
  1. console;
  2. avisos;
  3. cartão de contexto;
  4. legenda, com `margin-top: auto` para descer ao pé.
- Assim o cartão fica abaixo do console sem medir a altura dele.
- Zoom e norte ficam fora da coluna, no canto de baixo à direita, acima da atribuição do mapa.

### Console (`tela/Console.tsx`, substitui `Barra.tsx`)

`<header class="superficie console">` em grid com duas linhas:

- **Comando:**
  - a logo;
  - os modos (`segmentos`);
  - um espaço;
  - a **ação do modo**: no Religar, "Achar rota"; no Derrubar com falhas, "Restaurar tudo"; no Observar, nenhuma;
  - as **ferramentas**: tema e camadas, com o painel de camadas abrindo embaixo, alinhado à direita.
- **Leitura:**
  - à esquerda: a área, a %, o trilho, a frase da cidade e o "Calculando…";
  - à direita: os 4 números de hoje (Energia entregue, Demanda, Gargalos, Tempo de cálculo) em pares rótulo-valor.

### Cartão de contexto (`tela/Contexto.tsx`)

- É um `<aside class="superficie contexto">` que só aparece quando algum filho existe (`Children.toArray`).
- O conteúdo, na ordem de hoje:
  - a dica do modo;
  - o resultado do Religar;
  - a lista de falhas, sem o botão "Restaurar tudo", que subiu para o console;
  - o Selecionado;
  - a nota dos dados de exemplo.
- Largura `min(340px, 100%)` e rolagem própria.

### Religar dividido

- `dicaDoReligar(...)`: função pura com a regra da dica de hoje.
- `AcharRota`: o botão, que vai para o console.
- `Religamento`: a dica e o resultado, que vão para o cartão. O `role="status"` continua sempre montado.

### Logo (`tela/Logo.tsx`)

- `RE` e `G` em texto, com a fonte da tela. O `M` é uma polilinha `58,36 66,6 78,28 90,6 98,36` com nós nas duas pontas, na cor primária e da altura das maiúsculas.
- Nome acessível: "REMG · Rede de Energia de Minas Gerais".
- O favicon passa a ser só o M.

### Celular (< 640 px)

- Da logo fica só o M.
- Os modos ficam compactos, e tema e camadas continuam como dois ícones (cabem em 375 px).
- A ação do modo desce para uma terceira linha do console.
- A leitura mostra só a %, o trilho e a frase; os 4 números somem.
- O cartão de contexto ganha `margin-top: auto` e desce ao pé, logo acima da legenda, com no máximo 40% da altura.

**Minhas decisões no lugar do mockup:**
- tema e camadas como ícones em vez do menu ⋮: cabem, e um menu exigiria cuidar do foco;
- a ação do modo numa linha do console em vez de dentro da folha: assim ela fica num lugar só do DOM.

## Como provar

- **Vitest:**
  - `dicaDoReligar`;
  - `Contexto` vazio não renderiza;
  - o Console mostra "Achar rota" só no Religar e "Restaurar tudo" só no Derrubar com falhas.
- **Grep:** nenhum `vidro`, `grao` ou `backdrop-filter` no `front/src`.
- **Navegador com o servidor:**
  - telas de 1440, 1024 e 375 px, em claro e em escuro;
  - a cena da Atalaia: derrubar, Religar e "Achar rota";
  - Selecionado no Observar;
  - console limpo e `impeccable detect` vazio.
- A suíte e o verificador limpos.

## Fica para quem constrói

- A espessura exata da sombra e o espaçamento fino.
- O texto dos rótulos curtos da leitura.
