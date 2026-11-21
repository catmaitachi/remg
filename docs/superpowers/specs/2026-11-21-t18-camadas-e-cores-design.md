# T18 · Camadas da rede e cores de uso: design

> Issue #14 · branch `feat/14-front-camadas-da-rede-e-cores-de-uso` · v0.4 · 🗺️ Tela completa
> Decidido com o Lucas em 21/11/2026, etapa por etapa, com mockups (`.superpowers/brainstorm/`, fora do git).

## 🎯 Intenção

Desenhar a rede de BH inteira no mapa, pintada pelo uso de cada trecho, com legenda e camadas liga/desliga, já na identidade visual nova do projeto: **REMG (Rede de Energia de Minas Gerais)**, no jeito do **Design System gov.br**, com barra lateral de vidro fosco com grão à la Apple.

A T18 é a primeira task que monta a tela de verdade, então ela também assenta a base visual que a T19, a T20 e a T21 herdam.

## ✅ Pronto quando (da issue)

- BH inteira sem travar, com o **FPS medido** anotado (número de execução real, nunca estimado).
- Camadas liga/desliga.
- Cores com legenda e alternativa para daltonismo.

## 🧭 Metas, não metas e anti-metas

**Metas**
- Tela no jeito do gov.br: tokens oficiais, fonte Rawline, botões em pílula, switches do DS.
- Vidro que acompanha o tema do mapa.
- Cor por uso legível por quem tem daltonismo, com uma pista além da cor no gargalo.
- Rede inteira de BH com cor real de uso, usando só mocks.

**Não metas (ficam para outras tasks)**
- Animação do fluxo (T19), Derrubar (T20), Religar e painel de resultado (T21).
- Clique em aresta e cartão "Selecionado".
- Camada "Críticos" (T23).
- Testar contra o servidor real (integração).
- **Celular** (decidido pelo Lucas): a tela é só para desktop. Em tela estreita ela não precisa ficar boa, só não pode quebrar (sem rolagem horizontal).
- Trocar "Cintilante" por REMG nos arquivos antigos (task separada). Só a tela nova já sai como REMG.

**Anti-metas (mesmo funcionando, seria falha)**
- Parecer um serviço oficial do governo: **nada** de logo gov.br, cabeçalho de governo, selo ou "Entrar com gov.br". Usamos a linguagem visual, não a marca.
- Número inventado na tela. Onde não há dado, aparece "—".
- Cor como única pista do gargalo.
- Mudar o contrato da API (06-api).

## 🎨 Decisões visuais aprovadas (etapas 1 a 4)

### 1. Vidro da barra lateral: acompanha o tema
- **Mapa claro:** vidro branco `rgb(255 255 255 / .66)`, borda `rgb(255 255 255 / .7)`, texto `#333333`, primário `#1351B4` com texto branco, grão com opacidade .35.
- **Mapa escuro:** vidro azul-marinho do gov.br `rgb(7 29 65 / .70)` (`#071D41`), borda `rgb(255 255 255 / .12)`, texto branco, primário `#C5D4EB` com texto `#071D41`, grão com opacidade .45.
- Vidro: `backdrop-filter: blur(22px) saturate(170%)`, cantos de 16 px (`--surface-rounder-lg`), sombra suave.
- **Grão:** ruído fractal SVG (`feTurbulence`, `baseFrequency .85`, 3 oitavas) num `::before` com `mix-blend-mode: overlay`.
- O tema segue `prefers-color-scheme`, como hoje.

### 2. Cores de uso: paleta híbrida
Medidas com a matemática de `docs/design/prototipo/cores.test.cjs` (contraste com o fundo, e ΔE76 em visão normal, deuteranopia e protanopia):

| Uso | Faixa | ☀️ Claro | 🌙 Escuro |
|---|---|---|---|
| Normal | < 60% | `#0081a1` (ciano-vivid-50 do gov.br) | `#3db2ff` |
| Perto do limite | 60% a 90% | `#c26a00` | `#ffb000` |
| Gargalo | ≥ 90% | `#c4004f` | `#ff4f8b` |

