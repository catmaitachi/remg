import type { Tema } from "./cores";

/** Inclinação da câmera com os prédios 3D ligados, em graus. */
export const INCLINACAO_3D = 50;
export const ID_PREDIOS = "predios-3d";

/** Prédios extrudados pela altura do OpenStreetMap, só de perto (zoom 15+), no source dos tiles do OpenFreeMap. */
export function camadaDePredios(tema: Tema) {
  return {
    id: ID_PREDIOS,
    type: "fill-extrusion" as const,
    source: "openmaptiles",
    "source-layer": "building",
    minzoom: 15,
    paint: {
      "fill-extrusion-color": tema === "escuro" ? "#2a2f38" : "#d9dbd5",
      // nasce do chão entre o zoom 15 e 15,5, em vez de pular
      "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 15, 0, 15.5, ["coalesce", ["get", "render_height"], 0]],
      "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
      "fill-extrusion-opacity": 0.85,
    },
  };
}
