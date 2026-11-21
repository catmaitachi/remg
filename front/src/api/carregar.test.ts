import { expect, test } from "vitest";
import pequena from "../mocks/rede.pequena.json";
import { carregarRede, urlDaRede } from "./carregar";

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
