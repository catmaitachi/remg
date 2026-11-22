import { expect, test } from "vitest";
import type { Analise } from "../api/tipos";
import { formatarEntregue, formatarPotencia, formatarTempo, resumoDaCidade } from "./resumo";

const analise = (pontos: number, demanda: number, demandaTotal: number): Analise => ({
  fluxoTotal: 0, demandaTotal, fluxo: [], gargalos: [], tempoMs: 0,
  semEnergia: { pontos: Array.from({ length: pontos }, (_, i) => `p:${i}`), demanda },
});

test("ninguém sem luz: 100% e toda a cidade com luz", () => {
  expect(resumoDaCidade(analise(0, 0, 100))).toEqual({ porcento: 100, frase: "Toda a cidade com luz" });
});

test("demanda total zero não divide por zero", () => {
  expect(resumoDaCidade(analise(0, 0, 0))).toEqual({ porcento: 100, frase: "Toda a cidade com luz" });
});

test("mock de BH: 98% e 702 pontos sem luz", () => {
  expect(resumoDaCidade(analise(702, 702, 35829))).toEqual({ porcento: 98, frase: "702 pontos sem luz" });
});

test("singular e milhar em pt-BR", () => {
  expect(resumoDaCidade(analise(1, 1, 100)).frase).toBe("1 ponto sem luz");
  expect(resumoDaCidade(analise(1500, 1500, 100000)).frase).toBe("1.500 pontos sem luz");
});

test("arredonda para baixo: 100% só quando ninguém está sem luz", () => {
  expect(resumoDaCidade(analise(1, 1, 1000)).porcento).toBe(99);
});

test("potência em kVA ou MVA e tempo em ms", () => {
  expect(formatarPotencia(640)).toBe("640 kVA");
  expect(formatarPotencia(35127)).toBe("35,1 MVA");
  expect(formatarTempo(104)).toBe("104 ms");
});

test("demanda total zero com pontos sem luz não inventa 99%", () => {
  expect(resumoDaCidade(analise(3, 0, 0))).toEqual({ porcento: 100, frase: "3 pontos sem luz" });
});

test("religamento parcial não diz cidade toda com luz", () => {
  expect(resumoDaCidade(analise(0, 0, 243553), 10037)).toEqual({ porcento: 95, frase: "Religado em parte: faltam 10 MVA" });
});

test("sem faltante, nada muda", () => {
  expect(resumoDaCidade(analise(702, 702, 35829), 0)).toEqual(resumoDaCidade(analise(702, 702, 35829)));
});

test("parcial com pontos ainda sem luz não conta duas vezes", () => {
  expect(resumoDaCidade(analise(3, 4000, 243553), 10037)).toEqual({ porcento: 95, frase: "3 pontos sem luz" });
});

test("entregue x de y: a unidade aparece uma vez quando é a mesma", () => {
  expect(formatarEntregue(233_512, 243_600)).toBe("233,5 de 243,6 MVA");
  expect(formatarEntregue(800, 243_600)).toBe("800 kVA de 243,6 MVA");
  expect(formatarEntregue(0, 0)).toBe("0 de 0 kVA");
});
