import { expect, test } from "vitest";
import type { Caminho, LonLat, Quadro } from "./camadas";
import type { Faixa } from "./cores";
import { RAIO, escolherRaio, montarRaio, ruido, tremer } from "./raio";

// Web Mercator do MapLibre: o mundo tem 512 · 2^zoom px
const px = ([lon, lat]: LonLat, zoom: number): [number, number] => {
  const W = 512 * 2 ** zoom, r = (lat * Math.PI) / 180;
  return [((lon + 180) / 360) * W, ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * W];
};
// ponto a `dx`,`dy` px de `base`, no zoom dado (inverso do px acima)
const deslocar = (base: LonLat, dx: number, dy: number, zoom: number): LonLat => {
  const W = 512 * 2 ** zoom, [x, y] = px(base, zoom);
  const lon = ((x + dx) / W) * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + dy)) / W))) * 180) / Math.PI;
  return [lon, lat];
};
const BH: LonLat = [-43.94, -19.92];
const Z = 15;
const distDaReta = (p: [number, number], a: [number, number], b: [number, number]) =>
  Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / Math.hypot(b[0] - a[0], b[1] - a[1]);

test("ruido fica em [-1, 1]", () => {
  for (let i = 0; i < 1000; i++) {
    const v = ruido(i * 0.37, i % 24, i * 0.11);
    expect(v).toBeGreaterThanOrEqual(-1);
    expect(v).toBeLessThanOrEqual(1);
  }
});

test("tremer prende as pontas", () => {
  const a = BH, b = deslocar(BH, 120, 40, Z);
  const p = tremer(a, b, 5, Z, 3, 1.5);
  expect(p[0]).toEqual(a);
  expect(p.at(-1)).toEqual(b);
});

test("tremer respeita a amplitude", () => {
  for (const [dx, dy] of [[200, 0], [150, 150]]) {
    const a = BH, b = deslocar(BH, dx, dy, Z);
    const [pa, pb] = [px(a, Z), px(b, Z)];
    for (const fase of [0, 7, 13]) for (const q of tremer(a, b, 5, Z, fase, fase * 0.3)) {
      expect(distDaReta(px(q, Z), pa, pb)).toBeLessThanOrEqual(5 * 1.01);
    }
  }
});

test("tremer adensa a cada 6 px e para em 60", () => {
  expect(tremer(BH, deslocar(BH, 120, 0, Z), 3, Z, 0, 0)).toHaveLength(21);
  expect(tremer(BH, deslocar(BH, 1000, 0, Z), 3, Z, 0, 0)).toHaveLength(61);
});

test("trecho de comprimento zero não gera NaN", () => {
  expect(tremer(BH, BH, 5, Z, 1, 1)).toEqual([BH, BH]);
});

const trecho = (id: string, faixa: Faixa, dx = 60, positivo = true, origem = BH): Caminho => ({
  id, faixa, path: [origem, deslocar(origem, dx, 0, Z)],
  sentido: { distInicio: 0, comprimento: 100, tempoInicio: 0, positivo },
});
const limites = (): Quadro["limites"] => {
  const [o, n] = deslocar(BH, -2000, -2000, Z), [l, s] = deslocar(BH, 2000, 2000, Z);
  return [o, s, l, n];
};
const quadro = (zoom = Z): Quadro => ({ tempo: 3.2, zoom, limites: limites() });

test("escolherRaio: nada abaixo do zoom 14", () => {
  expect(RAIO.ZOOM).toBe(14);
  expect(escolherRaio([trecho("t:1", "gargalo")], quadro(13.9))).toEqual([]);
  expect(escolherRaio([trecho("t:1", "gargalo")], quadro(14))).toHaveLength(1);
});

test("escolherRaio: só visíveis, gargalo primeiro, teto 500", () => {
  const faixas: Faixa[] = ["normal", "alerta", "gargalo"];
  const muitos = Array.from({ length: 600 }, (_, i) => trecho(`t:${i}`, faixas[i % 3], 60, true, deslocar(BH, (i % 30) * 10, Math.floor(i / 30) * 10, Z)));
  const longe = trecho("t:longe", "gargalo", 60, true, deslocar(BH, 50000, 0, Z));
  const curto = trecho("t:curto", "gargalo", 4);
  const sel = escolherRaio([...muitos, longe, curto], quadro());
  expect(sel).toHaveLength(RAIO.MAX);
  expect(sel.filter((c) => c.faixa === "gargalo")).toHaveLength(200);
  expect(sel.some((c) => c.id === "t:longe" || c.id === "t:curto")).toBe(false);
});

test("montarRaio: fios por faixa e faísca pela chance", () => {
  const g = montarRaio([trecho("t:g", "gargalo")], quadro(), () => 0);
  expect(g.fios).toHaveLength(3);
  expect(g.faiscas).toHaveLength(3);
  expect(montarRaio([trecho("t:g", "gargalo")], quadro(), () => 0.99).faiscas).toHaveLength(0);
  const n = montarRaio([trecho("t:n", "normal")], quadro(), () => 0);
  expect(n.fios).toHaveLength(1);
  expect(n.faiscas).toHaveLength(0);
});

test("fio de fluxo negativo corre de para → de", () => {
  const c = trecho("t:neg", "alerta", 60, false);
  for (const fio of montarRaio([c], quadro(), () => 0.5).fios) {
    expect(fio.path[0]).toEqual(c.path[1]);
    expect(fio.path.at(-1)).toEqual(c.path[0]);
  }
});
