# 01 · 🗂️ Registro de decisões

> [!NOTE]
> Mudou alguma coisa? Acrescente uma linha. Não apague a linha antiga: risque com `~~texto~~` e diga o que entrou no lugar.

## ✅ Decididas

| # | Data | Tema | Decisão | Por quê |
|---|---|---|---|---|
| D1 | 09/11 | 🏷️ Tema | Tema 4: distribuição de **energia** | definido pelo grupo |
| D2 | 09/11 | 🏙️ Área | **Belo Horizonte inteira**. Região metropolitana fica como extra | cobrir a cidade real, e a área é um parâmetro do sistema |
| D3 | 09/11 | 📦 Dados | **OSM + sintética**: alta tensão real do OpenStreetMap e distribuição gerada sobre as ruas | o OSM de BH tem a alta tensão (25 subestações, 61 linhas), mas quase nada de distribuição |
| D4 | 09/11 | 🏛️ Arquitetura | **Hexagonal**: núcleo ~~em C++~~ (em Python desde a D26) com as regras de negócio, e servidor, CLI e leitor de dados como adaptadores | o núcleo pode ser testado sozinho, cada camada tem dono, e o UML sai quase pronto |
| ~~D5~~ | 09/11 | ⚙️ Núcleo | ~~**C++ feito à mão**, em duas camadas: grafo genérico + domínio elétrico~~ → virou **D26** | ~~com BH inteira, o Python levou ~3 s por cálculo e o C++ ~0,1 s (ver 📊 abaixo)~~ |
| D6 | 09/11 | 📚 Bibliotecas | **Só o grafo e os algoritmos** precisam ser feitos à mão. Servidor, leitura de arquivos e front podem usar bibliotecas | regra do PDF e do grupo |
| D7 | 09/11 | 🗺️ Front | **React + MapLibre GL**, com deck.gl para animar muitas arestas | mapa vetorial com camadas animáveis |
| D8 | 09/11 | 🧮 Algoritmos essenciais | **Fluxo máximo + corte mínimo** (gargalos) · **falhas** (Tarjan + BFS) · **rotas alternativas** (Dijkstra) | as quatro perguntas do problema |
| D9 | 09/11 | 📝 README | Cada feature principal é descrita no README **à mão, por quem fez a task** | todo integrante precisa saber como o sistema funciona |
| D10 | 09/11 | 🤖 IA | Uso de IA **declarado e registrado**, com as decisões tomadas por pessoas. ~~Trailer e label no git~~ saíram na **D27** | ver [09-uso-de-ia](09-uso-de-ia.md) |
| D11 | 09/11 | 👥 Papéis | **Sem dono fixo.** As tasks vão para o GitHub sem responsável e cada um se atribui | basta fazer o assign depois |
| D12 | 09/11 | 🔍 Revisões primeiro | **Arquitetura (T01) e direção visual (T02)** são as primeiras tasks, decididas em grupo | o resto do trabalho depende delas |
| D13 | 09/11 | 📋 Tasks | Cada task tem um arquivo em `docs/tasks/` com **descrição amigável** e vira issue por script | todo integrante entende o que fazer sem precisar perguntar |
| D14 | 09/11 | 🤖 Instruções para IA | `AGENTS.md` na raiz (vale para qualquer ferramenta) + `CLAUDE.md` importando ele | as regras do grupo valem também para a IA de cada um |
| D15 | 09/11 | 🛡️ Verificador | **GitHub Actions obrigatório** em todo PR + hooks locais **ligados automaticamente** (Claude Code, AGENTS.md, npm). Feito antes de qualquer task de código | o grupo não vai lembrar de rodar; o padrão de qualidade precisa ser forçado |
| D16 | 09/11 | 🤖 Guarda do Claude | Hook `PreToolUse` barra o Claude de editar ~~`core/grafo/`~~ (saiu na D27), a parte à mão do README e de pular o verificador, e pede aprovação para mexer na fiscalização | o Claude também precisa seguir as diretrizes, não só o commit |
| D17 | 09/11 | 🔒 Proteção da `main` | Ruleset `proteger-main`: PR + 1 aprovação + check `verificar` + só merge. **Exceção:** admin (Lucas) pode mergear o próprio PR sem aprovação, **só via PR** (push direto continua bloqueado) | sem isso o check vermelho é só aviso · o GitHub não deixa ninguém aprovar o próprio PR |
| ~~D18~~ | 09/11 | ✍️ IA no `core/grafo/` | ~~A IA **pode** escrever o código dos algoritmos. Toda função ganha uma **ficha de entendimento preenchida à mão** (V14, V15, G2)~~ → virou **D27** (sem ficha; fica o README à mão) | ~~o grupo vai usar IA de qualquer jeito; o que importa é cada um entender e explicar o que commitou~~ |
| D19 | 09/11 | 🏷️ Releases | Cada fase vira uma versão com meta (v0.1 Base → v1.0 Entrega). Fechar a milestone cria a tag e a release | ver se o grupo está em dia e ter marcos para citar no relatório |
| D20 | 10/11 | ⚙️ Automação | Script + GitHub Actions para tudo que der (arrumar PR, fechar milestone, release, limpar branches); o resto é do agente (`comecar.py` acha a task pelo pedido). **Sem token extra** | o grupo não vai lembrar de passos de processo |
| ~~D21~~ | 10/11 | 🌐 Servidor | ~~**Python**, com o núcleo C++ importado como módulo (`pybind11`). Substitui a P1~~ → virou **D26** (o servidor continua em Python, sem módulo) | ver [05](05-arquitetura.md) |
| D22 | 10/11 | 🔌 Portas | Servidor e CLI falam com o núcleo **só pela porta** `ServicoDeAnalise`. Exceção: o ponto de montagem | o núcleo continua trocável e testável sozinho |
| D23 | 10/11 | 🔢 Ids | A tabela `"t:678"` ↔ número do grafo fica no **domínio** (`RedeEletrica`) | servidor e CLI usam a mesma conversão |
| D24 | 10/11 | 🌳 Rede sintética | **Gerada ao ligar** o servidor (semente fixa). `cintilante-cli exportar` grava a rede num arquivo **fora do git**, no formato de entrada da CLI | sem arquivo velho fora de sincronia com o código, e o benchmark (T22) ainda lê a rede real |
| D25 | 10/11 | 🔌 API | Contrato do [06](06-api.md) **congelado**. Mudar = PR com o 06 e os mocks do front juntos | front e back trabalham em paralelo sem se desencontrar |
| D26 | 19/11 | ⚙️ Núcleo | **Python feito à mão**, nas mesmas duas camadas (grafo genérico + domínio elétrico) e **sem módulo `pybind11`**: servidor e CLI importam o núcleo direto. Os **~3 s por cálculo** medidos (📊) são aceitos: a análise inicial roda uma vez, ao ligar o servidor, e Derrubar/Religar mostram "calculando…". Substitui a ~~D5~~ e a ~~D21~~. O `remg` já nasce assim (D27) | código mais fácil de entender e explicar por todo o grupo |
| D27 | 21/11 | 🙅 Menos IA no git | **Nenhum commit com coautoria de IA** (V17 barra), sem label `ia-assistida` e **sem ficha ✍️**. Commits curtos `tipo: descrição` e tasks curtas. A IA continua declarada só em `docs/ia/registro.md` e no relatório (09). O entendimento fica no **README à mão** (D9) | decisão do grupo: menos presença de IA no histórico |

