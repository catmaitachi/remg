# ⚡ Cintilante

A rede de distribuição de energia de **Belo Horizonte** desenhada como grafo sobre o mapa real, com o fluxo animado, os gargalos, as falhas e as rotas alternativas.
Trabalho Prático de Grafos, tema 4. 📚 Spec completa em [`docs/spec/`](docs/spec/README.md).

## 🚀 Como rodar

### 🐍 Núcleo e servidor

**Precisa ter:** Python 3.12 ou mais novo e git. Não tem nada para compilar nem instalar: o núcleo só usa a biblioteca padrão.

1. **Testes:** `python -m unittest discover -s tests -t .` (núcleo) e `python -m unittest discover -s adapters/http` (servidor).
2. **Servidor:** `python adapters/http/servidor.py` e abra <http://localhost:8080/api/saude>. A resposta é `{"ok": true}`.

- 🔌 `não deu para abrir a porta 8080` → outro programa está usando a porta. Feche-o e rode de novo.

### 🗺️ Front

**Precisa ter:** Node 22 e npm, e o servidor ligado (acima). Sem o servidor, dá para usar os dados de exemplo.

1. **Instalar:** `cd front && npm install`. Isso também liga os hooks do verificador.
2. **Escolher de onde vêm os dados:** copie `front/.env.example` para `front/.env.local`.
   - `VITE_USAR_MOCK=false` (o padrão) → busca o servidor em `http://localhost:8080/api`, com os números do núcleo.
   - `VITE_USAR_MOCK=true` → usa a rede de BH de exemplo (`front/src/mocks/rede.bh.json`), sem servidor.
3. **Rodar:** `npm run dev` e abra <http://localhost:5173>.
4. **Testes:** `npm test`.

- 🗺️ No exemplo, a geometria é real (ruas e linhas de BH, da T06), mas capacidade e demanda são **valores fixos de mentira** (1000 kVA e 1 kVA), porque quem calcula os valores de verdade é o núcleo.
- 🔁 Os CSV de `data/bh/` mudaram? Rode `npm run mock:bh` para gerar o mock de novo.
- 🔌 `Não deu para carregar a rede` → o servidor não está ligado. Ligue o servidor ou use `VITE_USAR_MOCK=true`.

## 🛡️ Regras do repositório

- Os hooks do verificador ligam sozinhos (Claude Code ou `npm install`). Para ligar à mão: `git config core.hooksPath .githooks`
- Todo PR passa pelo check **verificar** e precisa de 1 aprovação. Ninguém commita direto na `main`.
- Commit `tipo: descrição`, curto e **sem coautoria de IA** (D27): o hook barra o `Co-Authored-By` de IA. O uso de IA vai só em [`docs/ia/registro.md`](docs/ia/registro.md).
- Detalhes: [`docs/spec/11-verificador.md`](docs/spec/11-verificador.md) · regras para IA: [`AGENTS.md`](AGENTS.md)

## 🏛️ Arquitetura

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/diagramas/hexagono-dark.svg">
  <img src="docs/diagramas/hexagono.svg" alt="Arquitetura hexagonal do Cintilante: front e benchmark entram pelos adaptadores, passam pela porta ServicoDeAnalise e chegam ao núcleo Python (casos de uso, domínio e grafo); os dados entram pela porta FonteDeRede, implementada pelo leitor de CSV">
</picture>

Núcleo Python feito à mão (D26), com servidor, CLI e leitura de dados como adaptadores. Detalhes em [`docs/spec/05-arquitetura.md`](docs/spec/05-arquitetura.md).

## ✍️ Como o sistema funciona

> Cada seção abaixo é **escrita à mão por quem fez a feature** (regra D9), depois que ela funciona, e termina com `✍️ Escrito por: <nome>`. A IA não edita esta parte: a guarda do Claude barra.

<!-- ✍️ ESCRITO À MÃO: daqui para baixo a IA não edita -->
