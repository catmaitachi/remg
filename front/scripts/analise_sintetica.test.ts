import { expect, test } from "vitest";
import pequena from "../src/mocks/rede.pequena.json";
import { validarAnalise } from "../src/api/validar";
import { gerarAnalise } from "./analise_sintetica.mjs";

// Redes à mão: demanda 1 por ponto. A raiz de cada subestação é o ponto mais perto dela.
const p = (id: string, lat: number, lon: number) => [id, lat, lon, 1];
const t = (id: string, de: string, para: string, tipo = "trecho") => [id, de, para, tipo, 1000];
const rede = (subestacoes: unknown[], pontos: unknown[], arestas: unknown[]) => ({ area: "teste", geometriaAT: {}, subestacoes, pontos, arestas });
const s1 = ["s:1", "Sub 1", 0, 0, 1000];
const s2 = ["s:2", "Sub 2", 0, 1, 1000];

// s:1 → p:a –t:ab– p:b –t:bc– p:c
const cadeia = rede([s1], [p("p:a", 0, 0.001), p("p:b", 0, 0.002), p("p:c", 0, 0.003)], [t("t:ab", "p:a", "p:b"), t("t:bc", "p:b", "p:c")]);
// raiz p:a; árvore t:ab e t:ca; t:bc fica fora (o ciclo)
const triangulo = rede([s1], [p("p:a", 0, 0.001), p("p:b", 0, 0.002), p("p:c", 0.001, 0.002)],
  [t("t:ab", "p:a", "p:b"), t("t:bc", "p:b", "p:c"), t("t:ca", "p:c", "p:a")]);
// duas árvores, uma por subestação, e uma chave aberta entre elas
const duas = rede([s1, s2], [p("p:a", 0, 0.001), p("p:b", 0, 0.002), p("p:d", 0, 0.999), p("p:e", 0, 0.998)],
  [t("t:ab", "p:a", "p:b"), t("t:de", "p:d", "p:e"), t("c:1", "p:b", "p:e", "chave")]);

const ids = (a: { fluxo: [string, number, number][] }) => a.fluxo.map(([id]) => id).sort();
const vazio = (r: unknown) => gerarAnalise(r, {}, () => 0);

test("trecho da raiz caído apaga tudo abaixo dele", () => {
  const a = gerarAnalise(cadeia, { falhas: { arestas: ["t:ab"] } }, () => 0);
  expect(a.semEnergia).toEqual({ pontos: ["p:b", "p:c"], demanda: 2 });
  expect(a.fluxo).toEqual([]);
  expect(a.fluxoTotal).toBe(1);
});

test("trecho fora da árvore caído não muda nada", () => {
  expect(gerarAnalise(triangulo, { falhas: { arestas: ["t:bc"] } }, () => 0)).toEqual(vazio(triangulo));
});

test("a malha não religa por outro caminho", () => {
  const a = gerarAnalise(triangulo, { falhas: { arestas: ["t:ab"] } }, () => 0);
  // p:b ainda encosta em p:c por t:bc, mas t:bc não é da árvore
  expect(a.semEnergia.pontos).toEqual(["p:b"]);
  expect(ids(a)).toEqual(["t:ca"]);
});

test("subestação caída apaga só a árvore dela", () => {
  const a = gerarAnalise(duas, { falhas: { subestacoes: ["s:1"] } }, () => 0);
  expect(a.semEnergia.pontos).toEqual(["p:a", "p:b"]);
  expect(ids(a)).toEqual(["t:de"]);
});

test("chave fechada liga como trecho", () => {
  expect(vazio(duas).fluxo.map(([id]) => id)).not.toContain("c:1"); // aberta no pedido vazio
  const a = gerarAnalise(duas, { falhas: { subestacoes: ["s:1"] }, chavesFechadas: ["c:1"] }, () => 0);
  expect(a.semEnergia.pontos).toEqual([]);
  expect(ids(a)).toEqual(["c:1", "t:ab", "t:de"]);
  expect(a.fluxoTotal).toBe(4);
});

test("aresta ligada a subestação não quebra", () => {
  expect(validarAnalise(vazio(pequena))).toEqual([]);
});
