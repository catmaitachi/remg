# 07 · 🗺️ Front-end

## 🧱 Stack

| Peça | Escolha |
|---|---|
| Base | ✅ React · 🟡 Vite + TypeScript |
| Mapa | ✅ MapLibre GL (via `react-map-gl/maplibre`) |
| Camadas do grafo e animação | ✅ deck.gl (`MapboxOverlay`), que desenha 100 mil+ arestas com WebGL |
| Mapa de fundo | 🟡 OpenFreeMap, estilo claro ou escuro, sem chave de API |
| Estado | 🟡 estado do próprio React, sem Redux |

## 🖥️ A tela (uma só)

```text
┌──────────────────────────────────────────────────────────────────┐
│ ⚡ Cintilante · Belo Horizonte                   🟢 conectado   │
├───────────────┬──────────────────────────────────────────────────┤
│ 🧭 MODO        │                                                  │
│ ○ Observar    │                                                  │
│ ● Derrubar    │            🗺️  MAPA DE BH                        │
│ ○ Religar     │      linhas animadas: verde → amarelo → vermelho │
│               │      áreas sem luz em cinza                      │
│ 👁️ CAMADAS     │      chaves como ◇, subestações como ⚡           │
│ ☑ Alta tensão │                                                  │
│ ☑ Distribuição│                                                  │
│ ☑ Chaves      │                                                  │
│ ☐ Críticos    │                                                  │
│               │                                                  │
│ 📊 RESULTADO   │                                                  │
│ Fluxo  812 MVA│                                                  │
│ Sem luz 3,1 % │                                                  │
│ Gargalos  27  │                                                  │
│ ⏱️ 104 ms      │                                       © OSM      │
│ [↺ Restaurar] │                                                  │
└───────────────┴──────────────────────────────────────────────────┘
```

## 🖱️ Interações

| Modo | Clique em… | Acontece |
|---|---|---|
| 👀 Observar | trecho, subestação ou chave | painel com capacidade, fluxo e uso |
| 💥 Derrubar | trecho ou subestação | entra na lista de falhas → `POST /analise` → área sem luz fica cinza |
| 🔀 Religar | botão "achar rota" | `POST /rota-alternativa` → as chaves piscam → `POST /analise` com elas fechadas → o fluxo volta a animar |
| — | ↺ Restaurar | limpa as falhas e as chaves |

## 🎞️ Animação do fluxo 🟡

- **Cor = uso** do trecho: 🟢 < 60% · 🟡 60–90% · 🔴 ≥ 90% (gargalo).
- **Movimento = fluxo:** partículas andando no sentido do fluxo, com o `TripsLayer` do deck.gl. Mais fluxo = mais rápido ou mais denso.
- **Espessura** = capacidade.
- Plano B, se o `TripsLayer` der trabalho: o traço animado do MapLibre (`line-dasharray` trocado em loop).

> [!WARNING]
> **Desempenho.** BH tem mais de 100 mil arestas. Animar só o que **está na tela**. Com pouco zoom, mostrar só a alta tensão e os troncos dos alimentadores, e liberar os ramais conforme o zoom aumenta.

## 🧪 Trabalho em paralelo

- O front começa no **dia 1** com os mocks de [06-api](06-api.md). Não depende do back estar pronto.
- Uma variável `VITE_USAR_MOCK=true` alterna entre mock e servidor real.

## 🎨 Design

✅ **Visual decidido na T18:** linguagem do Design System gov.br (sem a marca), barra lateral de vidro com grão e paleta de uso híbrida. Os valores ficam na seção [🏛️ gov.br](../design/tokens.md#️-govbr-t18--decidido) do tokens.md, que vale também para os diagramas.

Na execução, a tela nova passa pelas skills `hallmark` + `ui-ux-pro-max` (fluxo do projeto) e o polimento pelo `impeccable`. Precisa funcionar com tema claro e escuro. Os contrastes de cor de uso precisam ser legíveis por quem tem daltonismo, por isso a cor nunca é a única pista: o gargalo também ganha espessura ou ícone.
