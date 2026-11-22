import { expect, test } from "vitest";
import analise from "../mocks/analise.json";
import pequena from "../mocks/rede.pequena.json";
import rota from "../mocks/rota-alternativa.json";
import { carregarAnalise, carregarCriticos, carregarRede, pedirAnalise, pedirRota, urlDaAnalise, urlDaRede } from "./carregar";
import criticos from "../mocks/criticos.json";
import { validarAnalise } from "./validar";

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

const pedidoT1 = { falhas: { arestas: ["t:1"], subestacoes: [] }, chavesFechadas: [] };

test("pedirAnalise sem mock faz POST com o pedido inteiro", async () => {
  let init: RequestInit | undefined;
  const buscar = (_: RequestInfo | URL, i?: RequestInit) => { init = i; return resposta(200, analise); };
  const controle = new AbortController();
  await expect(pedirAnalise(pedidoT1, pequena as never, controle.signal, false, buscar as typeof fetch)).resolves.toEqual(analise);
  expect(init?.method).toBe("POST");
  expect(init?.body).toBe(JSON.stringify(pedidoT1));
  expect(init?.signal).toBe(controle.signal);
});

test("pedirAnalise com mock calcula com o gerador", async () => {
  const a = await pedirAnalise(pedidoT1, pequena as never, undefined, true);
  expect(validarAnalise(a)).toEqual([]);
  expect(a.semEnergia.pontos).toEqual(["p:2", "p:3"]);
});

test("pedirAnalise repassa o erro do servidor", async () => {
  await expect(pedirAnalise(pedidoT1, pequena as never, undefined, false, () => resposta(500, { erro: "núcleo caiu" })))
    .rejects.toThrow(/núcleo caiu/);
});

test("pedirAnalise com mock não calcula pedido já cancelado", async () => {
  const controle = new AbortController();
  const pedido = pedirAnalise(pedidoT1, pequena as never, controle.signal, true);
  controle.abort();
  await expect(pedido).rejects.toMatchObject({ name: "AbortError" });
});

test("rota faz POST no /rota-alternativa com o pedido", async () => {
  let url = "", init: RequestInit | undefined;
  const buscar = (u: RequestInfo | URL, i?: RequestInit) => { url = String(u); init = i; return resposta(200, rota); };
  const controle = new AbortController();
  await expect(pedirRota(pedidoT1, controle.signal, buscar as typeof fetch)).resolves.toEqual(rota);
  expect(url).toBe("http://localhost:8080/api/rota-alternativa");
  expect(init?.method).toBe("POST");
  expect(init?.body).toBe(JSON.stringify(pedidoT1));
  expect(init?.signal).toBe(controle.signal);
});

test("rota fora do contrato é recusada", async () => {
  await expect(pedirRota(pedidoT1, undefined, () => resposta(200, {}))).rejects.toThrow(/contrato/);
});

test("críticos: GET /criticos validado; no mock não há (o exemplo não bate com a rede de BH)", async () => {
  const urls: string[] = [];
  const buscar = (url: string) => { urls.push(url); return resposta(200, criticos); };
  await expect(carregarCriticos(false, buscar as unknown as typeof fetch)).resolves.toEqual(criticos);
  expect(urls).toEqual(["http://localhost:8080/api/criticos"]);
  await expect(carregarCriticos(false, () => resposta(200, { pontes: [] }))).rejects.toThrow(/contrato/);
  await expect(carregarCriticos(true, () => { throw new Error("não deveria buscar"); })).resolves.toBeNull();
});
