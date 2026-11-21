import { expect, test } from "vitest";
import { GLSL_ONDA, ONDA, brilhoDaOnda } from "./onda";

const FAIXAS = ["normal", "alerta", "gargalo"] as const;

test("fora da janela é 0", () => {
  expect(brilhoDaOnda(0.5 * ONDA.PERIODO, "normal", 0)).toBe(0);
});

test("pico vale a força da faixa", () => {
  FAIXAS.forEach((f, i) => expect(brilhoDaOnda(0.05 * ONDA.PERIODO, f, 0), f).toBeCloseTo(ONDA.FORCA[i], 9));
});

test("a onda anda para longe da origem", () => {
  const pico = 0.05 * ONDA.PERIODO;
  expect(brilhoDaOnda(pico + 1, "normal", 1)).toBeCloseTo(ONDA.FORCA[0], 9);
  expect(brilhoDaOnda(pico, "normal", 1)).toBe(0);
});

test("onda contínua na troca de faixa", () => {
  // trecho normal de 900 m seguido de um gargalo: o gargalo começa no tempo em que o normal termina
  const fimDoNormal = 900 / ONDA.VEL[0];
  for (const t of [0, 0.4, 1.3, 2.9, 7.7]) {
    const fase = (chegada: number) => (((chegada - t) / ONDA.PERIODO) % 1 + 1) % 1;
    expect(fase(0 + 900 / ONDA.VEL[0]), String(t)).toBeCloseTo(fase(fimDoNormal + 0 / ONDA.VEL[2]), 9);
    // e o brilho só muda pela força da faixa, nunca de fase
    const b = [brilhoDaOnda(fimDoNormal, "normal", t), brilhoDaOnda(fimDoNormal, "gargalo", t)];
    expect(b[0] / ONDA.FORCA[0], String(t)).toBeCloseTo(b[1] / ONDA.FORCA[2], 9);
  }
});

test("GLSL usa as mesmas constantes", () => {
  for (const v of ["3.0", "0.1", ...ONDA.VEL.map((x) => x.toFixed(1)), ...ONDA.FORCA.map((x) => (Number.isInteger(x) ? x.toFixed(1) : String(x)))]) {
    expect(GLSL_ONDA, v).toContain(v);
  }
});
