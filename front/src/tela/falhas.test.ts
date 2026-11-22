import { expect, test } from "vitest";
import analiseMock from "../mocks/analise.json";
import rotaMock from "../mocks/rota-alternativa.json";
import pequena from "../mocks/rede.pequena.json";
import type { Analise, Rede, RotaAlternativa } from "../api/tipos";
import {
  ESTADO_INICIAL, alternarFalha, pedidoDe, pedidoPendente, reduzirFalhas, rotuloDoAlvo, type Alvo, type EstadoFalhas,
} from "./falhas";

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

// ── Religar (T21) ──
const rota = rotaMock as RotaAlternativa; // chavesParaFechar ["c:1"], parcial false
const comRota = (r: Partial<RotaAlternativa>): RotaAlternativa => ({ ...rota, ...r });
const semLuz = (demanda: number, pontos: string[] = ["p:1"]): Analise => ({ ...inicial, semEnergia: { pontos, demanda } });
/** t1 derrubado, análise com `semLuz` aceita */
const derrubado = (analise = semLuz(10040)) => {
  const um = passos(pronto, t1);
  return reduzirFalhas(um, { tipo: "resposta", versao: um.versao, resultado: { ok: analise } });
};
const responderRota = (e: EstadoFalhas, r: RotaAlternativa) => reduzirFalhas(e, { tipo: "rota", versao: e.versao, resultado: { ok: r } });
const responderAnalise = (e: EstadoFalhas, a: Analise) => reduzirFalhas(e, { tipo: "resposta", versao: e.versao, resultado: { ok: a } });

test("pedido leva as chaves fechadas", () => {
  expect(pedidoDe([t1], ["c:1"])).toEqual({ falhas: { arestas: ["t:1"], subestacoes: [] }, chavesFechadas: ["c:1"] });
});

test("religar: rota → análise com as chaves → pronta", () => {
  const busca = reduzirFalhas(derrubado(), { tipo: "acharRota" });
  expect(busca).toMatchObject({ calculando: true, rota: { fase: "buscando", semLuzAntes: 10040 } });
  expect(pedidoPendente(busca)).toEqual({ tipo: "rota", pedido: pedidoDe([t1], []) });
  const religando = responderRota(busca, rota);
  expect(religando).toMatchObject({ chavesFechadas: ["c:1"], calculando: true, rota: { fase: "religando", resultado: rota } });
  expect(religando.versao).toBeGreaterThan(busca.versao);
  expect(pedidoPendente(religando)).toEqual({ tipo: "analise", pedido: pedidoDe([t1], ["c:1"]) });
  const fim = responderAnalise(religando, comFalha);
  expect(fim).toMatchObject({ calculando: false, atual: comFalha, rota: { fase: "pronta" }, faltando: 0 });
  expect(pedidoPendente(fim)).toBeNull();
});

test("rota velha é ignorada", () => {
  const busca = reduzirFalhas(derrubado(), { tipo: "acharRota" });
  const outra = passos(busca, t2);
  const tarde = reduzirFalhas(outra, { tipo: "rota", versao: busca.versao, resultado: { ok: rota } });
  expect(tarde).toMatchObject({ chavesFechadas: [], rota: null });
  expect(pedidoPendente(tarde)?.tipo).toBe("analise");
});

test("segunda rota soma as chaves sem repetir", () => {
  const primeira = responderAnalise(responderRota(reduzirFalhas(derrubado(), { tipo: "acharRota" }), rota), comFalha);
  const busca = reduzirFalhas(primeira, { tipo: "acharRota" });
  expect(pedidoPendente(busca)?.pedido.chavesFechadas).toEqual(["c:1"]);
  const segunda = responderRota(busca, comRota({ chavesParaFechar: ["c:1", "c:2"] }));
  expect(segunda.chavesFechadas).toEqual(["c:1", "c:2"]);
});

test("rota sem chaves fica pronta sem calcular", () => {
  const fim = responderRota(reduzirFalhas(derrubado(), { tipo: "acharRota" }), comRota({ chavesParaFechar: [], caminho: [] }));
  expect(fim).toMatchObject({ calculando: false, chavesFechadas: [], rota: { fase: "pronta" } });
  expect(pedidoPendente(fim)).toBeNull();
});

test("erro na rota mantém lista e análise", () => {
  const antes = derrubado();
  const busca = reduzirFalhas(antes, { tipo: "acharRota" });
  const erro = reduzirFalhas(busca, { tipo: "rota", versao: busca.versao, resultado: { erro: "núcleo caiu" } });
  expect(erro).toMatchObject({ falhas: [t1], atual: antes.atual, erro: "núcleo caiu", calculando: false, rota: { fase: "erro" } });
});

