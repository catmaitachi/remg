# 🎨 Tokens e legenda da tela (T02)

> Fonte da verdade: [`prototipo/estilo.css`](prototipo/estilo.css). Os testes [`cores.test.cjs`](prototipo/cores.test.cjs) conferem contraste e daltonismo: `node --test docs/design/prototipo/`.
> Tudo aqui é 🟡 **proposta** até o grupo aprovar o protótipo. Depois disso vira ✅ e entra na [07-frontend](../spec/07-frontend.md).

## 🗺️ Fundo do mapa

| Tema | Estilo OpenFreeMap | Cor de fundo |
|---|---|---|
| ☀️ Claro | `positron` | `rgb(242,243,240)` |
| 🌙 Escuro | `dark` | `rgb(12,12,12)` |

O protótipo abre no tema do sistema (`prefers-color-scheme`), e o botão do topo troca.

## 🌈 Cor = uso do trecho

Família Okabe-Ito, mais viva. Contraste e ΔE **medidos** em 11/11/2026 com o script do teste:

| Uso | Faixa | ☀️ Claro | contraste | 🌙 Escuro | contraste |
|---|---|---|---|---|---|
| 🔵 Normal | < 60% | `#0067c5` | 5,0:1 | `#3db2ff` | 8,4:1 |
| 🟠 Perto do limite | 60% a 90% | `#c26a00` | 3,5:1 | `#ffb000` | 10,7:1 |
| 🔴 Gargalo | ≥ 90% | `#c4004f` | 5,4:1 | `#ff4f8b` | 6,3:1 |

- Menor distância entre as três cores (visão normal, deuteranopia e protanopia): **ΔE 41,1** no claro e **38,4** no escuro. O mínimo exigido pelo teste é 20.
- O laranja do claro é mais escuro que o Okabe original: com `#E69F00` não dava 3:1 sobre o Positron.
- O gargalo puxa para o magenta para não se confundir com o laranja na deuteranopia.

## 🧩 Outros estados

| Elemento | ☀️ Claro | 🌙 Escuro | Pista além da cor |
|---|---|---|---|
| ⚠️ Halo do gargalo | `#ffffff` | `#0c0c0c` | contorno + ícone de alerta no meio |
| ✕ Linha caída | `#7f7f7f` (3,6:1) | `#e0e0e0` | tracejada + ✕ no ponto da falha |
| 🌑 Sem luz (linha) | `#8a8a86` | `#3d3d3d` | sem brilho, sem fios, sem fluxo |
| 🌑 Sem luz (área) | `#3a3a3a` a 16% | `#000000` a 50% | mancha sobre a região |
| Contorno (casing) | `#ffffff` | `#0c0c0c` | separa a linha das ruas e parques |

## 💡 Luz × sem luz: regiões com contorno e véu (rodadas 5 e 6)

Cada **subestação tem sua região**, com contorno próprio, nome ("Região Centro") e, por dentro, só um **véu** quente quase transparente. Onde duas regiões se encostam, os contornos marcam a fronteira. A área sem luz é uma zona à parte, com véu frio e contorno **tracejado**. O véu venceu a comparação com borda interna, casas espaçadas e hachura fina.

Como é feito: cada trecho de distribuição sabe sua região (`regiao` em [`cenarios.js`](prototipo/cenarios.js), pela subestação de onde sai). A grade de células de ~380 m é gerada com folga em volta da rede (`bboxDe`), para a zona não bater na borda. Cada região vira um campo 0/1, suavizado duas vezes e contornado em 0,5 por *marching squares* ([`luz.js`](prototipo/luz.js)).

| Estado | ☀️ Claro | 🌙 Escuro |
|---|---|---|
| Região com luz: véu | `#f2a516` a 12% | `#ffc24d` a 9% |
| Região com luz: contorno | `#c97700`, 2 px, com brilho | `#ffd27a`, 2 px, com brilho |
| Nome da região | `#7a4a00` com halo | `#ffe2a3` com halo |
| Sem luz: véu | `#34466b` a 25% | `#0e1d3d` a 45% |
| Sem luz: contorno tracejado | `#34466b` | `#7f9bd1` |

No religar, as regiões voltam **em onda** a partir da chave que fechou (~1,8 s).

## 🏔️ 3D

- Prédios: `fill-extrusion` da camada `building` do OpenFreeMap, a partir do zoom 13, em cor neutra (`#d6d6d0` no claro, `#3a3c41` no escuro).
- Relevo: AWS Terrain Tiles (`terrarium`, sem chave), exagero 1,4, mais sombreamento.
- A câmera inclina 50° quando acontece uma falha. O botão **3D** desliga prédios e relevo e volta o mapa ao plano.

