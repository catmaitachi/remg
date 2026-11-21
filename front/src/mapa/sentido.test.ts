import { expect, test } from "vitest";
import redeBh from "../mocks/rede.bh.json";
import analiseBh from "../mocks/analise.bh.json";
import type { Analise, Rede } from "../api/tipos";
import { ONDA } from "./onda";
import { sentidoDoFluxo } from "./sentido";

const ponto = (id: string, lon: number) => [id, 0, lon, 1];
const t = (id: string, de: string, para: string, tipo = "trecho") => [id, de, para, tipo, 100];
const rede = (arestas: unknown[][], extra: unknown[][] = []) => ({
  area: "teste", geometriaAT: {},
  subestacoes: [["s:1", "Sub", 0, 0, 1000], ["s:2", "Sub 2", 0, 0.01, 1000]],
  pontos: [ponto("p:1", 0.001), ponto("p:2", 0.002), ponto("p:3", 0.004), ...extra],
  arestas,
}) as unknown as Rede;
const analise = (fluxo: [string, number, number][]) =>
  ({ fluxoTotal: 0, demandaTotal: 0, fluxo, gargalos: [], semEnergia: { pontos: [], demanda: 0 }, tempoMs: 0 }) as Analise;

const cadeia = rede([t("t:a", "s:1", "p:1"), t("t:b", "p:1", "p:2"), t("t:c", "p:2", "p:3")]);

test("cadeia: distância cresce no sentido do fluxo", () => {
  const s = sentidoDoFluxo(cadeia, analise([["t:a", 3, 0.1], ["t:b", 2, 0.1], ["t:c", 1, 0.1]]));
  const [a, b, c] = ["t:a", "t:b", "t:c"].map((id) => s.get(id)!);
  expect(a.distInicio).toBe(0);
  expect(a.comprimento).toBeGreaterThan(100); // 0,001° de longitude no equador ≈ 111 m
  expect(b.distInicio).toBeCloseTo(a.comprimento, 6);
  expect(c.distInicio).toBeCloseTo(a.comprimento + b.comprimento, 6);
  expect([a, b, c].every((x) => x.positivo)).toBe(true);
});

test("aresta escrita ao contrário com fluxo negativo", () => {
  const invertida = rede([t("t:a", "s:1", "p:1"), t("t:b", "p:2", "p:1"), t("t:c", "p:2", "p:3")]);
  const s = sentidoDoFluxo(invertida, analise([["t:a", 3, 0.1], ["t:b", -2, 0.1], ["t:c", 1, 0.1]]));
  expect(s.get("t:b")!.positivo).toBe(false);
  expect(s.get("t:b")!.distInicio).toBeCloseTo(s.get("t:a")!.comprimento, 6);
  expect(s.get("t:c")!.distInicio).toBeCloseTo(s.get("t:a")!.comprimento + s.get("t:b")!.comprimento, 6);
});

test("tempo acumula pela velocidade da faixa", () => {
  const s = sentidoDoFluxo(cadeia, analise([["t:a", 3, 0.1], ["t:b", 2, 0.7], ["t:c", 1, 0.95]]));
  const [a, b, c] = ["t:a", "t:b", "t:c"].map((id) => s.get(id)!);
  expect(a.tempoInicio).toBe(0);
  expect(b.tempoInicio).toBeCloseTo(a.comprimento / ONDA.VEL[0], 9);
  expect(c.tempoInicio).toBeCloseTo(a.comprimento / ONDA.VEL[0] + b.comprimento / ONDA.VEL[1], 9);
});

test("ciclo não trava e vale 0", () => {
  const ciclo = rede([t("t:x", "p:1", "p:2"), t("t:y", "p:2", "p:3"), t("t:z", "p:3", "p:1")]);
  const s = sentidoDoFluxo(ciclo, analise([["t:x", 1, 0.1], ["t:y", 1, 0.1], ["t:z", 1, 0.1]]));
  for (const id of ["t:x", "t:y", "t:z"]) expect([s.get(id)!.distInicio, s.get(id)!.tempoInicio], id).toEqual([0, 0]);
});

test("ciclo alimentado por fonte não zera a cauda", () => {
  const r = rede([
    t("t:sa", "s:1", "p:1"), t("t:ab", "p:1", "p:2"), t("t:bc", "p:2", "p:3"), t("t:ca", "p:3", "p:1"),
    t("t:cd", "p:3", "p:4"), t("t:de", "p:4", "p:5"),
  ], [ponto("p:4", 0.005), ponto("p:5", 0.006)]);
  const s = sentidoDoFluxo(r, analise(["t:sa", "t:ab", "t:bc", "t:ca", "t:cd", "t:de"].map((id) => [id, 1, 0.1] as [string, number, number])));
  const de = (id: string) => s.get(id)!;
  expect(de("t:ab").distInicio).toBeCloseTo(de("t:sa").comprimento, 6);
  expect(de("t:cd").distInicio).toBeCloseTo(de("t:bc").distInicio + de("t:bc").comprimento, 6);
  expect(de("t:de").distInicio).toBeCloseTo(de("t:cd").distInicio + de("t:cd").comprimento, 6);
  expect(de("t:de").tempoInicio).toBeGreaterThan(de("t:cd").tempoInicio);
});

test("linha_at fica fora", () => {
  const comAt = rede([t("at:1", "s:2", "s:1", "linha_at"), t("t:a", "s:1", "p:1")]);
  const s = sentidoDoFluxo(comAt, analise([["at:1", 50, 0.5], ["t:a", 3, 0.1]]));
  expect(s.has("at:1")).toBe(false);
  expect(s.get("t:a")!.distInicio).toBe(0);
});

test("id fora da rede é ignorado", () => {
  const s = sentidoDoFluxo(cadeia, analise([["t:nada", 5, 0.1], ["t:a", 3, 0.1]]));
  expect(s.has("t:nada")).toBe(false);
  expect(s.size).toBe(1);
});

test("mock de BH: nenhum trecho anda para a origem", () => {
  const r = redeBh as unknown as Rede, a = analiseBh as unknown as Analise;
  const s = sentidoDoFluxo(r, a);
  expect(s.size).toBe(a.fluxo.length);
  // pontas no sentido do fluxo: entrada → saída
  const pontas = new Map(r.arestas.map(([id, de, para]) => [id, [de, para]]));
  const chegaEm = new Map<string, number>(); // ponto → distância de chegada pelo trecho que entra nele
  const sai = new Map<string, string[]>();
  for (const [id, f] of a.fluxo) {
    const [de, para] = pontas.get(id)!;
    const [ini, fim] = f > 0 ? [de, para] : [para, de];
    chegaEm.set(fim, s.get(id)!.distInicio + s.get(id)!.comprimento);
    sai.set(ini, [...(sai.get(ini) ?? []), id]);
  }
  for (const [p, ids] of sai) for (const id of ids) {
    expect(s.get(id)!.distInicio, id).toBeCloseTo(chegaEm.get(p) ?? 0, 6);
  }
});
