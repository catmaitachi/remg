# T16 · Servidor HTTP e front sem mock · Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o servidor HTTP responde todas as rotas do 06 com o núcleo de verdade, pela porta `ServicoDeAnalise`, e o front passa a usá-lo por padrão.

**Architecture:**
- **Porta:** `core/portas/servico_de_analise.py` define a porta e os tipos de resposta.
- **Núcleo:** `core/casos_de_uso/servico.py` implementa a porta com os casos de uso que já existem.
- **Adaptador:** `adapters/http/api.py` importa só `core.portas`. Converte para os arrays do 06 e cuida dos erros, do CORS e da fila de um.
- **Montagem:** `adapters/http/servidor.py` lê BH, gera a rede e liga tudo.

**Tech Stack:** Python 3.12, só a biblioteca padrão (`http.server`, `json`, `select`, `socket`, `threading`, `time`), `unittest`. Front React/Vite, que já existe.

**Spec:** `docs/superpowers/specs/2026-11-21-t16-servidor-http-design.md`

> 🔍 **Revisado pelo Codex (21/11):** os quatro achados entraram no plano.
> - Nomes dos cabeçalhos CORS no teste de preflight.
> - Teste da fila: bloqueia só o pedido A, e o descarte é provado por um teste determinístico do `calcular_na_vez`.
> - O teste da Q2 confere a constante, porque o teste de capacidade já passava com 0,8.
> - O `servidor.py` antigo fica de pé até a Task 6, para a suíte ficar verde no fim de cada task.

## Global Constraints

- Nenhuma dependência nova, nem no Python nem no front.
- Os arquivos em `adapters/` só importam `core.portas`. Exceção: `adapters/http/servidor.py`, que é o ponto de montagem (V16, `MONTAGEM_PY`). Os testes em `adapters/http/` também seguem a V16.
- `core/portas` só importa `grafo`, `dominio` e `portas`; `core/casos_de_uso` importa também `casos_de_uso` (V5). No `core`, só os módulos de `MODULOS_PERMITIDOS`.
- O contrato 06 e os mocks do front não mudam (D25).
- Mensagens de erro em português, sempre `{"erro": "..."}`, com status 400 (entrada) ou 500 (inesperado). Caminho desconhecido dá 404.
- Ids do pedido: arestas `t:`/`c:`/`at:`, subestações `s:` e chaves `c:`, todos já existentes na rede.
- `FATOR_CABO = (1.1, 1.6)`.
- O servidor ouve só em `127.0.0.1`, porta `8080`.
- CORS só para a origem `http://localhost:<porta>` ou `http://127.0.0.1:<porta>`.
- O corpo do pedido tem no máximo 1 MB (`1_000_000` bytes).
- O `tempoMs` é o tempo da chamada à porta, com `time.perf_counter`, arredondado para inteiro em ms. Não conta a espera na fila.
- Números do relatório e da tela só vêm de execução real. Não inventar.
- Commits `tipo: descrição` em português, sem corpo e sem coautoria de IA. Nunca `--no-verify`.

## Review Focus

1. **Sinal do fluxo de ponta a ponta:** no JSON, uma aresta com energia indo `para → de` sai com valor negativo, e o `uso` continua entre 0 e 1. Teste na Task 1.
2. **Id que existe mas é do tipo errado:** `s:` em `falhas.arestas`, `t:` em `chavesFechadas` ou `p:` em qualquer lista devolvem 400, nunca 500. Teste na Task 3.
3. **JSON válido com forma errada:** `[]`, `{"falhas": []}`, `{"chavesFechadas": "c:1"}` ou lista com número devolvem 400. Teste na Task 4.
4. **Pedido cancelado enquanto outro calcula:** é pulado, e não derruba a thread nem o servidor. O pedido seguinte é atendido. Teste na Task 5.
5. **Preflight do navegador:** um `OPTIONS /api/analise` com `Origin: http://localhost:5173` responde 204 com os três cabeçalhos CORS. Uma origem de fora não recebe `Access-Control-Allow-Origin`. Teste na Task 4.

---

### Task 1: Fluxo com sinal

**Files:**
- Modify: `core/casos_de_uso/calcular_fluxo.py:44-50`
- Test: `tests/test_calcular_fluxo.py`

