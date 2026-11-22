import type { Map as MapaMaplibre } from "maplibre-gl";
import type { Tema } from "./cores";

export type MapaComEstilo = Pick<MapaMaplibre, "getLayer" | "removeLayer" | "addLayer" | "getSource" | "getStyle" | "isStyleLoaded" | "on" | "off">;

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

/** Põe (ou tira) os prédios no estilo do mapa e os mantém lá; devolve quem desliga os ouvintes. */
export function manterPredios(m: MapaComEstilo, ligado: boolean, tema: Tema): () => void {
  // a fonte existir basta: isStyleLoaded() espera também os tiles e ainda é false no último evento de estilo
  const repor = () => {
    if (!ligado || m.getLayer(ID_PREDIOS) || !m.getSource("openmaptiles")) return;
    // abaixo dos rótulos do mapa, para os nomes de rua continuarem por cima
    const rotulo = m.getStyle().layers.find((l) => l.type === "symbol")?.id;
    m.addLayer(camadaDePredios(tema) as Parameters<typeof m.addLayer>[0], rotulo);
  };
  // a camada que está lá é do tema ou do estado anterior
  if (m.getLayer(ID_PREDIOS)) m.removeLayer(ID_PREDIOS);
  repor();
  // a troca de tema recarrega o estilo e leva a camada posta à mão; "styledata" chega a cada mudança dele
  m.on("styledata", repor);
  return () => { m.off("styledata", repor); };
}
