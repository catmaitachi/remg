---
titulo: T29 · 🌐 Expandir para a região metropolitana
labels: dados, extra
release: v1.1
depende: T06, T12
---
## 🎯 O que é
Rodar o `prep_osm` e a geração da rede para a **região metropolitana de BH**, além da cidade.

## 🤔 Por que importa
É o "uau" extra e o teste de desempenho em escala maior. **Só depois de todo o essencial pronto.**

## 🧭 Como começar
1. Trocar o polígono da área (o `prep_osm` já recebe a área por parâmetro).
2. Talvez o Geofabrik + `osmium` seja necessário, porque a Overpass pode não aguentar.
3. Medir o tempo dos algoritmos e do front.

## ✅ Pronto quando
- [ ] dados da região em `data/rmbh/`
- [ ] tempos anotados para o relatório

## 📚 Leia antes
[02](../spec/02-dados.md)
