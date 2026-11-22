# T16 · 🌐 Servidor HTTP e front sem mock (design)

Issue #12 · branch `feat/12-servidor-http-em-python-com-o-contrato-da-api` · 21/11/2026

## 🎯 Intenção

Hoje o front só mostra a rede e as falhas com os **mocks** (`front/src/mocks/` + o gerador `front/scripts/analise_sintetica.mjs`). A T16 liga o front ao **núcleo de verdade**: o servidor HTTP expõe todas as rotas do [06](../../spec/06-api.md), chamando o núcleo só pela porta `ServicoDeAnalise` (D22), e o front passa a usar o servidor por padrão. A partir daqui, o que aparece na tela (fluxo, gargalos, quem fica sem luz) é o que o núcleo calcula.

## ✅ Objetivos

1. Rotas do 06, no formato exato: `GET /api/rede`, `POST /api/analise`, `POST /api/rota-alternativa`, `GET /api/criticos`, `GET /api/saude`.
2. O front funciona com `VITE_USAR_MOCK=false` (carrega BH, Observar, Derrubar, Restaurar), e esse passa a ser o padrão.
3. Entrada errada → 400 `{"erro": "..."}` em português; erro inesperado → 500 `{"erro": "..."}` em português.
4. `fluxo` **com sinal** (positivo = `de → para`), como o 06 manda.
5. Gargalos em quantidade que faz sentido na cidade intacta (Q2 ajustada, abaixo).
6. Clique rápido não vira fila longa (fila de um, abaixo).

## 🚫 Não objetivos

- Mudar o contrato 06 ou os mocks (D25). Os mocks continuam no repo e o modo mock continua funcionando com `VITE_USAR_MOCK=true`.
- Tela nova. O botão de rota alternativa é da T21; aqui só a rota existe no servidor.
- Cancelar um cálculo que já começou (o Dinic não tem ponto de parada).
- Dependência nova: só biblioteca padrão do Python (`http.server`, `json`, `select`, `socket`, `threading`, `time`).

## ⛔ Anti-objetivos (falhou mesmo funcionando)

- O adaptador importar `core.casos_de_uso`/`core.dominio`/`core.grafo` fora do ponto de montagem (V16), ou o `core` saber de JSON/HTTP.
- Id desconhecido ou chave inexistente virar **500** (ou derrubar o servidor) em vez de 400.
- A onda andar contra o sentido da árvore porque o sinal se perdeu.
- Número inventado: `tempoMs` e todas as contagens vêm de execução real.

## 📏 Medido antes do design (BH, Python, esta máquina, 21/11)

| Etapa | Tempo |
|---|---|
| Ler CSV | 213 ms |
| Gerar a rede | 645 ms |
| Montar a `RedeEletrica` | 49 ms |
| Análise, pedido vazio (3×) | 2.293 a 2.471 ms |
| Análise, 1 trecho caído (56 pontos sem luz) | 2.511 ms |
| Análise, 1 subestação caída (1.295 pontos sem luz) | 2.612 ms |
| Rota alternativa (subestação caída) | 2.887 ms |
| Críticos | 138 ms |

Rede: 35.127 pontos, 35.109 trechos, 827 chaves, 18 subestações.

## 🧭 Abordagens consideradas

- ✅ **Porta + DTOs na porta + adaptador serializa** (escolhida). O núcleo devolve dataclasses; o adaptador HTTP converte para os arrays do 06 e mede o `tempoMs`. Segue D22 e as setas para dentro.
- ❌ Núcleo devolver o JSON do contrato: põe formato de API dentro do `core`.
- ❌ Flask/FastAPI: dependência nova sem necessidade; o `http.server` já está em uso desde a T03.

**Clique rápido** (cada cálculo ~2,5 s, um por vez por causa do GIL):
- A · deixar como está: 5 cliques rápidos ≈ 12 s até o último resultado.
- ✅ **B · fila de um, pulando quem desistiu** (escolha do Lucas): ~5 s no mesmo caso.
- C · "o último vence" no servidor: o clique de uma pessoa cancelaria o de outra.

**Gargalos (Q2)**, medido com BH, análise vazia:

