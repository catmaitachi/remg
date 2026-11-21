import { describe, expect, test } from "vitest";
import pequena from "../mocks/rede.pequena.json";
import analise from "../mocks/analise.json";
import rota from "../mocks/rota-alternativa.json";
import criticos from "../mocks/criticos.json";
import saude from "../mocks/saude.json";
import { validarAnalise, validarCriticos, validarRede, validarRota, validarSaude } from "./validar";

const copia = () => structuredClone(pequena) as any;

describe("validarRede", () => {
  test("mock pequeno é válido", () => expect(validarRede(pequena)).toEqual([]));

  test("aresta com ponto inexistente", () => {
    const r = copia();
    r.arestas[0][2] = "p:999";
    expect(validarRede(r).join()).toMatch(/p:999/);
  });

  test("tipo de aresta desconhecido", () => {
    const r = copia();
    r.arestas[0][3] = "cabo";
    expect(validarRede(r).join()).toMatch(/cabo/);
  });

  test("linha AT com 1 coordenada", () => {
    const r = copia();
    r.geometriaAT = { "at:1": [[-19.9, -43.9]] };
    expect(validarRede(r).join()).toMatch(/at:1/);
  });

  test("id repetido", () => {
    const r = copia();
    r.pontos[1][0] = r.pontos[0][0];
    expect(validarRede(r).join()).toMatch(/repetido/);
  });

  test("latitude fora do mundo", () => {
    const r = copia();
    r.pontos[0][1] = 120;
    expect(validarRede(r).length).toBeGreaterThan(0);
  });

  test("não é objeto", () => expect(validarRede(null).length).toBeGreaterThan(0));
});

describe("mocks dos outros endpoints", () => {
  const ids = new Set([...pequena.pontos, ...pequena.arestas, ...pequena.subestacoes].map((x) => x[0] as string));

  test("usam ids da rede pequena", () => {
    const usados = [
      ...analise.fluxo.map((f) => f[0] as string), ...analise.gargalos, ...analise.semEnergia.pontos,
      ...rota.caminho, ...rota.chavesParaFechar, ...criticos.pontes, ...criticos.articulacoes,
    ];
    expect(usados.filter((id) => !ids.has(id))).toEqual([]);
  });

  test("analise.json segue o formato", () => {
    expect(validarAnalise(analise)).toEqual([]);
    expect(validarAnalise({ ...analise, fluxo: [["t:1", 0, 0]] }).join()).toMatch(/fluxo/);
    expect(validarAnalise({ ...analise, fluxo: [["t:1", 10, 1.5]] }).join()).toMatch(/uso/);
    const { tempoMs, ...semTempo } = analise;
    expect(validarAnalise(semTempo).join()).toMatch(/tempoMs/);
  });

  test("fluxo negativo é aceito", () => {
    expect(validarAnalise({ ...analise, fluxo: [["t:1", -10, 0.5]] })).toEqual([]);
  });

  test("fluxo zero, NaN e infinito são rejeitados", () => {
    for (const v of [0, NaN, Infinity, -Infinity]) {
      expect(validarAnalise({ ...analise, fluxo: [["t:1", v, 0.5]] }).join(), String(v)).toMatch(/fluxo/);
    }
  });

  test("analise.json usa fluxo negativo no t:3", () => {
    expect(analise.fluxo.find((f) => f[0] === "t:3")![1]).toBe(-95);
  });

  const arestas = new Map(pequena.arestas.map((a) => [a[0] as string, a]));

  test("analise.json é coerente com a rede pequena", () => {
    for (const [id, fluxo, uso] of analise.fluxo as [string, number, number][]) {
      expect(uso, id).toBeCloseTo(Math.abs(fluxo) / (arestas.get(id)![4] as number), 2);
    }
    const usoDe = new Map(analise.fluxo.map((f) => [f[0], f[2] as number]));
    for (const id of analise.gargalos) expect(usoDe.get(id), id).toBeGreaterThanOrEqual(0.9);
    expect(analise.fluxoTotal).toBe(analise.demandaTotal - analise.semEnergia.demanda);
  });

  test("caminho da rota alternativa é contíguo", () => {
    const pontas = rota.caminho.map((id) => arestas.get(id)!.slice(1, 3) as string[]);
    pontas.slice(1).forEach((p, i) => expect(p.some((v) => pontas[i].includes(v)), rota.caminho[i + 1]).toBe(true));
  });

  test("rota, criticos e saude seguem o formato", () => {
    expect(validarRota(rota)).toEqual([]);
    expect(validarRota({ ...rota, parcial: "não" }).join()).toMatch(/parcial/);
    expect(validarCriticos(criticos)).toEqual([]);
    expect(validarCriticos({ pontes: [] }).length).toBeGreaterThan(0);
    expect(validarSaude(saude)).toEqual([]);
    expect(validarSaude({ ok: "sim" }).length).toBeGreaterThan(0);
  });
});