**Interfaces:**
- Produces: `ResultadoAnalise.fluxo` passa a ser `(id, fluxo kVA com sinal, uso 0..1)`, com positivo = `de → para`.

- [ ] **Step 1: Ajustar o teste que hoje passa com valor absoluto**

Em `test_chave_fechada_entrega_tudo`, a `c:1` vai de `p:3` para `p:4`, mas a energia corre de `p:4` para `p:3`:
```python
self.assertLessEqual(fluxo["c:1"], -10)
self.assertEqual(fluxo["t:3"], 10 - fluxo["c:1"])
```
Acrescentar `test_fluxo_contra_o_sentido_da_aresta_e_negativo`: na rede do teste, trocar `t:1` para `Trecho("t:1", "p:2", "p:1", 60)` e conferir que `fluxo["t:1"] == (-50, 0.83)`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `python -m unittest tests.test_calcular_fluxo -v`
Expected: FAIL nos dois testes. O fluxo ainda vem positivo.

- [ ] **Step 3: Usar o fluxo do arco de ida (`2k`) sem `abs` e trocar o `if f > 0` por `if f != 0`**

O comentário do laço passa a explicar o sinal: o arco `2k` é `de → para`, porque `_nova_aresta` recebe `u = de`.

- [ ] **Step 4: Rodar a suíte do núcleo**

Run: `python -m unittest discover -s tests -t .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add core/casos_de_uso/calcular_fluxo.py tests/test_calcular_fluxo.py
git commit -m "fix: fluxo com sinal no sentido da aresta"
```

### Task 2: Q2 com fator de 1,1 a 1,6

**Files:**
- Modify: `core/casos_de_uso/gerar_rede_sintetica.py:8-9,31` (docstring da Q2 e `FATOR_CABO`)
- Modify: `docs/spec/02-dados.md:66` (Q2 ❓ → ✅) e a linha da Q2 em `docs/spec/01-decisoes.md`
- Test: `tests/test_gerar_rede_sintetica.py`

**Interfaces:**
- Produces: `FATOR_CABO == (1.1, 1.6)`.

- [ ] **Step 1: Teste `test_cabo_nasce_maior_que_a_demanda_que_passa`**

`self.assertEqual(FATOR_CABO, (1.1, 1.6))`. O `test_capacidades`, que já existe, continua conferindo que a capacidade gerada fica dentro da faixa da constante. O Codex conferiu que um teste só de capacidade já passaria com 0,8, então ele não serve como teste vermelho.

- [ ] **Step 2: Rodar e ver falhar**

Run: `python -m unittest tests.test_gerar_rede_sintetica -v`
Expected: FAIL, porque o fator ainda é 0,8.

- [ ] **Step 3: Mudar a constante, a docstring e os dois docs**

No `02-dados.md`, a Q2 passa a ser ✅ decidida:
- a faixa vai para 1,1 a 1,6;
- a frase "com BH: 768 gargalos (2,2%) e 100% da demanda entregue na rede intacta; com 0,8 a 1,5 eram 6.705 e 84,2%" (medido em 21/11) explica o motivo.

No `01-decisoes.md`, a linha Q2 sai dos pendentes ou fica marcada como resolvida, seguindo o padrão do arquivo.

- [ ] **Step 4: Rodar a suíte do núcleo**

Run: `python -m unittest discover -s tests -t .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add core/casos_de_uso/gerar_rede_sintetica.py tests/test_gerar_rede_sintetica.py docs/spec/02-dados.md docs/spec/01-decisoes.md
git commit -m "feat: cabo da rede sintética com folga de 1,1 a 1,6"
```

### Task 3: Porta `ServicoDeAnalise` e implementação

**Files:**
- Create: `core/portas/servico_de_analise.py`
- Create: `core/casos_de_uso/servico.py`
- Modify:
  - `core/casos_de_uso/calcular_fluxo.py`, `rota_alternativa.py`, `pontos_criticos.py`: os dataclasses de resultado se mudam para a porta e são reimportados de lá;
  - `core/dominio/rede_eletrica.py`: propriedade `num_arestas`.
- Test: `tests/test_servico.py`