| `FATOR_CABO` | Gargalos | Demanda entregue |
|---|---|---|
| 0,8 a 1,5 (hoje) | 6.705 (19,1%) | 84,2% |
| ✅ **1,1 a 1,6** (escolha do Lucas) | **768 (2,2%)** | **100%** |
| 1,2 a 2,0 | 0 | 100% |

Com fator < 1 o cabo nasce menor que a demanda que passa por ele, e 16% da cidade fica sem energia chegando sem falha nenhuma. Gargalo por uso aparece quando o fator sorteado fica abaixo de 1/0,9 ≈ 1,11; com 1,1 a 1,6 isso é ~2% dos cabos.

## 🏗️ O que foi decidido

### 1. Porta `ServicoDeAnalise` (`core/portas/servico_de_analise.py`)

`abc.ABC` com cinco métodos abstratos, um por rota:

| Método | Rota |
|---|---|
| `rede()` | `GET /rede` |
| `analisar(arestas_caidas, subestacoes_caidas, chaves_fechadas)` | `POST /analise` |
| `rota_alternativa(arestas_caidas, subestacoes_caidas, chaves_fechadas)` | `POST /rota-alternativa` |
| `criticos()` | `GET /criticos` |
| `saude()` | `GET /saude` |

- Os tipos de resposta moram **na porta** (o adaptador só pode importar `core.portas`, V16, e a porta não pode importar `core.casos_de_uso`, V5). Os dataclasses `ResultadoAnalise`, `ResultadoRota` e `ResultadoCriticos` **se mudam** dos casos de uso para a porta; os casos de uso passam a importá-los de lá (`from core.casos_de_uso.calcular_fluxo import ResultadoAnalise` continua funcionando por reimportação).
- Dois tipos novos na porta: o desenho da rede (o que o `GET /rede` precisa: área, subestações, pontos, arestas com tipo e capacidade, geometria das linhas AT) e a saúde (vértices e arestas).
- Entrada inválida → a implementação lança `ValueError` com a mensagem em português que vai para o usuário (mesmo padrão da `FonteDeRede`).

**Linhas AT e pontos de suprimento no `GET /rede`** (decisão minha, depois do builder check do Codex):
- As linhas AT vão **só em `geometriaAT`**, todas as da rede, como o mock já faz. Elas não entram em `arestas`.
- Os pontos de suprimento (`sp:*`) não saem na API.
- Motivo: no núcleo, a ponta de uma linha AT pode ser um `sp:*`, e o `validarRede` do front exige que toda ponta de aresta esteja em `pontos` ou `subestacoes`. O 06 não tem lista para `sp:*`, e o contrato está congelado.
- O front já não deixa derrubar linha AT (a camada `linhas-at` só segura o clique).
- O `POST /analise` continua aceitando `at:*` em `falhas.arestas`, porque o id existe no núcleo.

`arestas` leva os trechos (cabos) e as chaves do núcleo. Rua sem cabo não aparece.

### 2. Implementação (`core/casos_de_uso/`)

Uma classe que recebe a `RedeEletrica` já montada e junta `SimularFalha`, `RotaAlternativa` e `PontosCriticos`. Antes de calcular, confere cada id do pedido:
- aresta caída: precisa ser trecho, chave ou linha AT da rede;
- subestação caída: precisa ser subestação da rede;
- chave fechada: precisa ser chave.

Erro → `ValueError("id desconhecido: t:999")` (ou "só chave pode ser fechada: t:5"), nunca `KeyError` vazando.

### 3. Sinal do fluxo (`CalcularFluxo`)

Hoje `f = abs(resultado.fluxo[e])`. Passa a devolver o fluxo do arco de ida (`2k`), que é `de → para` porque `RedeEletrica._nova_aresta` cria a aresta com `u = de`, `v = para`. O uso continua `|fluxo| / capacidade`. Teste no núcleo com uma aresta cuja energia corre `para → de`.

### 4. Q2 (`GerarRedeSintetica`)

> 🔁 **Mudou depois da verificação no navegador (21/11):** com 1,1 a 1,6, o uso fica entre ~63% e ~91%, então 97% dos cabos ficavam amarelos e só 1% verde. O Lucas escolheu **1,1 a 2,5**: 279 gargalos, 60% verdes, 40% amarelos e 100% entregue. Medido de novo, o tempo da análise não muda com a faixa (2,7 a 4,2 s sem o front aberto).

