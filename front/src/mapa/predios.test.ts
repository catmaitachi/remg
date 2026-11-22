import { expect, test } from "vitest";
import { VISIVEIS_INICIAL } from "./camadas";
import { INCLINACAO_3D, camadaDePredios } from "./predios";

test("prédios 3D começam desligados", () => {
  expect(VISIVEIS_INICIAL.predios3d).toBe(false);
});

test("a camada de prédios extruda pela altura do OSM e só aparece de perto", () => {
  for (const tema of ["claro", "escuro"] as const) {
    const c = camadaDePredios(tema);
    expect(c.type).toBe("fill-extrusion");
    expect(c.source).toBe("openmaptiles");
    expect(c["source-layer"]).toBe("building");
    expect(c.minzoom).toBe(15);
    expect(JSON.stringify(c.paint["fill-extrusion-height"])).toContain("render_height");
  }
  expect(camadaDePredios("claro").paint["fill-extrusion-color"]).not.toBe(camadaDePredios("escuro").paint["fill-extrusion-color"]);
  expect(INCLINACAO_3D).toBe(50);
});
