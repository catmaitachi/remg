import { useEffect, useRef } from "react";
import { useMap } from "react-map-gl/maplibre";
import type { Tema } from "./cores";
import { ID_PREDIOS, INCLINACAO_3D, camadaDePredios } from "./predios";

/** Fica fora do <Map>, dentro do MapProvider: põe ou tira os prédios 3D e inclina a câmera ao ligar. */
export function Predios3D({ ligado, tema }: { ligado: boolean; tema: Tema }) {
  const { mapa } = useMap();
  const primeira = useRef(true);

  // a troca de tema recarrega o estilo e leva a camada junto: por isso ela volta a cada "style.load"
  useEffect(() => {
    const m = mapa?.getMap();
    if (!m) return;
    const aplicar = () => {
      if (m.getLayer(ID_PREDIOS)) m.removeLayer(ID_PREDIOS);
      if (!ligado || !m.getSource("openmaptiles")) return;
      // abaixo dos rótulos do mapa, para os nomes de rua continuarem por cima
      const rotulo = m.getStyle().layers.find((l) => l.type === "symbol")?.id;
      m.addLayer(camadaDePredios(tema) as Parameters<typeof m.addLayer>[0], rotulo);
    };
    if (m.isStyleLoaded()) aplicar();
    m.on("style.load", aplicar);
    return () => { m.off("style.load", aplicar); };
  }, [mapa, ligado, tema]);

  useEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    mapa?.easeTo({ pitch: ligado ? INCLINACAO_3D : 0, duration: 600 });
  }, [mapa, ligado]);

  return null;
}