`FATOR_CABO = (1.1, 2.5)`. Atualizar a Q2 em `docs/spec/02-dados.md` para ✅ com a faixa e os números medidos, e marcar a Q2 como decidida em `docs/spec/01-decisoes.md`. O teste que confere a capacidade do cabo já lê a constante.

### 5. Ponto de montagem (`adapters/http/servidor.py`)

Ao ligar:
1. lê `data/bh/` com `LeitorCSV`;
2. gera a rede com `GerarRedeSintetica`;
3. monta a `RedeEletrica`;
4. cria o serviço;
5. calcula a **análise vazia uma vez** (D26) e guarda o JSON pronto, com o `tempoMs` medido nessa hora;
6. guarda também o JSON do `GET /rede`, que não muda.

Imprime o tempo de cada etapa e a URL. `POST /analise` com pedido vazio (ou só listas vazias) devolve a análise guardada, sem recalcular.

### 6. Adaptador HTTP

- **Rotas** com prefixo `/api`, conforme a tabela da porta. Caminho desconhecido → 404 `{"erro": ...}`.
- **Pedido:**
  - corpo vazio = `{}`;
  - precisa ser objeto JSON com `falhas.arestas`, `falhas.subestacoes` e `chavesFechadas` opcionais, cada um lista de strings;
  - fora disso → 400 com mensagem em português (JSON inválido, campo com tipo errado, id desconhecido);
  - corpo maior que 1 MB → 400.
- **Resposta:** os arrays posicionais do 06; `tempoMs` é o tempo da chamada à porta, medido com `time.perf_counter`, inteiro em ms.
- **Fila de um:** um `threading.Lock` em volta da chamada à porta nos POST (`/analise` fora do caso vazio, `/rota-alternativa`). Ao pegar a vez, o servidor espia o socket (`select` com timeout 0 + `recv(1, MSG_PEEK)`): se o navegador já fechou a conexão (`b""` ou erro de conexão), solta a vez e não calcula nem responde. O `tempoMs` não conta a espera na fila.
- **CORS:** quando a `Origin` é `http://localhost:<porta>` ou `http://127.0.0.1:<porta>`, a resposta devolve `Access-Control-Allow-Origin` com essa origem. `OPTIONS` responde 204 com `Access-Control-Allow-Methods: GET, POST, OPTIONS` e `Access-Control-Allow-Headers: Content-Type`.
- **Rede:** continua ouvindo só em `127.0.0.1:8080`.

### 7. Front

- `front/.env.example`: `VITE_USAR_MOCK=false`. O `front/.env.local` do Lucas também passa a `false`.
- README (parte de "Rodar", fora da área escrita à mão) e a linha do `AGENTS.md`: ligar o servidor antes do front; o mock é opção.
- Código do front: não muda, porque `carregar.ts` já fala com o servidor. Só muda se a verificação no navegador mostrar algo quebrado.

## ✔️ Como provar

- `python -m unittest discover -s tests -t .`: sinal do fluxo, validação de ids no serviço e Q2.
- `python -m unittest discover -s adapters/http`, com servidor de verdade numa porta livre e uma rede pequena:
  - cada rota no formato do 06;
  - 400 para JSON inválido, tipo errado e id desconhecido;
  - 404;
  - CORS e OPTIONS;
  - pedido vazio usa a análise guardada;
  - pedido abandonado é pulado.
- Contrato: as respostas reais do servidor com BH passam pelo `validarRede`/`validarAnalise` do front.
- Navegador com `VITE_USAR_MOCK=false`: BH carrega, derrubar um trecho e uma subestação mostra "Calculando…" e depois sem luz/caído, Restaurar volta ao começo. Cliques rápidos: medir quanto leva até o último resultado.
- `npm --prefix front test`, `tsc` e build continuam verdes; verificador com 0 bloqueios.

## 🧰 Fica com quem constrói

- Nomes das classes, dos DTOs novos e dos arquivos de teste.
- Onde mora a conversão DTO → arrays do 06 dentro de `adapters/http/`.
- Como a rede pequena de teste é montada (dados em memória ou `tests/dados/`).
- Texto exato das mensagens de erro, desde que em português e dizendo o que está errado.
