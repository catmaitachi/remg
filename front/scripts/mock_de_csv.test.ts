import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { validarRede } from "../src/api/validar";
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