test("mudar a lista zera o religamento", () => {
  const parcial = comRota({ parcial: true, religado: { pontos: 1463, demanda: 2.739 } });
  const fim = responderAnalise(responderRota(reduzirFalhas(derrubado(), { tipo: "acharRota" }), parcial), semLuz(0, []));
  expect(fim.faltando).toBeGreaterThan(0);
  // o faltante só sai com a análise nova (ver "lista nova depois de religar em parte…")
  expect(passos(fim, t2)).toMatchObject({ rota: null, chavesFechadas: [] });
  expect(reduzirFalhas(fim, { tipo: "restaurarTudo" })).toMatchObject({ rota: null, chavesFechadas: [], faltando: 0 });
});

test("faltando só com parcial pronto", () => {
  const parcial = comRota({ parcial: true, religado: { pontos: 1463, demanda: 2.739 } });
  const religando = responderRota(reduzirFalhas(derrubado(), { tipo: "acharRota" }), parcial);
  expect(religando.faltando).toBe(0);
  expect(responderAnalise(religando, semLuz(0, [])).faltando).toBeCloseTo(10037.261);
  const completo = responderRota(reduzirFalhas(derrubado(), { tipo: "acharRota" }), comRota({ religado: { pontos: 1463, demanda: 10040 } }));
  expect(responderAnalise(completo, semLuz(0, [])).faltando).toBe(0);
});

test("segunda busca guarda o faltante", () => {
  const parcial = comRota({ parcial: true, religado: { pontos: 1463, demanda: 3 } });
  const fim = responderAnalise(responderRota(reduzirFalhas(derrubado(), { tipo: "acharRota" }), parcial), semLuz(0, []));
  expect(fim.faltando).toBe(10037);
  const busca = reduzirFalhas(fim, { tipo: "acharRota" });
  expect(busca).toMatchObject({ faltando: 10037, rota: { semLuzAntes: 10037 } });
  expect(responderRota(busca, comRota({ chavesParaFechar: [], caminho: [] })).faltando).toBe(10037);
});

test("erro da análise do religamento devolve as chaves", () => {
  const antes = derrubado();
  const religando = responderRota(reduzirFalhas(antes, { tipo: "acharRota" }), rota);
  const erro = reduzirFalhas(religando, { tipo: "resposta", versao: religando.versao, resultado: { erro: "x" } });
  expect(erro).toMatchObject({ chavesFechadas: [], atual: antes.atual, calculando: false, rota: { fase: "erro" }, erro: "x" });
  const velha = reduzirFalhas(religando, { tipo: "resposta", versao: religando.versao - 1, resultado: { ok: comFalha } });
  expect(velha).toEqual(religando);
});

test("acharRota sem falhas ou calculando não faz nada", () => {
  expect(reduzirFalhas(pronto, { tipo: "acharRota" })).toEqual(pronto);
  const calculando = passos(pronto, t1);
  expect(reduzirFalhas(calculando, { tipo: "acharRota" })).toEqual(calculando);
});

test("lista nova depois de religar em parte não mostra 100% enquanto calcula", () => {
  const parcial = comRota({ parcial: true, religado: { pontos: 1463, demanda: 3 } });
  const fim = responderAnalise(responderRota(reduzirFalhas(derrubado(), { tipo: "acharRota" }), parcial), semLuz(0, []));
  const outra = passos(fim, t2);
  expect(outra).toMatchObject({ faltando: 10037, chavesFechadas: [], rota: null, calculando: true });
  expect(responderAnalise(outra, semLuz(500)).faltando).toBe(0);
  expect(reduzirFalhas(outra, { tipo: "resposta", versao: outra.versao, resultado: { erro: "x" } }).faltando).toBe(10037);
});

test("segunda busca não soma o que já está no faltante", () => {
  const parcial = comRota({ parcial: true, religado: { pontos: 10, demanda: 30 } });
  // 100 sem luz; a rota devolve 30 e 40 seguem sem caminho → faltam 70, e os 40 já estão dentro dos 70
  const fim = responderAnalise(responderRota(reduzirFalhas(derrubado(semLuz(100)), { tipo: "acharRota" }), parcial), semLuz(40));
  expect(fim.faltando).toBe(70);
  expect(reduzirFalhas(fim, { tipo: "acharRota" }).rota?.semLuzAntes).toBe(70);
});