**Interfaces:**
- Produces, em `core/portas/servico_de_analise.py`:
  - `ResultadoAnalise`, `ResultadoRota` e `ResultadoCriticos`, com os mesmos campos de hoje;
  - `DesenhoDaRede(area: str, subestacoes: list[tuple[str, str, float, float, float]], pontos: list[tuple[str, float, float, float]], arestas: list[tuple[str, str, str, str, float]], geometria_at: dict[str, list[tuple[float, float]]])`;
  - `Saude(vertices: int, arestas: int)`;
  - `class ServicoDeAnalise(ABC)` com os métodos abstratos abaixo:
    - `rede() -> DesenhoDaRede`
    - `analisar(arestas_caidas: list[str], subestacoes_caidas: list[str], chaves_fechadas: list[str]) -> ResultadoAnalise`
    - `rota_alternativa(arestas_caidas: list[str], subestacoes_caidas: list[str], chaves_fechadas: list[str]) -> ResultadoRota`
    - `criticos() -> ResultadoCriticos`
    - `saude() -> Saude`
  - Os métodos lançam `ValueError` com mensagem em português quando a entrada é inválida.
- Produces, em `core/casos_de_uso/servico.py`: `class AnaliseDaRede(ServicoDeAnalise)` com `__init__(self, rede: RedeEletrica, area: str)`.
- Produces, em `core/dominio/rede_eletrica.py`: `RedeEletrica.num_arestas -> int`, o número de arestas do grafo, contando as virtuais.

- [ ] **Step 1: Testes em `tests/test_servico.py`** (rede pequena montada à mão, como em `test_calcular_fluxo.py`, com uma chave e uma `LinhaAT`)

- `test_rede_desenha_trechos_chaves_e_geometria_at`:
  - `arestas` tem os trechos e as chaves, com tipo `"trecho"`/`"chave"` e a capacidade;
  - nenhuma aresta tem tipo `linha_at`;
  - `geometria_at` tem o id da linha com as coordenadas;
  - `subestacoes` é `(id, nome, lat, lon, capacidade)`;
  - `pontos` é `(id, lat, lon, demanda)`.
- `test_analisar_igual_a_simular_falha`: o mesmo resultado da `SimularFalha` para as mesmas falhas.
- `test_id_desconhecido_vira_value_error`: `analisar(["t:999"], [], [])` lança `ValueError`, e a mensagem contém `"t:999"`.
- `test_tipo_errado_vira_value_error`: `ValueError` em cada um destes casos:
  - `analisar(["s:A"], [], [])`;
  - `analisar([], ["t:1"], [])`;
  - `analisar([], [], ["t:1"])`;
  - `analisar(["p:1"], [], [])`.
- `test_linha_at_pode_cair`: `analisar(["at:1"], [], [])` não lança erro.
- `test_rota_e_criticos_passam_pela_porta`: o mesmo resultado da `RotaAlternativa` e dos `PontosCriticos`.
- `test_saude`: `Saude(rede.num_vertices, rede.num_arestas)`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `python -m unittest tests.test_servico -v`
Expected: FAIL com `ModuleNotFoundError: core.portas.servico_de_analise`.

- [ ] **Step 3: Criar a porta e mudar os três dataclasses para ela**

Nos casos de uso, `from core.portas.servico_de_analise import ResultadoAnalise`. O nome continua importável do lugar antigo.

- [ ] **Step 4: Implementar a `AnaliseDaRede`**

- A conferência de ids usa conjuntos montados no `__init__`:
  - arestas que podem cair: trechos, chaves e as linhas AT que estão no grafo;
  - subestações;
  - chaves.
- Mensagens:
  - `"id desconhecido: t:999"`;
  - `"s:A não é trecho, chave nem linha AT"`;
  - `"t:1 não é subestação"`;
  - `"só chave pode ser fechada: t:1"`.
- `rede()` e `saude()` montam a resposta a partir dos atributos públicos da `RedeEletrica`.

- [ ] **Step 5: Rodar a suíte do núcleo e o verificador**

Run: `python -m unittest discover -s tests -t .` e `python tools/verificar/verificar.py`
Expected: PASS. Verificador sem V5/V16.

- [ ] **Step 6: Commit**

