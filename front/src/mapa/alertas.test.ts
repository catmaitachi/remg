import { expect, test } from "vitest";
import type { Caminho, LonLat } from "./camadas";
import { agruparGargalos, espalharAlertas } from "./alertas";

const g = (id: string, a: LonLat, b: LonLat): Caminho => ({ id, path: [a, b], faixa: "gargalo" });

test("gargalos encostados viram um marcador só", () => {
  const cadeia = [g("t:1", [0, 0], [0.001, 0]), g("t:2", [0.001, 0], [0.002, 0]), g("t:3", [0.002, 0], [0.003, 0])];
  const solto = g("t:9", [1, 1], [1.001, 1]);
  const m = agruparGargalos([...cadeia, solto]);
  expect(m).toHaveLength(2);
  // o marcador da cadeia fica no trecho do meio
  expect(m.find((x) => x.id === "t:2")!.posicao).toEqual([0.0015, 0]);
  expect(m.find((x) => x.id === "t:9")!.posicao).toEqual([1.0005, 1]);
});

test("sem gargalos, sem marcadores", () => {
  expect(agruparGargalos([])).toEqual([]);
});

test("espalhar tira marcadores a menos de 28 px de outro, e mantém o primeiro", () => {
  const perto = [{ id: "a", posicao: [-43.94, -19.92] as LonLat }, { id: "b", posicao: [-43.9401, -19.92] as LonLat }];
  // no zoom 12 os dois ficam a ~0,15 px: sobra um; no zoom 20 ficam a ~37 px: ficam os dois
  expect(espalharAlertas(perto, 12).map((m) => m.id)).toEqual(["a"]);
  expect(espalharAlertas(perto, 20).map((m) => m.id)).toEqual(["a", "b"]);
});

test("espalhar devolve a mesma lista quando nada se encosta", () => {
  const longe = [{ id: "a", posicao: [-43.9, -19.9] as LonLat }, { id: "b", posicao: [-44, -20] as LonLat }];
  expect(espalharAlertas(longe, 12)).toEqual(longe);
});
