import { useEffect, useMemo, useState } from "react";
import { useControl, useMap } from "react-map-gl/maplibre";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { criarLaco } from "./animacao";
import { montarCamadas, type Dados, type Quadro, type Visiveis } from "./camadas";
import type { Tema } from "./cores";

interface Props { dados: Dados | null; visiveis: Visiveis; tema: Tema; animando: boolean }

/** Fica dentro do <Map>: lê zoom e limites do mapa a cada quadro enquanto a animação está ligada. */
export function CamadasDeck({ dados, visiveis, tema, animando }: Props) {
  const { current: mapa } = useMap();
  const [quadro, setQuadro] = useState<Quadro | null>(null);

  useEffect(() => {
    if (!animando || !mapa) return;
    const laco = criarLaco(requestAnimationFrame, cancelAnimationFrame, (agora) => {
      const b = mapa.getBounds();
      setQuadro({ tempo: agora / 1000, zoom: mapa.getZoom(), limites: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()] });
    });
    return () => laco.parar();
  }, [animando, mapa]);

  const camadas = useMemo(
    () => (dados ? montarCamadas(dados, visiveis, tema, animando ? quadro : null) : []),
    [dados, visiveis, tema, animando, quadro],
  );
  const overlay = useControl(() => new MapboxOverlay({ layers: camadas }));
  overlay.setProps({ layers: camadas });
  return null;
}