```bash
git add core/portas/servico_de_analise.py core/casos_de_uso/ core/dominio/rede_eletrica.py tests/test_servico.py
git commit -m "feat: porta ServicoDeAnalise com a análise da rede"
```

### Task 4: Adaptador HTTP com as rotas do 06

**Files:**
- Create: `adapters/http/api.py`
- Create: `adapters/http/test_api.py`

**Interfaces:**
- Consumes: `ServicoDeAnalise` e os DTOs da Task 3, só por `core.portas`.
- Produces: `criar_servidor(porta: int, servico: ServicoDeAnalise) -> Servidor`.
  - No `__init__`, calcula e guarda os bytes do `GET /rede` e da análise vazia (com o `tempoMs` medido nessa hora).
  - `Servidor(ThreadingHTTPServer)` mora aqui, com o mesmo `allow_reuse_address` do Windows que o `servidor.py` usa hoje.
  - Ouve em `127.0.0.1`.
  - O `servidor.py` e o `test_servidor.py` **não mudam nesta task**: continuam com a classe e a rota de saúde deles até a Task 6 fazer a troca. Assim, a suíte fica verde no fim de cada task.

- [ ] **Step 1: Testes em `adapters/http/test_api.py`**

Usam um `ServicoFalso(ServicoDeAnalise)` que devolve DTOs fixos e conta as chamadas, e um servidor real na porta 0 em thread, como o `test_servidor.py` de hoje.
- **Formato:**
  - `test_rede_no_formato_do_06`: chaves `area`, `subestacoes`, `pontos`, `arestas`, `geometriaAT`, com arrays posicionais;
  - `test_analise_no_formato_do_06`: `fluxoTotal`, `demandaTotal`, `fluxo` (com valor negativo preservado), `gargalos`, `semEnergia: {pontos, demanda}` e `tempoMs` inteiro;
  - `test_rota_alternativa_no_formato_do_06`: `chavesParaFechar`, `caminho`, `religado: {pontos, demanda}`, `parcial` e `tempoMs`; não aparece `semEnergia`;
  - `test_criticos_e_saude`: `{"pontes", "articulacoes", "tempoMs"}` e `{"ok": true, "vertices", "arestas"}`.
- **Análise vazia:**
  - `test_pedido_vazio_usa_a_analise_guardada`: com corpo `""`, `{}` e `{"falhas": {"arestas": []}, "chavesFechadas": []}`, a resposta é a mesma, e `ServicoFalso.analisar` foi chamado uma vez só (no `criar_servidor`).
- **Erros:**
  - `test_400_json_invalido`: corpo `"{"`;
  - `test_400_forma_errada`: `[]`, `{"falhas": []}`, `{"chavesFechadas": "c:1"}`, `{"falhas": {"arestas": [1]}}`;
  - `test_400_value_error_do_servico`: o falso lança `ValueError("id desconhecido: t:9")`, e a resposta é 400 com esse texto;
  - `test_400_pedido_grande`: `Content-Length` acima de 1.000.000;
  - `test_500_erro_inesperado`: o falso lança `RuntimeError`, a resposta é 500 com `{"erro": ...}` em português, e o servidor continua respondendo;
  - `test_404`.
- **CORS:**
  - `test_cors_localhost`: com `Origin: http://localhost:5173`, a resposta traz `Access-Control-Allow-Origin: http://localhost:5173`;
  - `test_cors_outra_origem`: com `Origin: http://evil.example`, a resposta não traz o cabeçalho;
  - `test_preflight`:
    - o pedido é `OPTIONS /api/analise` com `Origin: http://localhost:5173`, `Access-Control-Request-Method: POST` e `Access-Control-Request-Headers: content-type`;
    - a resposta é 204 com `Access-Control-Allow-Origin: http://localhost:5173`, `Access-Control-Allow-Methods: GET, POST, OPTIONS` e `Access-Control-Allow-Headers: Content-Type`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `python -m unittest discover -s adapters/http`
Expected: FAIL com `ModuleNotFoundError: api`.

- [ ] **Step 3: Implementar `api.py`**

- Funções puras:
  - `ler_pedido(corpo: bytes) -> tuple[list[str], list[str], list[str]]`, que lança `ValueError`;
  - uma função `para_json` por DTO.