- Menor distinção entre usos: ΔE 28,0 no claro e 38,4 no escuro (o mínimo é 20). Contraste com o fundo ≥ 3,5:1.
- Distância entre "normal" e o botão primário: ΔE 35,3 no claro e 31,6 no escuro. Era 7,5 com o azul antigo, e esse foi o motivo da troca.
- **Rejeitadas:** a paleta de feedback do gov.br (verde, amarelo e vermelho), porque laranja e vermelho ficam com ΔE 2,8 na deuteranopia; e a paleta toda do gov.br, porque a margem ficava apertada (ΔE 21) e o normal colava no botão no escuro (ΔE 16).
- **Gargalo:** além da cor, leva um **halo** (traço mais largo na cor do fundo por baixo) e um **ícone de alerta "!"** num círculo no meio da aresta.
- **Trecho sem fluxo:** cinza neutro, o mesmo `trecho` de hoje (`#7f7f7f` no claro, `#9ba7b5` no escuro).
- **Legenda:** faixa de vidro no pé da tela, entre a barra lateral e a coluna de controles, com as 3 faixas (traço + texto, por exemplo "Gargalo, 90% ou mais").

### 3. Camadas: painel à direita
- Coluna de controles de vidro no canto superior direito: zoom +, zoom −, recentralizar em BH e **Camadas**.
- **Camadas** abre um painel de vidro ao lado da coluna, com 4 linhas: alta tensão, distribuição, subestações e chaves.
- Cada linha tem o traço ou ícone da camada (serve de legenda do tipo), o nome e um switch do gov.br.
- O painel fecha com Esc, com clique fora ou clicando de novo no botão.

### 4. Tela inteira
- **Barra lateral** de vidro à esquerda (~23% da largura, mínimo ~280 px), a 12 px das bordas. De cima para baixo:
  - marca **REMG** com selo "RE" e "Rede de Energia de Minas Gerais";
  - **cartão da cidade** no formato da barra de progresso do gov.br: nome da área (`rede.area`), % com luz em número grande, barra de 8 px e uma frase de estado;
    - **% com luz** = `1 − semEnergia.demanda / demandaTotal`, arredondado para baixo (só mostra 100% quando ninguém está sem luz). É a mesma conta com o mock e com o servidor;
    - **frase:** "Toda a cidade com luz" só quando `semEnergia.pontos` está vazio; senão, "N pontos sem luz", com N = `semEnergia.pontos.length`. Fala em **pontos**, não em casas, porque não temos uma conversão real de ponto para casa;
    - com o mock atual, a tela abre em 98% e "702 pontos sem luz" (pedaços soltos da malha). É o dado como ele é, e um Dinic sobre essa rede diria o mesmo;
  - **4 blocos:** energia entregue (`fluxoTotal`), demanda (`demandaTotal`), gargalos (`gargalos.length`) e tempo de cálculo (`tempoMs`);
  - aviso "Dados de exemplo até o servidor ficar pronto", só com o mock ligado.
- Não há botões de Derrubar nem Religar: eles entram na T20 e na T21.
- **Tipografia:** Rawline, carregada do CDN do gov.br (`cdngovbr-ds.estaleiro.serpro.gov.br/design-system/fonts/rawline/css/rawline.css`), com Raleway como reserva. Não achamos a licença da Rawline, por isso a fonte **não** é copiada para o repositório.

## 🧱 Abordagens consideradas para os dados de BH

O `front/src/mocks/analise.json` tem fluxo de só 5 arestas (rede pequena). A rede de BH (`rede.bh.json`) tem 53.230 trechos, 35.829 pontos e 25 subestações, mas é só a malha de ruas: **não tem chaves nem arestas de alta tensão, e as subestações não estão ligadas a nenhum ponto**. A capacidade (1000 kVA) e a demanda (1 kVA por ponto) são fixas e falsas de propósito (T05). A rede elétrica de verdade é a T12, que ainda não existe.

