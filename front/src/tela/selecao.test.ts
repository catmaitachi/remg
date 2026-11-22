import { expect, test } from "vitest";
import analiseMock from "../mocks/analise.json";
import pequena from "../mocks/rede.pequena.json";
import type { Analise, Rede } from "../api/tipos";
import { detalheDe, selecaoDoClique } from "./selecao";

const rede = pequena as unknown as Rede;
const analise = analiseMock as unknown as Analise;
const linhas = (d: { linhas: [string, string][] }) => Object.fromEntries(d.linhas);

test("seleção aceita chave e AT, ignora alertas", () => {
  expect(selecaoDoClique("trechos", { id: "c:1", tipo: "chave" })).toEqual({ tipo: "aresta", id: "c:1" });
  expect(selecaoDoClique("linhas-at", { id: "at:1", path: [] })).toEqual({ tipo: "aresta", id: "at:1" });
  expect(selecaoDoClique("rota", { id: "t:2", tipo: "trecho" })).toEqual({ tipo: "aresta", id: "t:2" });
  expect(selecaoDoClique("subestacoes", ["s:1", "Centro", 0, 0, 1])).toEqual({ tipo: "subestacao", id: "s:1" });
  expect(selecaoDoClique("gargalos-alerta", { id: "t:3", posicao: [0, 0] })).toBeNull();
  expect(selecaoDoClique("trechos", undefined)).toBeNull();
});

test("trecho com fluxo mostra capacidade, fluxo e uso", () => {
  const d = detalheDe({ tipo: "aresta", id: "t:3" }, rede, analise, [], []);
  expect(d.titulo).toBe("Trecho 3");
  expect(linhas(d)).toEqual({ Capacidade: "100 kVA", Fluxo: "95 kVA", Uso: "95% · gargalo", Estado: "ligado" });
});

test("trecho sem fluxo diz sem fluxo", () => {
  expect(linhas(detalheDe({ tipo: "aresta", id: "t:4" }, rede, analise, [], []))).toMatchObject({ Fluxo: "sem fluxo", Uso: "—" });
});

test("chave fechada pelo religamento", () => {
  const d = detalheDe({ tipo: "aresta", id: "c:1" }, rede, analise, [], ["c:1"]);
  expect(d.titulo).toBe("Chave 1");
  expect(linhas(d).Estado).toBe("fechada pelo religamento");
  expect(linhas(detalheDe({ tipo: "aresta", id: "c:1" }, rede, analise, [], [])).Estado).toBe("aberta");
});

test("linha AT e trecho caído", () => {
  expect(detalheDe({ tipo: "aresta", id: "at:1" }, rede, analise, [], []).titulo).toBe("Linha AT 1");
  expect(linhas(detalheDe({ tipo: "aresta", id: "t:3" }, rede, analise, [{ tipo: "aresta", id: "t:3" }], [])).Estado).toBe("caído");
});

test("subestação caída", () => {
  const d = detalheDe({ tipo: "subestacao", id: "s:1" }, rede, analise, [{ tipo: "subestacao", id: "s:1" }], []);
  expect(d).toEqual({ titulo: "Subestação Centro (exemplo)", linhas: [["Capacidade", "50 MVA"], ["Estado", "caída"]] });
});
