import { useEffect, useMemo, useState } from "react";
import { useControl, useMap } from "react-map-gl/maplibre";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { criarLaco } from "./animacao";
import { espalharAlertas } from "./alertas";
import { montarCamadas, type Dados, type Intensidade, type Quadro, type Visiveis } from "./camadas";
import type { Tema } from "./cores";

interface Props { dados: Dados | null; visiveis: Visiveis; tema: Tema; animando: boolean; intensidade: Intensidade }

/** Fica dentro do <Map>: lê zoom e limites do mapa a cada quadro enquanto a animação está ligada. */
export function CamadasDeck({ dados, visiveis, tema, animando, intensidade }: Props) {
  const { current: mapa } = useMap();
  const [quadro, setQuadro] = useState<Quadro | null>(null);
  // zoom em passos de 0,5, lido no fim do zoom: os marcadores de gargalo se espalham por ele
  const [zoom, setZoom] = useState(() => mapa?.getZoom() ?? 0);

  useEffect(() => {
    if (!mapa) return;
    const ler = () => setZoom(Math.round(mapa.getZoom() * 2) / 2);
    ler();
    mapa.on("zoomend", ler);
    return () => { mapa.off("zoomend", ler); };
  }, [mapa]);
  const alertas = useMemo(() => (dados ? espalharAlertas(dados.alertas, zoom) : []), [dados, zoom]);

  useEffect(() => {
    if (!animando || !mapa) return;
    const laco = criarLaco(requestAnimationFrame, cancelAnimationFrame, (agora) => {
      const b = mapa.getBounds();
      setQuadro({ tempo: agora / 1000, zoom: mapa.getZoom(), limites: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()] });
    });
    return () => laco.parar();
  }, [animando, mapa]);

  const camadas = useMemo(
    () => (dados ? montarCamadas(dados, visiveis, tema, animando ? quadro : null, { intensidade, alertas }) : []),
    [dados, visiveis, tema, animando, quadro, intensidade, alertas],
  );
  const overlay = useControl(() => new MapboxOverlay({ layers: camadas }));
  overlay.setProps({ layers: camadas });
  return null;
}
