import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { validarAnalise, validarRede } from "../src/api/validar";
import { gerarAnalise } from "./analise_sintetica.mjs";
import { gerarRede, lerCsv } from "./mock_de_csv.mjs";

const CSV_EXEMPLO = {
  pontos: "id_osm,lat,lon\n10,-19.1234567,-43.9000000\n11,-19.1240000,-43.9010000\n",
  trechos: "id,de,para,comprimento_m,tipo_via\n1,10,11,120.50,residential\n",
  subestacoes: 'id_osm,nome,lat,lon,tensoes,tipo\n7,"Sub, Centro",-19.9000000,-43.9000000,138000;13800,distribution\n',
  linhas: "id_osm,tensao,coords\n30,138000,-19.9000000 -43.9000000;-19.9100000 -43.9100000\n",
};

test("lerCsv com aspas", () => {
  expect(lerCsv('id_osm,nome\n1,"Sub, Centro"\n')).toEqual([{ id_osm: "1", nome: "Sub, Centro" }]);
});

test("gera rede no contrato", () => {
  const r = gerarRede(CSV_EXEMPLO);
  expect(validarRede(r)).toEqual([]);
  expect(r.area).toBe("Belo Horizonte (dados de exemplo)");
  expect(r.pontos[0]).toEqual(["p:10", -19.123457, -43.9, 1]);
  expect(r.arestas[0]).toEqual(["t:1", "p:10", "p:11", "trecho", 1000]);
  expect(r.subestacoes[0]).toEqual(["s:7", "Sub, Centro", -19.9, -43.9, 1000]);
  expect(r.geometriaAT["at:30"]).toEqual([[-19.9, -43.9], [-19.91, -43.91]]);
  expect(r.arestas.some((a: unknown[]) => a[3] === "linha_at")).toBe(false);
});

const dados = (nome: string) => readFileSync(new URL(`../../data/bh/${nome}.csv`, import.meta.url), "utf-8");
const bh = JSON.parse(readFileSync(new URL("../src/mocks/rede.bh.json", import.meta.url), "utf-8"));

test("rede.bh.json commitado é válido", () => {
  expect(validarRede(bh)).toEqual([]);
});

test("rede.bh.json é fiel aos CSV", () => {
  const pontos = lerCsv(dados("pontos"));
  const trechos = lerCsv(dados("trechos_rua"));
  const subestacoes = lerCsv(dados("subestacoes"));
  const linhas = lerCsv(dados("linhas_at"));

  expect(bh.pontos.map((p: string[]) => p[0])).toEqual(pontos.map((p) => `p:${p.id_osm}`));
  expect(bh.arestas.map((a: string[]) => a.slice(0, 3))).toEqual(trechos.map((t) => [`t:${t.id}`, `p:${t.de}`, `p:${t.para}`]));
  expect(bh.subestacoes.map((s: string[]) => s[0])).toEqual(subestacoes.map((s) => `s:${s.id_osm}`));
  expect(Object.keys(bh.geometriaAT).sort()).toEqual(linhas.map((l) => `at:${l.id_osm}`).sort());

  const maior = linhas.reduce((a, b) => (b.coords.split(";").length > a.coords.split(";").length ? b : a));
  const esperado = maior.coords.split(";").map((par) => par.split(" ").map((x) => Number(Number(x).toFixed(6))));
  expect(bh.geometriaAT[`at:${maior.id_osm}`]).toEqual(esperado);
});

// Redes à mão para o gerador da análise: subestação em (0, 0), demanda 1 por ponto.
const sub = ["s:1", "Sub", 0, 0, 1000];
const p = (id: string, lat: number, lon: number) => [id, lat, lon, 1];
const t = (id: string, de: string, para: string, cap = 1000) => [id, de, para, "trecho", cap];
// t:bc escrito de c para b: o sinal do fluxo diz o sentido.
const cadeia = {
  area: "teste", geometriaAT: {}, subestacoes: [sub],
  pontos: [p("p:a", 0, 0.001), p("p:b", 0, 0.002), p("p:c", 0, 0.003), p("p:x", 5, 5)],
  arestas: [t("t:ab", "p:a", "p:b", 2), t("t:bc", "p:c", "p:b"), t("t:xx", "p:x", "p:x")],
};
const triangulo = {
  area: "teste", geometriaAT: {}, subestacoes: [sub],
  pontos: [p("p:a", 0, 0.001), p("p:b", 0, 0.002), p("p:c", 0.001, 0.002)],
  arestas: [t("t:ab", "p:a", "p:b"), t("t:bc", "p:b", "p:c"), t("t:ca", "p:c", "p:a")],
};
const fluxoDe = (a: { fluxo: [string, number, number][] }) => Object.fromEntries(a.fluxo.map(([id, f, u]) => [id, { f, u }]));

test("fluxo soma a demanda a jusante da subestação", () => {
  const f = fluxoDe(gerarAnalise(cadeia, {}, () => 0));
  expect(Math.abs(f["t:ab"].f)).toBe(2);
  expect(Math.abs(f["t:bc"].f)).toBe(1);
});

test("o sinal do fluxo segue o sentido da BFS", () => {
  const f = fluxoDe(gerarAnalise(cadeia, {}, () => 0));
  expect(f["t:ab"].f).toBe(2); // escrito a → b, energia vai de a para b
  expect(f["t:bc"].f).toBe(-1); // escrito c → b, energia vai de b para c
});

test("uso é fluxo/capacidade limitado a 1 e gargalo é uso ≥ 0,9", () => {
  const a = gerarAnalise(cadeia, {}, () => 0);
  expect(fluxoDe(a)["t:ab"].u).toBe(1);
  expect(a.gargalos).toEqual(["t:ab"]);
});

test("ponto sem alcance vira semEnergia", () => {
  expect(gerarAnalise(cadeia, {}, () => 0).semEnergia).toEqual({ pontos: ["p:x"], demanda: 1 });
});

test("totais e contrato", () => {
  const a = gerarAnalise(cadeia, {}, () => 0);
  expect(a.demandaTotal).toBe(4);
  expect(a.fluxoTotal).toBe(3);
  expect(a.tempoMs).toBe(0);
  expect(validarAnalise(a)).toEqual([]);
});

test("aresta do ciclo fora da árvore não entra em fluxo", () => {
  const f = fluxoDe(gerarAnalise(triangulo, {}, () => 0));
  expect(f["t:ab"].f).toBe(1);
  expect(f["t:ca"].f).toBe(-1); // escrito c → a, energia vai de a para c
  expect(f["t:bc"]).toBeUndefined();
});

test("analise.bh.json commitado segue o contrato e é o que o gerador produz", () => {
  const analiseBh = JSON.parse(readFileSync(new URL("../src/mocks/analise.bh.json", import.meta.url), "utf-8"));
  expect(validarAnalise(analiseBh)).toEqual([]);
  expect({ ...analiseBh, tempoMs: 0 }).toEqual(gerarAnalise(bh, {}, () => 0));
});
