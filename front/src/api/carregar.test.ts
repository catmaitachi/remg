import { expect, test } from "vitest";
import analise from "../mocks/analise.json";
import pequena from "../mocks/rede.pequena.json";
import { carregarAnalise, carregarRede, urlDaAnalise, urlDaRede } from "./carregar";

const resposta = (status: number, corpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } }));

test("sem mock, busca o servidor", () => {
  expect(urlDaRede(false)).toBe("http://localhost:8080/api/rede");
});

test("com mock, busca o rede.bh.json", () => {
  expect(urlDaRede(true)).toMatch(/rede\.bh\.json$/);
});

test("devolve a rede quando ela segue o contrato", async () => {
  await expect(carregarRede(false, () => resposta(200, pequena))).resolves.toEqual(pequena);
});

test("500 com {erro} vira mensagem em português", async () => {
  await expect(carregarRede(false, () => resposta(500, { erro: "núcleo caiu" }))).rejects.toThrow(/núcleo caiu/);
});

test("servidor fora do ar cita o endereço", async () => {
  await expect(carregarRede(false, () => Promise.reject(new TypeError("Failed to fetch")))).rejects.toThrow(/localhost:8080/);
});

test("rede fora do contrato é recusada", async () => {
  await expect(carregarRede(false, () => resposta(200, { area: "x" }))).rejects.toThrow(/contrato/);
});

test("análise: com mock busca o analise.bh.json, sem mock o servidor", () => {
  expect(urlDaAnalise(true)).toMatch(/analise\.bh\.json$/);
  expect(urlDaAnalise(false)).toBe("http://localhost:8080/api/analise");
});

test("análise sem mock faz POST com pedido vazio", async () => {
  let pedido: RequestInit | undefined;
  const buscar = (_: RequestInfo | URL, init?: RequestInit) => { pedido = init; return resposta(200, analise); };
  await expect(carregarAnalise(false, buscar as typeof fetch)).resolves.toEqual(analise);
  expect(pedido?.method).toBe("POST");
  expect(pedido?.body).toBe("{}");
});

test("análise: 500 com {erro} vira mensagem", async () => {
  await expect(carregarAnalise(false, () => resposta(500, { erro: "núcleo caiu" }))).rejects.toThrow(/núcleo caiu/);
});

test("análise: servidor fora do ar cita o endereço", async () => {
  await expect(carregarAnalise(false, () => Promise.reject(new TypeError("Failed to fetch")))).rejects.toThrow(/localhost:8080/);
});

test("análise fora do contrato é recusada", async () => {
  await expect(carregarAnalise(false, () => resposta(200, { fluxo: "x" }))).rejects.toThrow(/contrato/);
});