## 🪟 HUD de vidro escuro

O mesmo vidro sobre os dois temas do mapa: fundo `rgb(12 15 20 / 0.74)` com `blur(14px)`, borda `rgb(255 255 255 / 0.1)`, texto `#eef1f5`, apoio `#9ba7b5`. O acento de energia é `#ffc94d`: passo atual, botão principal, switches ligados e brilho do número do cartão. **Barra lateral (rodada 8):** à la Ajustes do Mac, uma barra de vidro de 300 px flutua à esquerda, a 12 px de todas as bordas e com cantos de 14 px. De cima para baixo, ela tem a marca, o cartão de impacto, as ações (dica, cenários, botão principal e Restaurar), e a Legenda presa no pé (recolhível, sem nota de rodapé). O selo "dados de exemplo" saiu a pedido do Lucas; o aviso "Todos os números são de exemplo" continua em "Ver detalhes". À direita ficam os controles do mapa: rosa dos ventos, zoom, 3D, tema e Camadas (os switches abrem num painel ao lado).

## 📏 Espessura = tipo de linha

| Tipo | Largura |
|---|---|
| ⚡ Alta tensão (`at`) | 6 px |
| Tronco do alimentador | 3,5 px |
| Ramal | 2 px |
| Chave de manobra | 2 px (aberta: pontilhada) |

O gargalo **não** engrossa. A capacidade aparece no balão do passo 1.

## ⚡ Efeito elétrico (intensidade por situação)

| Situação | Intensidade | Brilho | Fios tremendo | Extra |
|---|---|---|---|---|
| Sem luz / caída / chave aberta | 0 | — | — | — |
| Normal | 1 | fraco | 1 (±1,5 px) | — |
| Perto do limite | 2 | médio | 2 (±3 px) | — |
| Gargalo | 3 | forte | 3 (±5 px) | faíscas |
| Caminho religando (~2 s) | 3 | forte | 3 | mantém a cor do uso |

- **Raio mais visível (rodada 3):** normal = 2 fios (±3,5 px), alerta = 3 fios (±5 px), gargalo = 4 fios (±7 px). Por baixo dos fios há um brilho difuso, e as faíscas aparecem em todas as linhas vivas (8%, 20% e 40% de chance por quadro).
- **Animação principal (rodada 2):** o tracejado saiu. Os fios correm no sentido do fluxo, a uma velocidade de 2 + 18 × uso pontos por segundo, então gargalo corre rápido e linha folgada anda devagar.

- Inspirado no ElectricLogo do React Bits, **recriado** com camadas do MapLibre (`line-blur` + geometria com ruído). Nenhum código de lá foi copiado (a licença é MIT + Commons Clause).
- Com `prefers-reduced-motion` fica só o brilho, parado.
- ⚠️ Para a T19: com 100 mil arestas, os fios só podem ser gerados para as linhas **na tela** e com zoom suficiente. No protótipo são 35 linhas.

## 🔤 Tipografia

- **Fira Sans** (Google Fonts), pesos 400, 500 e 700, com algarismos tabulares nos números. Se a rede cair, usa `system-ui`.
- Texto com no mínimo 16px. O número grande do cartão tem 44px.

## 🧭 O que muda em relação à 07-frontend

| Antes (07) | Agora (proposta) |
|---|---|
| Painel lateral fixo com modos | Mapa em tela cheia, roteiro de 4 passos no topo, cartão de impacto e só o próximo botão embaixo |
| Verde · amarelo · vermelho | Azul · laranja · vermelho-magenta (seguro para daltonismo) |
| Espessura = capacidade | Espessura = tipo de linha; gargalo com halo + ícone |
| Fluxo em MVA no painel | "% da cidade com luz" + "~N casas sem luz"; o técnico fica em "ver detalhes" |
| Partículas (`TripsLayer`) | Tracejado andando + efeito elétrico por intensidade |

## 🗼 Ícones do mapa (rodada 9)

- **Subestação:** torre de transmissão (treliça com dois braços e isoladores) num selo redondo. Se a subestação cai, o selo e a torre ficam cinza.
- **Chave de manobra:** o símbolo de chave dos diagramas elétricos num selo quadrado. **Aberta**, a lâmina fica levantada. **Fechada** (no religar), a lâmina fica deitada em amarelo de energia.
- Os dois são desenhados em canvas com as cores do tema do mapa (`addImagens` em `mapa.js`).

