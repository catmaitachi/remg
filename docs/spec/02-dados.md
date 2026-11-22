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
- ✅ **Q2** · demanda proporcional ao comprimento de rua em volta do ponto, e capacidade do cabo = demanda que passa por ele × fator aleatório entre **1,1 e 2,5**. O uso do cabo é ~1/fator: abaixo de ~1,11 ele passa de 90% (gargalo) e acima de ~1,67 fica abaixo de 60% (verde no mapa).

  Medido com BH em 21/11, na rede intacta:

  | Fator do cabo | Gargalos | Demanda entregue | Cabos verdes / amarelos |
  |---|---|---|---|
  | 0,8 a 1,5 (proposta antiga) | 6.705 | 84,2% | 27% / 51% |
  | 1,1 a 1,6 | 768 | 100% | 1% / 97% |
  | ✅ **1,1 a 2,5** | **279** | **100%** | **60% / 40%** |

  Com fator abaixo de 1, o cabo nascia menor que a demanda. Até 1,6, o mapa ficava todo amarelo. O tempo da análise não muda com a faixa.

  ✅ **Socorro (#61)** · só com a regra acima, religar uma subestação caída não devolvia quase nada. Derrubando `s:173217432` (1.463 pontos, 10.040 kVA), a rota fechava `c:8129` e voltavam **2,7 kVA**. A chave não era o limite: mesmo com capacidade infinita, voltavam os mesmos 2,7 kVA, porque os cabos dos dois lados eram cabos de ponta de rede. Com todos os cabos infinitos, a folga de 20% da subestação vizinha ainda segurava em 1,9 MVA. Regra nova:
  - a **chave de socorro** de cada área é a chave mais curta da sua fronteira. É ela que a rota alternativa fecha quando a área inteira apaga, porque todo ponto apagado é fonte do Dijkstra;
  - os cabos do caminho dessa chave até as duas raízes aguentam a área socorrida: na área apagada, até a área toda; na vizinha, a própria subárvore mais a área socorrida. Tudo vezes o mesmo fator sorteado;
  - a chave aguenta a área que socorre, e a subestação fica com (própria área + maior área que socorre) × 1,2.

  Medido com BH em 21/11 (servidor e núcleo):

  | | Antes | Depois |
  |---|---|---|
  | Religado ao derrubar `s:173217432` | 2,7 kVA | **10.040,4 kVA (100%)** |
  | Subestações que voltam 100% ao cair | ❓ não medido | **17 de 18** |
  | Gargalos na rede intacta | 279 | **272** |
  | Cabos verdes / amarelos / vermelhos | 60% / 40% / ❓ | **60,9% / 38,3% / 0,8%** |
  | Tempo da análise da rede intacta | 5,7 a 9,5 s | 7,0 a 7,8 s (igual) |
  | Tempo da rota / da análise religada | 7,4 a 9,5 s | 11,1 a 15,5 s |

  O tempo do religamento sobe porque o Dinic passa a empurrar 10 MVA a mais por caminhos longos. A máquina oscila muito, então os tempos são faixas de 3 rodadas. Reforçar os caminhos de **toda** chave dava o mesmo religamento, mas o mapa perdia gargalos (218) e ficava 71% verde.
  - 🟡 `s:198024646` volta só 6,4 de 14,6 MVA. Quando ela cai, cai também a linha AT que alimenta outra subestação: duas áreas apagam juntas e a vizinha não foi dimensionada para as duas. `s:585526702` também fecha 2 chaves, mas volta 100%.
  - 🟡 Falha num cabo só apaga uma subárvore, e a rota fecha a chave mais curta em volta dela, que nem sempre é a de socorro. Nesse caso o religamento pode continuar parcial.
- 🎲 A geração usa **semente fixa**: o mesmo arquivo de entrada sempre gera a mesma rede.
- ✅ **Gerada ao ligar** o servidor, nunca salva no git (D24). Para o benchmark ou para conferir, `cintilante-cli exportar` grava a rede num arquivo local.

## 📜 Licença

Os dados do OSM estão sob **ODbL**. É obrigatório mostrar **"© OpenStreetMap contributors"** no mapa e citar a fonte no relatório.
