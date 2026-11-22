# T21 · Religar + polimento final do front: design

**Task:** T21 (#17) · **Branch:** `feat/17-front-modo-religar-e-painel-de-resultado`

## Por quê

Fechar o ciclo da demonstração: derrubar → achar rota → religar, com o painel dizendo a verdade sobre quanto voltou. E fechar as lacunas da spec 07 antes da entrega (22/11).

## Medido em 21/11 (servidor real, BH, front aberto)

- Derrubar `s:173217432`: 1.463 pontos e 10.040 kVA sem luz.
- `POST /rota-alternativa`: ~7,5 a 8,4 s, 1 chave, `religado = {pontos: 1463, demanda: 2,739 kVA}`, `parcial: true`.
- `POST /analise` com a chave fechada: ~7,5 a 8 s, 0 pontos sem luz, fluxo 233.512 → 233.515 kVA.
- `GET /criticos`: 25.689 pontes e 20.017 articulações (a rede é radial: quase todo cabo é ponte).
- A barra de hoje diria "Toda a cidade com luz · 100%" depois desse religamento: ela conta caminho até a energia, não energia entregue.

## Objetivos

1. Modo **Religar** (terceiro segmento: Observar · Derrubar · Religar).
2. Painel de resultado honesto: religado, parcial e tempos.
3. "Calculando…" nas duas etapas (rota e análise).
4. Painel do **Observar** (clique → capacidade, fluxo e uso), como na spec 07.
5. Flag `criticos` guardada, sem desenho.
6. Passada do `impeccable` (audit + polish) em claro, escuro e celular.

## Fora (não-objetivos)

- Corrigir a capacidade da chave no gerador: task separada (decisão do Lucas, opção 2).
- Desenhar os críticos.
- Mudar o contrato 06 ou os mocks.
- A subseção "Na tela" do README: escrita à mão pelo Lucas.

## Anti-objetivos

- Mostrar 100% ou "toda a cidade com luz" quando o religamento foi parcial.
- Resposta velha (rota ou análise) sobrescrever a lista nova de falhas.

## Abordagens

| | Como | Troca |
|---|---|---|
| ✅ **A** | O estado da rota entra no reducer de `tela/falhas.ts` (mesma `versao`) | Mudar a lista descarta a rota sozinho; um lugar só para testar |
| B | Hook/reducer separado para a rota | Precisa sincronizar duas versões; mais chance de resposta velha valer |

Escolha minha: **A**.

## Design

### Estado (`tela/falhas.ts`)

- Ganha `chavesFechadas: string[]` e `rota: { fase: "buscando" | "religando" | "pronta"; resultado?: RotaAlternativa; semLuzAntes: number /* kVA */ } | null`.
- `pedidoDe(falhas, chavesFechadas)` monta o pedido com as chaves.
- **Ações novas:**
  - `acharRota`: `calculando = true`, fase `buscando`, guarda `semLuzAntes` = `atual.semEnergia.demanda`. Sobe a `versao`, para que só a resposta dela valha.
  - `rota` (com versão):
    - com `chavesParaFechar` vazio → fase `pronta`, sem chaves, `calculando = false`;
    - senão → `chavesFechadas = [...atuais, ...novas]`, fase `religando`, e quem dispara a análise com as chaves é o efeito do App.
  - `resposta` (análise): na fase `religando`, vira `pronta`.
- Mudar a lista (`alternar` ou `restaurarTudo`) zera `rota` e `chavesFechadas`.
- Erro da rota cai no `erro` que já existe ("Não deu para achar a rota").

### Pedidos (`api/carregar.ts`)

- `pedirRota(pedido, signal)`: `POST /rota-alternativa`, validado com `validarRota`.
- No mock, o Religar fica desligado: o mock de BH não tem chaves.

### Barra

- Segmento de 3 modos.
- Seção **Religamento**, que só aparece no modo Religar:
  - botão "Achar rota", desligado sem falhas (dica: "Derrube algo no modo Derrubar primeiro") ou no mock ("precisa do servidor");
  - resultado:
    - "N pontos religados · X" (a potência formatada);
    - parcial: "Religado em parte: faltam Y", com `Y = semLuzAntes − religado.demanda`;
    - sem chaves: "Nenhuma chave alcança a área sem luz";
    - tempo: rota + análise.
- **Linha da cidade:** com religamento parcial vigente, a frase passa a ser "Religado em parte: faltam Y" e o % usa `floor(100·(1 − Y / demandaTotal))`, com teto de 99.
- **Seção Selecionado** (clique no modo Observar ou Religar):
  - tipo e nome ou id;
  - capacidade, fluxo |f|, uso em % e faixa;
  - "sem luz" ou "caído";
  - botão ✕ para fechar.
  Os dados vêm da `rede` + `estado.atual`.

### Mapa (`mapa/camadas.ts`)

- Camada **`rota`**: o `caminho` em cor primária, mais largo, e as chaves fechadas como anel.
- O anel pisca (alfa pelo `quadro.tempo`) na fase `religando` e fica fixo na `pronta`. Sem animação ou com movimento reduzido, fica fixo.
- O picking fica ligado em todos os modos (raio de 6 px): no Derrubar o clique derruba; no Observar e no Religar, seleciona.
- Legenda: item "Chave fechada pelo religamento".

### Críticos

- `Visiveis.criticos = false`, sem interruptor no painel e sem camada, com o comentário `shortcut:` explicando por quê (25.689 pontes em BH).

## Como provar

- **Vitest antes do código:**
  - reducer: fluxo completo, resposta velha ignorada, lista nova zera a rota, rota sem chaves, erro;
  - `pedidoDe` com chaves;
  - resumo com faltante;
  - rótulos do Selecionado.
- **Navegador com o servidor:** derrubar `s:173217432` → Religar → "Achar rota" → a chave pisca, sai "faltam ~10 MVA" e a barra não diz 100%.
- `impeccable audit`: contraste e foco em claro e escuro, e celular a 375 px.

## Fica para quem constrói

- Cores exatas da camada `rota` (dentro dos tokens gov.br) e o texto fino dos rótulos.
