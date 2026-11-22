import { expect, test } from "vitest";
import { VISIVEIS_INICIAL } from "./camadas";
import { ID_PREDIOS, INCLINACAO_3D, camadaDePredios, manterPredios, type MapaComEstilo } from "./predios";

// mapa falso: guarda as camadas e os ouvintes, e troca o estilo como o MapLibre em modo diff
function mapaFalso() {
  const camadas = new Map<string, { paint: Record<string, unknown> }>();
  const ouvintes = new Map<string, Set<() => void>>();
  let tilesProntos = true;
  const m: MapaComEstilo & { trocarEstiloEmDiff: () => void; cor: () => unknown } = {
    getLayer: (id) => camadas.get(id) as never,
    removeLayer: (id) => { camadas.delete(id); return m as never; },
    addLayer: (c) => { const l = c as { id: string; paint: Record<string, unknown> }; camadas.set(l.id, l); return m as never; },
    getSource: () => ({}) as never,
    getStyle: () => ({ layers: [{ id: "rotulo", type: "symbol" }] }) as never,
    // como no MapLibre: só fica true quando os tiles das fontes também chegaram
    isStyleLoaded: () => tilesProntos,
    on: ((ev: string, f: () => void) => { (ouvintes.get(ev) ?? ouvintes.set(ev, new Set()).get(ev)!).add(f); return m; }) as never,
    off: ((ev: string, f: () => void) => { ouvintes.get(ev)?.delete(f); return m; }) as never,
    // setStyle(url) recarrega o estilo: a camada posta à mão some, e "style.load" e "styledata" chegam
    // com os tiles ainda carregando; depois disso nenhum evento de estilo volta a sair
    trocarEstiloEmDiff: () => {
      camadas.delete(ID_PREDIOS);
      tilesProntos = false;
      for (const ev of ["style.load", "styledata"]) ouvintes.get(ev)?.forEach((f) => f());
      tilesProntos = true;
    },
    cor: () => camadas.get(ID_PREDIOS)?.paint["fill-extrusion-color"],
  };
  return m;
}

test("trocar o tema mantém os prédios, na cor do tema novo", () => {
  const m = mapaFalso();
  const soltar = manterPredios(m, true, "claro");
  expect(m.cor()).toBe(camadaDePredios("claro").paint["fill-extrusion-color"]);
  // como no Predios3D: o efeito do tema antigo sai, o do novo entra, e o react-map-gl troca o estilo
  soltar();
  const soltarEscuro = manterPredios(m, true, "escuro");
  m.trocarEstiloEmDiff();
  expect(m.cor()).toBe(camadaDePredios("escuro").paint["fill-extrusion-color"]);
  soltarEscuro();
});

test("desligados, os prédios não voltam com a troca de estilo", () => {
  const m = mapaFalso();
  manterPredios(m, true, "claro")();
  manterPredios(m, false, "claro");
  m.trocarEstiloEmDiff();
  expect(m.getLayer(ID_PREDIOS)).toBeUndefined();
});

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
