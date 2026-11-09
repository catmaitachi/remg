---
titulo: T18 · 🗺️ Front: camadas da rede e cores de uso
labels: front, essencial
release: v0.4
depende: T05
---
## 🎯 O que é
Desenhar a rede no mapa: alta tensão, trechos, chaves e subestações, cada um com seu estilo, e o painel para ligar e desligar cada camada.

## 🤔 Por que importa
É a primeira vez que a rede de BH aparece "de verdade" na tela. Daqui em diante, toda feature é uma camada a mais.

## 🧭 Como começar
1. Estilo definido na T02.
2. deck.gl `PathLayer` (linhas) e `ScatterplotLayer` / `IconLayer` (subestações e chaves).
3. ⚠️ São mais de 100 mil arestas: com pouco zoom, mostrar só a alta tensão e os troncos.
4. Clique numa aresta abre o painel com capacidade, fluxo e uso.

## ✅ Pronto quando
- [ ] BH inteira desenhada sem travar (anotar o FPS)
- [ ] checkboxes das camadas funcionando
- [ ] cores com legenda e alternativa para daltonismo

## 📚 Leia antes
[07](../spec/07-frontend.md)