| | Abordagem | Por que sim ou não |
|---|---|---|
| A | Sorteio fixo: uso pseudoaleatório pelo id da aresta | Menor, mas os gargalos ficam espalhados sem lógica e o sentido do fluxo sai aleatório, o que atrapalha a T19 |
| **B ✅ escolhida** | **Fluxo coerente:** percorrer a malha a partir das subestações e somar a demanda a jusante | O mapa fica com cara real (troncos carregados perto das subestações) e o sentido do fluxo é de verdade |
| C | Esperar o Dinic do núcleo e gerar pela CLI | Trava a T18: a T09 e a T17 nem começaram |

### Como B funciona
1. **Ligar as subestações:** cada subestação liga ao ponto da malha mais próximo (distância em linha reta). Essa ligação só existe dentro do gerador e não entra no `rede.bh.json`.
2. **Árvore de BFS com várias fontes:** uma busca em largura que parte de todas as subestações ao mesmo tempo sobre os trechos. Cada ponto fica pendurado na subestação mais próxima em número de saltos, e a busca define o pai de cada ponto.
3. **Fluxo:** o fluxo de cada aresta da árvore é a soma da demanda dos pontos abaixo dela (1 kVA por ponto, do próprio mock). Trechos fora da árvore e pontos que a busca não alcança ficam com fluxo 0 e **não** entram na lista `fluxo`, como o contrato manda.
4. **Uso:** `uso = min(1, fluxo / capacidade)`. Um trecho acima da capacidade fica com uso 1 e entra em `gargalos` (uso ≥ 0,9).
5. **Resto da resposta:** `fluxoTotal` é a soma da demanda dos pontos alcançados, `demandaTotal` é a soma de toda a demanda, `semEnergia.pontos` são os pontos não alcançados e `tempoMs` é o tempo real que o gerador levou.
6. **Saída:** `front/src/mocks/analise.bh.json`, no formato de `POST /analise` com pedido vazio, gerado pelo mesmo `npm --prefix front run mock:bh` que gera a rede. O `area` da rede continua "Belo Horizonte (dados de exemplo)".

**O mock não limita o fluxo pela capacidade** (decisão de quem constrói, revisável). Limitar exigiria um fluxo máximo, que é o trabalho do Dinic no núcleo. Trecho acima da capacidade vira gargalo com uso 1, e o `fluxoTotal` pode passar do que um Dinic entregaria. A tela mostra isso como "dados de exemplo".

**Medido ao rodar o passo a passo acima sobre o `rede.bh.json` atual (script de checagem, 21/11/2026):** 35.127 de 35.829 pontos alcançados (702 sem alcance, em pedaços soltos da malha), 35.103 trechos com fluxo, 34.880 normais, 119 perto do limite e 104 gargalos (86 acima da capacidade). O gerador de verdade deve dar os mesmos números; se não der, investigar antes de seguir.

A BFS é escrita à mão (é um gerador de mock em `front/scripts/`, fora do `core/`, sem biblioteca de grafo), como o resto do `mock_de_csv.mjs`.

⚠️ **Para a T19 (não resolver aqui):** o validador (`validar.ts`) exige `fluxo > 0`, mas a T19 fala em "sinal do fluxo na API". Na T18 o mock sai só com valores positivos, e o sentido em relação a `de → para` precisa ser combinado no contrato antes da T19.

## 🔌 Como a tela carrega os dados

- `carregarRede()` continua como está.
- Nova `carregarAnalise()`, no mesmo molde (busca + validação com `validarAnalise`): com o mock, lê `analise.bh.json` por `?url`, porque o arquivo tem cerca de 1 MB e fica fora do bundle; com o servidor, faz `POST {SERVIDOR}/analise` com corpo `{}`.
- Se a análise falhar, o mapa mostra a rede em cinza neutro e um aviso. Não quebra a tela.