## 📊 Barra como dashboard e aresta em destaque (rodada 10)

- **Ordem da barra:** marca · anel com o % de luz e, ao lado, o nome da área (`area`, vindo dos dados, como no `GET /rede`) como título e uma frase de estado ("toda a cidade com luz" ou "~10 mil casas sem luz") · ações · cartão **Selecionado** · 4 blocos (energia entregue, demanda, gargalos, tempo de cálculo) · **Regiões** · Legenda no pé.
- **Pensado para mais cidades:** o nome da área e a lista de regiões são gerados dos dados. A lista mostra os problemas primeiro (`resumoPorRegiao` em `luz.js`, com teste) e rola sozinha, então cabem dezenas de regiões. Com mais de uma área, o nome vira o seletor (não foi criado agora). Clicar numa região leva o mapa até ela.
- **Aresta em destaque:** clicar numa aresta faz ela brilhar em amarelo de energia, escurece o mapa base com um véu e esmaece o resto (opacidade × 0,06). Os dados aparecem no cartão **Selecionado** (situação, região, capacidade, fluxo e barra de uso). Para sair: ×, Esc ou clique no vazio. É a base para simular possibilidades nessa aresta depois.
- **Rodada 11 (escolhas do Lucas entre 4 opções cada):** cartão da cidade em **anel compacto** (72 px, nome da área e frase de estado numa linha só). Regiões em **tabela compacta**: uma linha por região com nome, barra e %, linhas alternadas, problemas primeiro. O detalhe (uso médio e gargalos) aparece ao passar o mouse.
- **Legenda (rodada 12):** saiu da barra lateral e virou uma **faixa no pé da tela**, entre a barra lateral e a coluna de controles (12 px de folga de cada lado), com os itens lado a lado. Um botão de **lista** na coluna de controles mostra e recolhe a faixa. Ela começa visível.
- **Cartão da cidade (rodada 13):** o anel saiu. Entrou a **barra compacta** (opção D da comparação): nome da área à esquerda e % grande à direita na mesma linha, uma barra de 6 px embaixo (amarela, ou rosa quando falta luz) e a frase de estado. É o mesmo formato das regiões, pensado para várias cidades.
- **Cartão da cidade (rodada 14): bateria.** Um retângulo com terminal à direita, que se enche até o % com luz (amarelo de energia, rosa quando falta luz). Um brilho (`--carga-brilho`) atravessa a carga a cada ~2,8 s e para com `prefers-reduced-motion`. O texto (área, frase e %) existe em duas camadas: a clara fica embaixo, e a escura é recortada pela mesma `clip-path` da carga. Assim o texto troca de cor exatamente na borda da carga e mantém contraste dos dois lados.
- **Bateria com energia (rodada 15):** a carga ganhou os **mesmos fios elétricos das arestas** (`tremer` e `velocidade` de `eletrico.js`, desenhados num canvas e correndo no ritmo do %), sobre um âmbar escuro (`#6b4a00` → `#3d2a00`; no alerta, rosa-escuro `#6b1233` → `#3d0a1d`). O texto é claro com sombra, para dar contraste sobre a carga e sobre o vazio. A bateria ficou mais alta (84 px de corpo).
- **Bateria com raio (rodada 16):** os fios saíram de dentro da carga. Agora o **contorno da parte carregada** treme e estala como uma aresta do mapa: cada lado usa `tremer` com as pontas presas nos cantos, em 2 fios com brilho e núcleo claro, num canvas que passa 8 px da bateria para o raio poder sair da borda. O raio encolhe junto com a carga. O interior fica liso.
- **Raio sutil (rodada 17):** um fio só, tremor de 1,5 px, traço de 1,4 px com brilho curto, 60% de opacidade e estalo mais lento. Sem núcleo branco.
- **Nome (rodada 18):** a marca do protótipo passou a ser **Cintilante** (logo da barra, título da aba e descrição). O nome também foi trocado na spec, nas tasks, nos diagramas, no AGENTS.md, no README e no verificador (`cintilante-cli`, `cintilante_py`). Ficam "luzes" só o repositório no GitHub (`catmaitachi/luzes`), o quadro do kanban e os registros históricos.
- **Bateria sem raio (rodada 19):** o raio no contorno saiu a pedido do Lucas. A bateria fica com a carga escura, o brilho que atravessa a carga e o texto claro.