- Um handler com `do_GET`, `do_POST` e `do_OPTIONS`.
- `ValueError` vira 400 com a mensagem. Qualquer outra `Exception` vira 500 `"erro interno no servidor: <tipo>"`.
- A análise vazia guardada é usada quando as três listas estão vazias.

- [ ] **Step 4: Rodar os testes do servidor**

Run: `python -m unittest discover -s adapters/http`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add adapters/http/api.py adapters/http/test_api.py
git commit -m "feat: rotas do contrato no servidor HTTP"
```

### Task 5: Fila de um, pulando quem desistiu

**Files:**
- Modify: `adapters/http/api.py`
- Test: `adapters/http/test_api.py`

**Interfaces:**
- Produces, em `api.py`:
  - `cliente_desistiu(sock: socket.socket) -> bool`. Devolve `True` quando `select` com timeout 0 diz que o socket está legível e `sock.recv(1, socket.MSG_PEEK)` devolve `b""`, ou quando levanta `ConnectionError`/`OSError`;
  - `calcular_na_vez(fila: threading.Lock, sock: socket.socket, calcular: Callable[[], T]) -> T | None`. Pega a fila; se `cliente_desistiu(sock)`, devolve `None` sem chamar `calcular`; senão, devolve `calcular()`. Solta a fila em `finally`.

- [ ] **Step 1: Testes**

- `test_cliente_desistiu`, com `socket.socketpair()`:
  - `False` enquanto o outro lado está aberto;
  - `True` depois de `close()` no outro lado.
- `test_na_vez_pula_quem_desistiu`, com `socketpair()` e o outro lado já fechado: devolve `None`, e o `calcular` não foi chamado. Esse é o teste determinístico do descarte.
- `test_na_vez_calcula_quem_espera`: com o outro lado aberto, devolve o valor de `calcular`, e a fila fica livre depois (`fila.acquire(blocking=False)` é `True`).
- `test_pedido_abandonado_na_fila_e_pulado`, de ponta a ponta. É um teste de integração e pode deixar passar algum caso, mas não dá falso vermelho; o determinístico é o de cima.
  - O `ServicoFalso` bloqueia **só** o pedido com `arestas == ["t:A"]` num `threading.Event`. A análise vazia do `criar_servidor` não bloqueia e entra na contagem.
  - Sequência:
    1. A (`t:A`) começa por `urllib` em outra thread;
    2. o teste espera o falso avisar, por outro `Event`, que A entrou;
    3. B (`t:B`) é enviado por socket cru, com cabeçalhos separados por `\r\n`, `\r\n\r\n` antes do corpo e `Content-Length` em bytes, e é fechado;
    4. C (`t:C`) vai por `urllib` em outra thread;
    5. o teste solta A num `finally`.
  - Todos os `join`/`wait` com timeout de 5 s.
  - Confere que A e C respondem 200 e, depois de esperar C e mais 1 s, que as chamadas foram exatamente a vazia, `t:A` e `t:C`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `python -m unittest discover -s adapters/http`
Expected: FAIL, porque B ainda é calculado.

- [ ] **Step 3: Pôr um `threading.Lock` no `Servidor`**

Nos POST que chamam o serviço (`/analise` não vazio e `/rota-alternativa`), depois de ler e validar o corpo:
- o handler chama `calcular_na_vez(self.server.fila, self.connection, ...)`, e o `calcular` mede o tempo em volta da chamada à porta;
- se volta `None`, marca `self.close_connection = True` e sai sem responder.

O `tempoMs` não conta a espera na fila.

- [ ] **Step 4: Rodar os testes do servidor**

Run: `python -m unittest discover -s adapters/http`
Expected: PASS, três vezes seguidas, sem falha intermitente.

- [ ] **Step 5: Commit**

```bash
git add adapters/http/api.py adapters/http/test_api.py
git commit -m "feat: servidor pula o pedido que o navegador cancelou"
```

### Task 6: Ponto de montagem com BH

**Files:**
- Modify: `adapters/http/servidor.py`
- Modify: `adapters/http/test_servidor.py`

**Interfaces:**
- Consumes: `criar_servidor` (Task 4), `AnaliseDaRede` (Task 3), `LeitorCSV` e `GerarRedeSintetica`.
- Produces: `montar(pasta: Path, area: str = "Belo Horizonte") -> ServicoDeAnalise` em `servidor.py`. O `__main__` monta `data/bh/`, imprime o tempo de cada etapa e liga em `PORTA = 8080`.
- O `servidor.py` perde a classe `Servidor`, o `Pedido` e o `criar_servidor` antigos, e passa a usar os do `api.py`. O `test_servidor.py` antigo, que esperava `{"ok": true}`, é reescrito.

- [ ] **Step 1: Testes em `test_servidor.py`**

- `test_monta_com_os_csv_de_teste`: `montar(Path("tests/dados"))` (caminho relativo à raiz do repo, calculado a partir de `__file__`) devolve um serviço com `saude().vertices > 0` e `rede().arestas` sem tipo `linha_at`.
- `test_saude_com_a_rede_de_teste`: com `criar_servidor(0, montar(...))`, o `GET /api/saude` responde `{"ok": true, "vertices": N, "arestas": M}`.
- `test_porta_ocupada`: continua, agora com `criar_servidor(porta, montar(...))`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `python -m unittest discover -s adapters/http`
Expected: FAIL, porque `montar` não existe.

- [ ] **Step 3: Implementar `montar` e o `__main__`**

As etapas são `LeitorCSV(pasta).carregar()`, `GerarRedeSintetica().executar(dados).montar_rede()` e `AnaliseDaRede(rede, area)`, cada uma com o tempo impresso. Depois, `criar_servidor(PORTA, servico)` imprime quanto levou a análise inicial e `🟢 http://localhost:8080/api`.

