---
titulo: T03 · 🛠️ Montar o repositório e o build C++ em todas as máquinas
labels: grafo, essencial
release: v0.1
depende: T01
---
> ⚠️ Superada pela D26 (núcleo em Python). Ver T32/T33.

## 🎯 O que é
Criar as pastas da [arquitetura](../spec/05-arquitetura.md), o `CMakeLists.txt` com os alvos (`nucleo`, `cintilante_py`, `cintilante-cli`, `testes`) e garantir que **todo mundo** compila o módulo e roda um "olá" do servidor Python.

## 🤔 Por que importa
Build quebrado na máquina de alguém no dia 15 custa um dia inteiro. Resolvendo no começo, ninguém fica travado.

## 🧭 Como começar
1. Criar as pastas vazias com um `.gitkeep`.
2. `CMakeLists.txt` com g++ (o MinGW 15 funciona no Windows).
3. Alvo `cintilante_py` com `pybind11` em `adapters/modulo_py/`, expondo uma função `saude()`.
4. ⚠️ No Windows, conferir se o módulo feito com MinGW carrega no Python instalado (o oficial é MSVC). Plano B: MSVC só para o módulo ([05](../spec/05-arquitetura.md)).
5. Servidor Python mínimo em `adapters/http/` com `GET /api/saude` respondendo `{ "ok": true }`, chamando o módulo.
6. 🛡️ No `CMakeLists.txt`, ligar os hooks do verificador na configuração, para quem compila ficar com eles ativos mesmo sem IA:
   `execute_process(COMMAND git config core.hooksPath .githooks WORKING_DIRECTORY ${CMAKE_SOURCE_DIR})`

## ✅ Pronto quando
- [ ] os **4 integrantes** compilaram e abriram `http://localhost:8080/api/saude`
- [ ] passo a passo do build no `README.md` (seção "Como rodar")
- [ ] um teste bobo rodando no alvo `testes`
- [ ] depois de rodar o CMake, `git config core.hooksPath` responde `.githooks`

## 📚 Leia antes
[05](../spec/05-arquitetura.md)
