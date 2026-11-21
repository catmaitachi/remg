# 06 · 🔌 Contrato da API

> [!IMPORTANT]
> ✅ **Contrato congelado em 10/11/2026** (T01, D25). O front começa com **arquivos de exemplo** (`front/src/mocks/*.json`) no formato daqui, e o back trabalha para devolver exatamente isso. Mudar o contrato = PR alterando este arquivo **e** os mocks juntos.
>
> `front/src/mocks/analise.bh.json`: resposta de `POST /analise` com pedido vazio para BH, sintética (fluxo coerente da T18), gerada por `npm --prefix front run mock:bh`.

- Base: `http://localhost:8080/api`
- Tudo em JSON, UTF-8. Ids são **strings estáveis** (`"p:123"` ponto, `"s:45"` subestação, `"sp:3"` ponto de suprimento, `"t:678"` trecho, `"c:90"` chave, `"at:12"` linha AT).
- 🟡 Trechos e chaves são desenhados como **linha reta** entre os dois pontos, que são cruzamentos próximos. Só as linhas AT têm geometria completa (`geometriaAT`).
- Toda resposta de cálculo traz `tempoMs`, o tempo gasto no núcleo. Ele aparece na tela e vai para o relatório.
- Erro: status 400 ou 500 com `{ "erro": "mensagem em português" }`.

## 📍 `GET /rede`

A rede inteira, uma vez, quando o front abre. As listas usam arrays posicionais para o arquivo ficar menor.

```json
{
  "area": "Belo Horizonte",
  "subestacoes": [["s:45", "Subestação Centro", -19.92, -43.94, 50000]],
  "pontos":      [["p:123", -19.921, -43.938, 12.5]],
  "arestas":     [["t:678", "p:123", "p:124", "trecho", 800],
                  ["c:90",  "p:200", "p:201", "chave", 600],
                  ["at:12", "s:45",  "s:46",  "linha_at", 100000]],
  "geometriaAT": { "at:12": [[-19.92, -43.94], [-19.93, -43.95]] }
}
```

| Lista | Campos, na ordem |
|---|---|
| `subestacoes` | id, nome, lat, lon, capacidade kVA |
| `pontos` | id, lat, lon, demanda kVA |
| `arestas` | id, de, para, tipo (`trecho` · `chave` · `linha_at`), capacidade kVA |

## 🌊 `POST /analise`

Fluxo, gargalos e falhas num pedido só.

**Pedido**
```json
{
  "falhas": { "arestas": ["t:678"], "subestacoes": [] },
  "chavesFechadas": ["c:90"]
}
```

**Resposta**
```json
{
  "fluxoTotal": 812345,
  "demandaTotal": 900000,
  "fluxo": [["t:678", 0, 0.0], ["t:679", 640, 0.8]],
  "gargalos": ["t:700", "t:701"],
  "semEnergia": { "pontos": ["p:123", "p:124"], "demanda": 25.0 },
  "tempoMs": 104
}
```

- `fluxo`: `[id, fluxo kVA, uso de 0 a 1]`, **só com as arestas de fluxo maior que zero**, para economizar.
- Pedido vazio (`{}`) = rede sem falhas.

## 🔀 `POST /rota-alternativa`

**Pedido:** igual ao `/analise` (`falhas` + `chavesFechadas`).

**Resposta**
```json
{
  "chavesParaFechar": ["c:90", "c:91"],
  "caminho": ["t:800", "c:90", "t:801"],
  "religado": { "pontos": 140, "demanda": 22.0 },
  "parcial": false,
  "tempoMs": 37
}
```

Para animar o resultado, o front chama `/analise` de novo com `chavesFechadas` incluindo `chavesParaFechar`.

## 🎯 `GET /criticos` 🟡

```json
{ "pontes": ["t:10", "t:11"], "articulacoes": ["p:5"], "tempoMs": 21 }
```

## ❤️ `GET /saude`

`{ "ok": true, "vertices": 81234, "arestas": 102345 }`: o front usa para mostrar "conectado".
