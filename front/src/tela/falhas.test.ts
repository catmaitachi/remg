import { expect, test } from "vitest";
import analiseMock from "../mocks/analise.json";
import pequena from "../mocks/rede.pequena.json";
import type { Analise, Rede } from "../api/tipos";
import { ESTADO_INICIAL, alternarFalha, alvoDoClique, pedidoDe, reduzirFalhas, rotuloDoAlvo, type Alvo, type EstadoFalhas } from "./falhas";

const t1: Alvo = { tipo: "aresta", id: "t:1" };
const t2: Alvo = { tipo: "aresta", id: "t:2" };
const s1: Alvo = { tipo: "subestacao", id: "s:1" };
const inicial = analiseMock as unknown as Analise;
const comFalha = { ...inicial, tempoMs: 999 };
const pronto = reduzirFalhas(ESTADO_INICIAL, { tipo: "inicial", analise: inicial });
const passos = (e: EstadoFalhas, ...alvos: Alvo[]) => alvos.reduce((x, alvo) => reduzirFalhas(x, { tipo: "alternar", alvo }), e);

test("alternar põe no fim e tira pelo id", () => {
  expect(alternarFalha([], t1)).toEqual([t1]);
  expect(alternarFalha([t1], s1)).toEqual([t1, s1]);
  expect(alternarFalha([t1, s1], { tipo: "aresta", id: "t:1" })).toEqual([s1]);
});

test("pedido separa arestas e subestações", () => {
  expect(pedidoDe([t1, s1, t2])).toEqual({ falhas: { arestas: ["t:1", "t:2"], subestacoes: ["s:1"] }, chavesFechadas: [] });
});

test("rótulo usa o nome da subestação e o número do trecho", () => {
  const rede = pequena as unknown as Rede;
  expect(rotuloDoAlvo(s1, rede)).toBe("Subestação Centro (exemplo)");
  expect(rotuloDoAlvo({ tipo: "aresta", id: "t:678" }, rede)).toBe("Trecho 678");
});

test("alvoDoClique ignora as outras camadas", () => {
  for (const camada of ["linhas-at", "chaves", "gargalos-alerta"]) expect(alvoDoClique(camada, { id: "t:1", tipo: "trecho" })).toBeNull();
  expect(alvoDoClique("trechos", { id: "t:1", tipo: "trecho" })).toEqual(t1);
  expect(alvoDoClique("caidos", { id: "t:1", tipo: "trecho" })).toEqual(t1);
  expect(alvoDoClique("subestacoes", ["s:1", "Centro", 0, 0, 1])).toEqual(s1);
  expect(alvoDoClique("trechos", undefined)).toBeNull();
});

test("alvoDoClique não derruba chave", () => {
  expect(alvoDoClique("trechos", { id: "c:1", tipo: "chave" })).toBeNull();
});

test("pôr e tirar antes da resposta volta ao início", () => {
  const um = passos(pronto, t1);
  expect(um.calculando).toBe(true);
  const dois = passos(um, t1);
  expect(dois).toMatchObject({ falhas: [], atual: inicial, calculando: false, erro: null });
  const tarde = reduzirFalhas(dois, { tipo: "resposta", versao: um.versao, resultado: { ok: comFalha } });
  expect(tarde).toEqual(dois);
});

test("resposta velha é ignorada", () => {
  const um = passos(pronto, t1), dois = passos(um, t2);
  const velha = reduzirFalhas(dois, { tipo: "resposta", versao: um.versao, resultado: { ok: comFalha } });
  expect(velha.atual).toBe(inicial);
  expect(velha.calculando).toBe(true);
  const nova = reduzirFalhas(dois, { tipo: "resposta", versao: dois.versao, resultado: { ok: comFalha } });
  expect(nova).toMatchObject({ atual: comFalha, calculando: false });
});

test("erro mantém a lista e a última análise boa", () => {
  const um = passos(pronto, t1);
  const erro = reduzirFalhas(um, { tipo: "resposta", versao: um.versao, resultado: { erro: "núcleo caiu" } });
  expect(erro).toMatchObject({ falhas: [t1], atual: inicial, erro: "núcleo caiu", calculando: false });
  expect(passos(erro, t2).calculando).toBe(true);
  const ok = reduzirFalhas(passos(erro, t2), { tipo: "resposta", versao: erro.versao + 1, resultado: { ok: comFalha } });
  expect(ok.erro).toBeNull();
});

test("restaurar tudo limpa erro e calculando", () => {
  const um = passos(pronto, t1, s1);
  const comErro = reduzirFalhas(um, { tipo: "resposta", versao: um.versao, resultado: { erro: "x" } });
  const limpo = reduzirFalhas(comErro, { tipo: "restaurarTudo" });
  expect(limpo).toMatchObject({ falhas: [], atual: inicial, erro: null, calculando: false });
  expect(limpo.versao).toBeGreaterThan(comErro.versao);
});

test("análise inicial atrasada não apaga as falhas", () => {
  const um = passos(ESTADO_INICIAL, t1);
  const resp = reduzirFalhas(um, { tipo: "resposta", versao: um.versao, resultado: { ok: comFalha } });
  const tarde = reduzirFalhas(resp, { tipo: "inicial", analise: inicial });
  expect(tarde).toMatchObject({ inicial, atual: comFalha, falhas: [t1] });
});