Se `tests/dados` não gerar rede por falta de subestação de distribuição ligada, usar uma pasta de teste mínima em `adapters/http/dados_teste/` e registrar como Ruling.

- [ ] **Step 4: Rodar tudo e medir com BH**

Run:
- `python -m unittest discover -s adapters/http`
- `python -m unittest discover -s tests -t .`
- `python tools/verificar/verificar.py`

Em background, `python adapters/http/servidor.py`, e depois:
- `curl -s localhost:8080/api/saude`;
- `curl -s -X POST localhost:8080/api/analise -d '{"falhas":{"arestas":["t:999"]}}'`.

Expected:
- testes PASS e verificador com 0 bloqueios;
- a saúde mostra `vertices`/`arestas` de BH;
- o `t:999` devolve 400 `{"erro": "id desconhecido: t:999"}`;
- os tempos impressos são anotados para o PR.

- [ ] **Step 5: Commit**

```bash
git add adapters/http/servidor.py adapters/http/test_servidor.py
git commit -m "feat: servidor monta a rede de BH ao ligar"
```

### Task 7: Front no servidor e verificação no navegador

**Files:**
- Modify:
  - `front/.env.example` e `front/.env.local`: `VITE_USAR_MOCK=false`;
  - `README.md:20-30` (parte "Rodar", fora da área à mão): ligar o servidor antes, com o mock como opção;
  - `AGENTS.md:68`: linha "Front".
- Test: nada novo no front. O `buscarValidado` já passa toda resposta pelo `validarRede`/`validarAnalise`.

- [ ] **Step 1: Mudar os dois `.env` e os docs**

- [ ] **Step 2: Rodar o front**

Ligar `python adapters/http/servidor.py` em background e o `preview_start` do front.

Expected:
- **Carga:** BH carrega sem a nota "Dados de exemplo", e o console não mostra erro de contrato nem de CORS.
- **Derrubar:**
  - um trecho mostra "Calculando…" e depois o trecho caído e os pontos sem luz;
  - uma subestação tem o mesmo comportamento;
  - "Restaurar tudo" volta aos números do começo.
- **Animação:** a onda anda no sentido da árvore, saindo das subestações.
- **Cinco cliques rápidos:** anotar quanto leva até o último resultado.

- [ ] **Step 3: Testes do front**

Run: `npm --prefix front test`, `npm --prefix front run build` e `npx --prefix front tsc --noEmit -p front`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add front/.env.example README.md AGENTS.md
git commit -m "feat: front usa o servidor por padrão"
```
O `front/.env.local` está no `.gitignore` e não entra no commit.
