import { useEffect, useRef } from "react";
import { useMap } from "react-map-gl/maplibre";
import type { Tema } from "./cores";
import { INCLINACAO_3D, manterPredios } from "./predios";

/** Fica fora do <Map>, dentro do MapProvider: põe ou tira os prédios 3D e inclina a câmera ao ligar. */
export function Predios3D({ ligado, tema }: { ligado: boolean; tema: Tema }) {
  const { mapa } = useMap();
  const primeira = useRef(true);

  useEffect(() => {
    const m = mapa?.getMap();
    if (!m) return;
    return manterPredios(m, ligado, tema);
  }, [mapa, ligado, tema]);

  useEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    mapa?.easeTo({ pitch: ligado ? INCLINACAO_3D : 0, duration: 600 });
  }, [mapa, ligado]);

  return null;
}
