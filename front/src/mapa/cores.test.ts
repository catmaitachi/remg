import { expect, test } from "vitest";
import { PALETA, faixaDoUso, rgb } from "./cores";

test("faixas de uso nos limites", () => {
  expect(faixaDoUso(0.59)).toBe("normal");
  expect(faixaDoUso(0.6)).toBe("alerta");
  expect(faixaDoUso(0.89)).toBe("alerta");
  expect(faixaDoUso(0.9)).toBe("gargalo");
  expect(faixaDoUso(1)).toBe("gargalo");
});

test("rgb de hex", () => {
  expect(rgb("#0081a1")).toEqual([0, 129, 161]);
});

// Mesma conta de docs/design/prototipo/cores.test.cjs, agora sobre a paleta do front (T18).
type Cor = [number, number, number];
const lin = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const enc = (c: number) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const luminancia = (c: Cor) => { const [r, g, b] = c.map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contraste = (a: Cor, b: Cor) => { const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// Machado, Oliveira e Fernandes (2009), severidade 1.0, em RGB linear.
const MATRIZ = {
  deuteranopia: [[0.367, 0.861, -0.228], [0.280, 0.673, 0.047], [-0.012, 0.043, 0.969]],
  protanopia: [[0.152, 1.053, -0.205], [0.115, 0.786, 0.099], [-0.004, -0.048, 1.052]],
};
const simular = (c: Cor, m: number[][]) => { const l = c.map(lin); return m.map((r) => enc(Math.min(1, Math.max(0, r[0] * l[0] + r[1] * l[1] + r[2] * l[2])))) as Cor; };
function lab(c: Cor) {
  const [r, g, b] = c.map(lin);
  const xyz = [(0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, 0.2126 * r + 0.7152 * g + 0.0722 * b, (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883];
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const [fx, fy, fz] = xyz.map(f);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
const deltaE = (a: Cor, b: Cor) => { const [la, lb] = [lab(a), lab(b)]; return Math.hypot(...la.map((v, i) => v - lb[i])); };
const VISOES = { normal: (c: Cor) => c, deuteranopia: (c: Cor) => simular(c, MATRIZ.deuteranopia), protanopia: (c: Cor) => simular(c, MATRIZ.protanopia) };
const USOS = ["normal", "alerta", "gargalo"] as const;

for (const tema of ["claro", "escuro"] as const) {
  const p = PALETA[tema];

  test(`${tema}: cor de uso com contraste ≥ 3:1 sobre o fundo do mapa`, () => {
    for (const u of USOS) expect(contraste(rgb(p[u]), rgb(p.fundo)), u).toBeGreaterThanOrEqual(3);
  });

  test(`${tema}: as 3 cores de uso distintas (ΔE ≥ 20) em toda visão`, () => {
    for (const [visao, ver] of Object.entries(VISOES))
      for (let i = 0; i < 3; i++)
        for (let j = i + 1; j < 3; j++)
          expect(deltaE(ver(rgb(p[USOS[i]])), ver(rgb(p[USOS[j]]))), `${visao} ${USOS[i]}×${USOS[j]}`).toBeGreaterThanOrEqual(20);
  });

  test(`${tema}: uso normal não parece o botão primário (ΔE ≥ 20)`, () => {
    for (const [visao, ver] of Object.entries(VISOES))
      expect(deltaE(ver(rgb(p.normal)), ver(rgb(p.primario))), visao).toBeGreaterThanOrEqual(20);
  });
}

test("semLuz e caído têm os valores do tokens.md", () => {
  expect([PALETA.claro.semLuz, PALETA.escuro.semLuz]).toEqual(["#8a8a86", "#3d3d3d"]);
  expect([PALETA.claro.caido, PALETA.escuro.caido]).toEqual(["#7f7f7f", "#e0e0e0"]);
});
