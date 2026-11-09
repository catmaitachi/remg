---
titulo: T13 · 🌊 Calcular fluxo e marcar gargalos
labels: dominio, essencial, feature-principal
release: v0.3
depende: T09, T12
---
## 🎯 O que é
O caso de uso `CalcularFluxo`: roda o Dinic na rede de BH e devolve fluxo total, fluxo e uso de cada aresta, e a lista de **gargalos**.

## 🤔 Por que importa
É o resultado principal da ferramenta: é dele que sai a animação e a resposta para "onde a rede está no limite?".

## 🧭 Como começar
1. Montar o grafo (T11) e chamar o Dinic (T09).
2. Gargalo = aresta do **corte mínimo** **ou** com uso ≥ 90% (🟡 P4). Essa regra fica no **domínio**, não no algoritmo.
3. Medir o tempo (`tempoMs`), que vai para a tela e para o relatório.

## ✅ Pronto quando
- [ ] BH inteira calculada em tempo aceitável (anotar o tempo)
- [ ] testes da regra de gargalo
- [ ] 📝 seções **"🌊 Fluxo de energia"** e **"🚧 Gargalos"** no `README.md`, **escritas à mão por você**

## 📚 Leia antes
[04](../spec/04-algoritmos.md) · [08 · README à mão](../spec/08-processo.md)
