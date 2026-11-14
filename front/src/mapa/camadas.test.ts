import { expect, test } from "vitest";
import pequena from "../mocks/rede.pequena.json";
import type { Rede } from "../api/tipos";
import { estiloDoMapa, montarCamadas } from "./camadas";

const rede = pequena as unknown as Rede;
// any: o teste lê props específicas de cada tipo de camada.
const porId = (escuro = false): Record<string, any> =>
  Object.fromEntries(montarCamadas(rede, escuro).map((c) => [c.id, c]));

test("estilo do mapa segue o tema", () => {
  expect(estiloDoMapa(true)).toMatch(/\/dark$/);
  expect(estiloDoMapa(false)).toMatch(/\/positron$/);
});

test("três camadas com a quantidade certa de dados", () => {
  const c = porId();
  expect(Object.keys(c).sort()).toEqual(["linhas-at", "subestacoes", "trechos"]);
  expect(c.trechos.props.data).toHaveLength(rede.arestas.filter((a) => a[3] !== "linha_at").length);
  expect(c["linhas-at"].props.data).toHaveLength(Object.keys(rede.geometriaAT).length);
  expect(c.subestacoes.props.data).toHaveLength(rede.subestacoes.length);
});

test("larguras em pixels: 2 no trecho, 6 na alta tensão", () => {
  const c = porId();
  expect(c.trechos.props.widthUnits).toBe("pixels");
  expect(c["linhas-at"].props.widthUnits).toBe("pixels");
  expect(c.trechos.props.getWidth).toBe(2);
  expect(c["linhas-at"].props.getWidth).toBe(6);
});

test("acessores entregam [lon, lat] iguais aos do mock", () => {
  const c = porId();
  const [, de, para] = rede.arestas[0];
  const ponto = (id: string) => rede.pontos.find((p) => p[0] === id) ?? rede.subestacoes.find((s) => s[0] === id)!;
  const lonLat = (id: string) => { const p = ponto(id); return [p[id.startsWith("s:") ? 3 : 2], p[id.startsWith("s:") ? 2 : 1]]; };

  expect(c.trechos.props.getPath(c.trechos.props.data[0])).toEqual([lonLat(de), lonLat(para)]);
  const at = Object.values(rede.geometriaAT)[0];
  expect(c["linhas-at"].props.getPath(c["linhas-at"].props.data[0])).toEqual(at.map(([lat, lon]) => [lon, lat]));
  const s = rede.subestacoes[0];
  expect(c.subestacoes.props.getPosition(c.subestacoes.props.data[0])).toEqual([s[3], s[2]]);
});

test("cores mudam com o tema", () => {
  expect(porId(false).trechos.props.getColor).not.toEqual(porId(true).trechos.props.getColor);
});