## 🗺️ Camadas no deck.gl

- **Distribuição:** `PathLayer` dos trechos, com a cor pelo uso vinda de um `Map<id, uso>` montado uma vez. Um `PathLayer` de halo, só com os gargalos, fica por baixo.
- **Alta tensão:** `PathLayer` da `geometriaAT`, como hoje.
- **Subestações:** pontos como hoje (selo redondo na cor `subestacao` dos tokens).
- **Chaves:** quadrado com contorno. O mock de BH não tem chaves; o switch aparece mesmo assim (desligado não muda nada) e passa a valer quando houver chaves.
- **Ícone do gargalo:** um marcador "!" no ponto médio de cada aresta com gargalo.
- Camada desligada = `visible: false` (não remonta os dados). Trocar o tema muda só as cores, por `updateTriggers`.

## ♿ Acessibilidade

- Switches são `<button role="switch" aria-checked>` com rótulo visível. O botão Camadas tem `aria-expanded` e `aria-controls`.
- `:focus-visible` em tudo que é clicável, no estilo do gov.br.
- Texto do corpo com 16 px; rótulos e legenda com 14 px no mínimo.
- A cor nunca é a única pista (halo + ícone no gargalo; texto da faixa na legenda).

## 🧪 Verificação

- **Testes (vitest):**
  - o gerador da análise numa rede pequena feita à mão (árvore, ciclo, ponto não alcançado, trecho acima da capacidade);
  - cor por uso nos limites (0,59 · 0,6 · 0,89 · 0,9);
  - `carregarAnalise` com o mock e com o servidor falso;
  - o `analise.bh.json` gerado passa no `validarAnalise`.
- **Teste de paleta:** a mesma conta do `cores.test.cjs`, agora sobre os tokens do front (contraste ≥ 3:1, ΔE ≥ 20 nas 3 visões, normal × botão ≥ 20).
- **FPS:** medido no navegador com BH inteira no zoom inicial e anotado na issue e no PR. **Abaixo de ~30 FPS, a task não está pronta.**
  - Saída de emergência, já prevista no aviso de desempenho do 07: com pouco zoom, desenhar só a alta tensão e os trechos com fluxo acima de um limiar (os troncos), e liberar o resto conforme o zoom aumenta. Só entra se a medição pedir.
- **Dark mode e daltonismo:** conferidos na tela (Chrome DevTools → Rendering → Emulate vision deficiencies).
- `python tools/verificar/verificar.py` antes do PR.

## 📝 Documentos que mudam

- **Regra nova (Lucas, 21/11/2026):** os diagramas (`docs/diagramas/*.svg`) também seguem os tokens do gov.br: fonte Rawline, cores do gov.br e as versões clara e escura. A seção nova do `tokens.md` vale para a tela **e** para os diagramas. Os SVGs são refeitos fora da T18, na [issue #37](https://github.com/catmaitachi/remg/issues/37), junto com a troca do nome para REMG.
- `docs/design/tokens.md`: nova seção "gov.br (T18)" com a paleta híbrida, o vidro com grão, a Rawline e o cartão em barra. As seções antigas continuam como histórico.
- `docs/spec/07-frontend.md`: a tabela de design aponta para o gov.br e para o tokens.md (só o necessário).
- **README:** a T18 não tem seção escrita à mão. Se alguma for criada, quem escreve é o Lucas.

## 🛠️ Fica a critério de quem constrói

- Divisão em componentes React e nomes de arquivo (sugestão: `front/src/tela/` para Barra, Controles, PainelCamadas e Legenda; `front/src/estilo/tokens.css` para os tokens).
- Ícone da subestação: círculo simples ou a torre do protótipo (`addImagens` em `docs/design/prototipo/mapa.js`), se não custar caro.
- Detalhes de espaçamento, desde que sigam a escala do gov.br (múltiplos de 8 px).
- Como medir o FPS (contador por `requestAnimationFrame` ou a aba Performance), desde que o número venha de execução real.
