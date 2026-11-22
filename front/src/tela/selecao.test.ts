import { expect, test } from "vitest";
import analiseMock from "../mocks/analise.json";
import pequena from "../mocks/rede.pequena.json";
import type { Analise, Rede } from "../api/tipos";
import { detalheDe, podeDerrubar, posicaoDoAlvo, selecaoDoClique } from "./selecao";

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
  expect(d).toEqual({ tipo: "subestacao", selos: [], titulo: "Subestação Centro (exemplo)", linhas: [["Capacidade", "50 MVA"], ["Estado", "caída"]] });
});

test("derruba trecho, linha AT e subestação; chave não (quem fecha chave é o religamento)", () => {
  const comChave = { ...rede, arestas: [...rede.arestas, ["c:9", "p:1", "p:2", "chave", 100]] } as Rede;
  expect(podeDerrubar({ tipo: "aresta", id: "t:1" }, comChave)).toBe(true);
  expect(podeDerrubar({ tipo: "subestacao", id: "s:1" }, comChave)).toBe(true);
  expect(podeDerrubar({ tipo: "aresta", id: "c:9" }, comChave)).toBe(false);
});

test("posição da falha: meio da aresta ou a subestação, em [lon, lat]", () => {
  expect(posicaoDoAlvo({ tipo: "subestacao", id: "s:1" }, rede)).toEqual([-43.947, -19.921]);
  const [lon, lat] = posicaoDoAlvo({ tipo: "aresta", id: "t:1" }, rede)!;
  expect(lon).toBeCloseTo(-43.944, 9);
  expect(lat).toBeCloseTo(-19.925, 9);
  expect(posicaoDoAlvo({ tipo: "aresta", id: "x:1" }, rede)).toBeNull();
});

test("o detalhe diz o tipo do item, para o cartão mostrar o ícone certo", () => {
  expect(detalheDe({ tipo: "subestacao", id: "s:1" }, rede, analise, [], []).tipo).toBe("subestacao");
  expect(detalheDe({ tipo: "aresta", id: "t:1" }, rede, analise, [], []).tipo).toBe("trecho");
  const comChave = { ...rede, arestas: [...rede.arestas, ["c:9", "p:1", "p:2", "chave", 100]] } as Rede;
  expect(detalheDe({ tipo: "aresta", id: "c:9" }, comChave, analise, [], []).tipo).toBe("chave");
});

test("selos de crítico: ponte na aresta, articulação na subestação; sem críticos carregados, nenhum", () => {
  const criticos = { pontes: new Set(["t:1"]), articulacoes: new Set(["s:1"]) };
  expect(detalheDe({ tipo: "aresta", id: "t:1" }, rede, analise, [], [], criticos).selos).toEqual(["ponte"]);
  expect(detalheDe({ tipo: "aresta", id: "t:2" }, rede, analise, [], [], criticos).selos).toEqual([]);
  expect(detalheDe({ tipo: "subestacao", id: "s:1" }, rede, analise, [], [], criticos).selos).toEqual(["articulacao"]);
  expect(detalheDe({ tipo: "aresta", id: "t:1" }, rede, analise, [], []).selos).toEqual([]);
});
