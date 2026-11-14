# 📥 prep_osm

Baixa uma área do OpenStreetMap **uma vez** e gera os CSV de `data/<nome>/` (spec [02-dados](../../docs/spec/02-dados.md)).
Só **extrai** listas: montar o grafo e rodar algoritmo é tarefa do núcleo (regra 3 do [AGENTS](../../AGENTS.md)).

## 🚀 Como rodar de novo

Precisa de Python 3 e do `requests` (`pip install requests`, só para o `baixar`).

```bash
python tools/prep_osm/prep_osm.py baixar --nome bh      # Overpass → data/raw/bh.osm.json (fora do git)
python tools/prep_osm/prep_osm.py processar --nome bh   # data/raw/bh.osm.json → data/bh/*.csv
```

- 🕐 A Overpass pública cai com frequência. O `baixar` tenta 3 vezes (espera 30 s e 60 s); rode fora do horário de pico.
- 🌐 Outra área (região metropolitana, T29): `baixar --area '<seletor Overpass>' --nome rmbh`. O padrão é `area["boundary"="administrative"]["admin_level"="8"]["IBGE:GEOCODIGO"="3106200"]`. ⚠️ Não filtre só pelo nome: existe um "Belo Horizonte" em Moçambique.
- 🧪 Testes (sem internet): `python -m unittest discover -s tools/prep_osm`

## 📄 O que sai em `data/<nome>/`

| Arquivo | Colunas | De onde vem |
|---|---|---|
| `pontos.csv` | `id_osm, lat, lon` | nós de rua que são cruzamento (2+ ocorrências) ou ponta de via |
| `trechos_rua.csv` | `id, de, para, comprimento_m, tipo_via` | rua entre dois pontos; comprimento = Haversine somada ao longo da curva |
| `subestacoes.csv` | `id_osm, nome, lat, lon, tensoes, tipo` | `power=substation`; se for área, a média dos nós |
| `linhas_at.csv` | `id_osm, tensao, coords` | `power=line`, `coords` = `lat lon;lat lon;…` |
| `regionais.csv` | `nome, poligono` | `admin_level=9`; vários anéis separados por `\|` |
| `fonte.json` | data da cópia do OSM, área, consulta, contagens, `opcao_b` | — |

- 🛣️ Ruas aceitas: `highway` = `trunk`, `primary`, `secondary`, `tertiary`, `unclassified`, `residential` e os `*_link`.
- 🔁 Mesmo bruto → mesmos bytes (linhas ordenadas, 7 casas nas coordenadas), então rodar de novo só muda o git se o OSM mudou.
- 📏 `opcao_b` conta os pontos de curva que existiriam se o trecho guardasse a geometria da rua (opção B do design, adiada). Serve para o grupo decidir com número real.

## 🅱️ Plano B: Geofabrik

Se a Overpass não voltar: baixar `south-america/brazil/sudeste-latest.osm.pbf` do Geofabrik, e recortar com `osmium extract -p bh.geojson`. ❓ Falta um conversor do `.osm.pbf` para o JSON que o `processar` lê (não existe ainda); o arquivo é grande.

## 📜 Licença

Dados © OpenStreetMap contributors, sob **ODbL**. Mostrar a atribuição no mapa e citar no relatório.
