import { useEffect, useMemo, useState } from "react";
import { useControl, useMap } from "react-map-gl/maplibre";
import { MapboxOverlay } from "@deck.gl/mapbox";
import type { PickingInfo } from "@deck.gl/core";
import type { Alvo } from "../tela/falhas";
import { selecaoDoClique, type Selecao } from "../tela/selecao";
import { criarLaco } from "./animacao";
import { espalharAlertas } from "./alertas";
import { aplicarFalhas, montarCamadas, type Dados, type Intensidade, type Quadro, type Rota, type Visiveis } from "./camadas";
import type { Tema } from "./cores";

interface Props {
  dados: Dados | null; visiveis: Visiveis; tema: Tema; animando: boolean; intensidade: Intensidade;
  falhas: Alvo[]; aoSelecionar: (s: Selecao) => void;
  rota: Rota | null;
}

/** Fica dentro do <Map>: lê zoom e limites do mapa a cada quadro enquanto a animação está ligada. */
export function CamadasDeck({ dados, visiveis, tema, animando, intensidade, falhas, aoSelecionar, rota }: Props) {
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
  // o caído sai do brilho, das ondas e dos gargalos já no clique, antes da resposta
  const vista = useMemo(() => (dados ? aplicarFalhas(dados, falhas) : null), [dados, falhas]);
  const alertas = useMemo(() => (vista ? espalharAlertas(vista.dados.alertas, zoom) : []), [vista, zoom]);

  useEffect(() => {
    if (!animando || !mapa) return;
    const laco = criarLaco(requestAnimationFrame, cancelAnimationFrame, (agora) => {
      const b = mapa.getBounds();
      setQuadro({ tempo: agora / 1000, zoom: mapa.getZoom(), limites: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()] });
    });
    return () => laco.parar();
  }, [animando, mapa]);

  const camadas = useMemo(
    () => (vista ? montarCamadas(vista.dados, visiveis, tema, animando ? quadro : null, { intensidade, alertas, caidos: vista.caidos, rota }) : []),
    [vista, visiveis, tema, animando, quadro, intensidade, alertas, rota],
  );
  const overlay = useControl(() => new MapboxOverlay({ layers: camadas }));
  overlay.setProps({
    layers: camadas,
    // linha de 2 px é difícil de acertar: o clique pega o que estiver a até 6 px
    pickingRadius: 6,
    onClick: (info: PickingInfo) => {
      const sel = selecaoDoClique(info.layer?.id, info.object);
      if (sel) aoSelecionar(sel);
    },
    // o MapboxOverlay não mexe no cursor do canvas do mapa: a mão vem daqui
    onHover: (info: PickingInfo) => {
      const acerta = selecaoDoClique(info.layer?.id, info.object);
      if (mapa) mapa.getCanvas().style.cursor = acerta ? "pointer" : "";
    },
  });
  return null;
}
