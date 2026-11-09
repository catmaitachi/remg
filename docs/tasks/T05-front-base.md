---
titulo: T05 · 🗺️ Front base com mapa de BH e mocks
labels: front, essencial
release: v0.1
depende: T01, T02
---
## 🎯 O que é
Criar o projeto do front (Vite + React + TypeScript) com o mapa de BH na tela (MapLibre + deck.gl) e os **arquivos de exemplo** da API em `front/src/mocks/`.

## 🤔 Por que importa
Com os mocks, o front anda **desde o primeiro dia** sem esperar o back. Quando o servidor ficar pronto, basta virar uma chave.

## 🧭 Como começar
1. `npm create vite@latest front -- --template react-ts`
2. Instalar `maplibre-gl`, `react-map-gl` e `@deck.gl/mapbox` (+ `@deck.gl/layers`, `@deck.gl/geo-layers`).
3. Mapa centrado em BH com o fundo escolhido na T02 e o crédito "© OpenStreetMap contributors".
4. Mocks pequenos (~20 pontos) seguindo **exatamente** o [06-api](../spec/06-api.md).
5. Variável `VITE_USAR_MOCK=true` para escolher entre mock e servidor real.
6. 🛡️ No `package.json`, o script `"prepare": "git -C .. config core.hooksPath .githooks"`: o `npm install` liga os hooks do verificador.

## ✅ Pronto quando
- [ ] `npm run dev` mostra BH com a rede do mock desenhada
- [ ] trocar `VITE_USAR_MOCK` muda a origem dos dados
- [ ] depois do `npm install`, `git config core.hooksPath` responde `.githooks`
- [ ] seção "Como rodar o front" no `README.md`

## 📚 Leia antes
[07](../spec/07-frontend.md) · [06](../spec/06-api.md)
