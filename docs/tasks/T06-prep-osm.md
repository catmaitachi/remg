---
titulo: T06 · 📥 Baixar BH do OpenStreetMap e gerar os CSV
labels: dados, essencial
release: v0.1
depende: —
---
> ⚠️ Superada pela D26 (núcleo em Python). Ver T32/T33.

## 🎯 O que é
Script Python em `tools/prep_osm/` que baixa as ruas e a rede elétrica de BH (uma vez) e gera os CSV de `data/bh/`.

## 🤔 Por que importa
É a matéria-prima de tudo. Sem dado, não tem mapa, grafo nem demo. E, como a Overpass cai com frequência, o resultado fica **salvo no repositório**.

## 🧭 Como começar
1. Ler a seção "Caminho dos dados" do [02-dados](../spec/02-dados.md).
2. Consulta Overpass para `highway` e `power` na área de BH. Rodar fora do horário de pico.
3. Quebrar as ruas em trechos entre cruzamentos, com o comprimento pela fórmula de Haversine.
4. ⚠️ **Só extrair.** Nada de montar lista de adjacência ou usar `networkx`/`osmnx`: isso é tarefa do núcleo C++.
5. A área (BH) é **parâmetro** do script, porque a região metropolitana vem depois.

## ✅ Pronto quando
- [ ] `data/bh/` com `pontos.csv`, `trechos_rua.csv`, `subestacoes.csv`, `linhas_at.csv` e `regionais.csv`
- [ ] contagens conferidas com o [02-dados](../spec/02-dados.md) (~25 subestações, ~61 linhas AT)
- [ ] README do script explicando como rodar de novo

## 📚 Leia antes
[02](../spec/02-dados.md)
