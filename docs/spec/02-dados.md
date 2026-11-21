# 02 · 📦 Dados

## 🔎 O que existe no OpenStreetMap de BH

Consultado na Overpass API em 09/11/2026 (cópia do OSM de 24/07/2026):

| Camada | Quantidade | Situação |
|---|---|---|
| ⚡ Subestações (`power=substation`) | **25**, ~19 da Cemig de distribuição (138 kV → 13,8 kV), com nome | ✅ real |
| 🗼 Linhas de alta tensão (`power=line`) | **61** linhas + 394 torres (60 em BH: 1 era de Moçambique, ver abaixo) | ✅ real |
| 🔌 Distribuição (`minor_line`, `transformer`, `pole`) | 1 linha · 1 transformador · 6 postes | ❌ quase vazia, por isso vai ser **gerada** |
| 🛣️ Ruas (`highway` = primary … residential) | **25.549** vias | ✅ real, é a base da rede gerada |
| 🏘️ Regionais (`admin_level=9`) | **9** | ✅ úteis para filtrar e mostrar no mapa |

Algumas subestações: Barreiro (345 kV, transmissão), Centro, Santa Efigênia, Barro Preto, Sion, Gutierrez, Horto, Pampulha, Jatobá, Maracanã…

> [!WARNING]
> A Overpass API pública caiu **três vezes** nesta consulta (erro 502, servidor lotado). **Ninguém pode depender dela para rodar o sistema.** Baixa-se uma vez, e o arquivo processado fica salvo no repositório.

## 🔁 Caminho dos dados

```text
 🌐 OSM (Overpass ou Geofabrik)
        │  baixar 1 vez
        ▼
 📥 data/raw/bh.osm.json             ← bruto, fica fora do git (.gitignore)
        │  🐍 tools/prep_osm  (Python, PODE usar bibliotecas)
        │     só EXTRAI: pontos, trechos de rua, subestações, linhas AT
        ▼
 📄 data/bh/*.csv                     ← vai para o git
        │  📂 adaptador de dados (Python)
        ▼
 🐍 núcleo Python: monta o grafo e GERA a rede de distribuição
```

> [!IMPORTANT]
> **Fronteira da regra "sem biblioteca de grafo":** o `prep_osm` só lê o OSM e escreve listas (pontos e trechos). Ele **não** monta lista de adjacência nem roda algoritmo nenhum. Juntar pontos em grafo, gerar a rede sintética e qualquer busca acontecem no **núcleo Python, feito à mão**.

## 📄 Arquivos que o `prep_osm` gera 🟡

Todos em CSV com cabeçalho e coordenadas em graus (WGS84).

| Arquivo | Colunas |
|---|---|
| `pontos.csv` | `id_osm, lat, lon` (cruzamentos e pontas de rua) |
| `trechos_rua.csv` | `id, de, para, comprimento_m, tipo_via` (um trecho = rua entre dois pontos) |
| `subestacoes.csv` | `id_osm, nome, lat, lon, tensoes, tipo` (`distribution`, `transmission`, `industrial`) |
| `linhas_at.csv` | `id_osm, tensao, coords` (lista `lat lon;lat lon;…`) |
| `regionais.csv` | `nome, poligono` (para filtro e desenho) |

💡 O comprimento em metros sai da fórmula de Haversine, calculada no próprio `prep_osm`.

## 📥 Como baixar 🟡

1. **Overpass (padrão):** uma consulta só para a área de BH (`area["admin_level"="8"]["IBGE:GEOCODIGO"="3106200"]`; só pelo nome vem junto um "Belo Horizonte" de Moçambique) pegando `highway` e `power`. Rodar fora do horário de pico, com `User-Agent` identificando o projeto.
2. **Plano B, Geofabrik:** extrato `south-america/brazil/sudeste` em `.osm.pbf`, recortado com `osmium extract` pelo polígono de BH. *Suposição: arquivo grande, na casa de 1 GB. Conferir antes.*
3. 🌐 **Região metropolitana (extra):** mesmo processo, trocando o polígono. A área é **parâmetro** do `prep_osm`, não fica fixa no código.

## 🌳 Rede de distribuição sintética

Gerada **no núcleo** a partir das ruas (detalhes em [03-modelagem](03-modelagem.md) e [04-algoritmos](04-algoritmos.md)):

- cada subestação de distribuição é ligada ao ponto de rua mais próximo;
- Dijkstra com várias fontes divide a cidade em **áreas de atendimento**, e cada área vira uma árvore (rede radial, como na vida real);
- as ruas que ligam áreas de subestações diferentes viram **chaves de manobra** (normalmente abertas);
- ✅ **Q2** · demanda proporcional ao comprimento de rua em volta do ponto, e capacidade do cabo = demanda que passa por ele × fator aleatório entre **1,1 e 1,6**. O gargalo por uso (≥ 90%) aparece quando o fator sorteado fica abaixo de ~1,11. Medido com BH em 21/11 (rede intacta): **768 gargalos (2,2%) e 100% da demanda entregue**. Com a proposta antiga, de 0,8 a 1,5, eram 6.705 gargalos e só 84,2% entregue, porque o cabo nascia menor que a demanda.
- 🎲 A geração usa **semente fixa**: o mesmo arquivo de entrada sempre gera a mesma rede.
- ✅ **Gerada ao ligar** o servidor, nunca salva no git (D24). Para o benchmark ou para conferir, `cintilante-cli exportar` grava a rede num arquivo local.

## 📜 Licença

Os dados do OSM estão sob **ODbL**. É obrigatório mostrar **"© OpenStreetMap contributors"** no mapa e citar a fonte no relatório.