## 🟡 Propostas (caminho padrão, pode ajustar)

| # | Tema | Proposta | Onde |
|---|---|---|---|
| ~~P1~~ | 🌐 Adaptador HTTP | ~~C++ com `cpp-httplib` + `nlohmann/json`~~ virou **D21** (Python + `pybind11`) | [05](05-arquitetura.md) |
| P2 | 🌊 Algoritmo de fluxo | **Dinic** (Edmonds-Karp só para comparar) | [04](04-algoritmos.md) |
| P3 | 🌳 Rede sintética | Dijkstra com várias fontes a partir das subestações → rede radial · chaves de manobra nas fronteiras entre subestações | [03](03-modelagem.md) |
| P4 | 🚧 O que é gargalo | aresta do corte mínimo **ou** uso ≥ 90% da capacidade | [04](04-algoritmos.md) |
| P5 | 📦 Download dos dados | Overpass para BH (uma vez só) com o arquivo processado salvo no repo · Geofabrik como plano B | [02](02-dados.md) |
| P6 | 🔀 Merge de PR | merge commit, **sem squash**, para preservar os commits individuais | [08](08-processo.md) |
| P7 | 🗺️ Mapa de fundo | OpenFreeMap (gratuito, sem chave de API) | [07](07-frontend.md) |
| ~~P8~~ | 🛡️ Verificador | virou **D15** | [11](11-verificador.md) |
| P9 | 📐 Diagramas do relatório e dos slides | skill `diagram-design`, ligada só neste projeto, no `.claude/settings.local.json` de quem usa | T01, T25 |

## ❓ Pendentes

| # | Pergunta | Quem decide | Até quando |
|---|---|---|---|
| Q1 | A Etapa 1 (modelagem e plano) precisa de um **documento separado** ou entra no relatório final? | perguntar ao professor | 11/11 |
| Q2 | Capacidade das subestações e demanda dos consumidores: que valores usar? | quem pegar a task da rede sintética | início da task |
| Q3 | O vídeo vai ser **um** vídeo do grupo ou um trecho gravado por pessoa? | grupo | 18/11 |
| Q4 | Qual a **data da apresentação presencial** de 10 min? | perguntar ao professor | 11/11 |
| ~~Q5~~ | ~~Rede sintética: gerar ao ligar ou salvar em CSV?~~ virou **D24** | | |

## 📊 Medição que apoiou a ~~D5~~ (histórico, ver D26)

Benchmark de descarte (fluxo máximo feito à mão em malha sintética, 4 subestações, mesmo resultado nas duas linguagens):

| Grafo | Algoritmo | 🐍 Python | ⚙️ C++ |
|---|---|---|---|
| ~10 mil nós (1 regional) | Dinic | 0,40 s | 0,012 s |
| ~62 mil nós (BH inteira) | Edmonds-Karp | 3,94 s | 0,114 s |
| ~62 mil nós (BH inteira) | Dinic | 2,98 s | 0,103 s |
