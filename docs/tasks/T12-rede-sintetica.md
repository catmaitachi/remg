---
titulo: T12 · 🌳 Gerar a rede de distribuição sintética
labels: dominio, essencial, feature-principal
release: v0.3
depende: T08, T11
---
## 🎯 O que é
O caso de uso `GerarRedeSintetica`: a partir das ruas e das subestações, cria os alimentadores (árvores), as chaves de manobra e as capacidades dos cabos.

## 🤔 Por que importa
O OSM de BH quase não tem a rede de distribuição. **Sem essa geração não há o que analisar.** E, feita do jeito radial, ela fica parecida com a rede real da Cemig.

## 🧭 Como começar
1. Dijkstra com várias fontes (T08) a partir das subestações, pelas ruas.
2. Trechos da árvore = cabo. Rua entre áreas de subestações diferentes = **chave aberta**.
3. ❓ **Q2**: decidir os valores de demanda e capacidade e registrar em [01](../spec/01-decisoes.md). A proposta está no [02-dados](../spec/02-dados.md).
4. **Semente fixa**: mesma entrada, mesma rede.

## ✅ Pronto quando
- [ ] BH inteira gerada, com contagens impressas (trechos, chaves, alimentadores)
- [ ] teste em malha pequena: toda rua com cabo fica ligada a exatamente uma subestação
- [ ] 📝 seção **"🌳 Rede sintética"** no `README.md`, **escrita à mão por você** ([08](../spec/08-processo.md))

## 📚 Leia antes
[02](../spec/02-dados.md) · [03](../spec/03-modelagem.md) · [04](../spec/04-algoritmos.md)
