import { useEffect, useMemo, useState } from "react";
import { Map, useControl } from "react-map-gl/maplibre";
import { MapboxOverlay, type MapboxOverlayProps } from "@deck.gl/mapbox";
import "maplibre-gl/dist/maplibre-gl.css";
import { carregarRede } from "./api/carregar";
import type { Rede } from "./api/tipos";
import { CENTRO_BH, estiloDoMapa, montarCamadas } from "./mapa/camadas";

function CamadasDeck(props: MapboxOverlayProps) {
  const overlay = useControl(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

const temaEscuro = matchMedia("(prefers-color-scheme: dark)");

function useEscuro() {
  const [escuro, setEscuro] = useState(temaEscuro.matches);
  useEffect(() => {
    const mudar = (e: MediaQueryListEvent) => setEscuro(e.matches);
    temaEscuro.addEventListener("change", mudar);
    return () => temaEscuro.removeEventListener("change", mudar);
  }, []);
  return escuro;
}

type Estado = { rede: Rede } | { erro: string } | null;

export default function App() {
  const escuro = useEscuro();
  const [estado, setEstado] = useState<Estado>(null);

  useEffect(() => {
    carregarRede().then((rede) => setEstado({ rede }), (e: Error) => setEstado({ erro: e.message }));
  }, []);

  const camadas = useMemo(
    () => (estado && "rede" in estado ? montarCamadas(estado.rede, escuro) : []),
    [estado, escuro],
  );

  return (
    <>
      <Map
        initialViewState={CENTRO_BH}
        mapStyle={estiloDoMapa(escuro)}
        attributionControl={{ compact: false, customAttribution: "© OpenStreetMap contributors" }}
        style={{ position: "fixed", inset: 0 }}
      >
        <CamadasDeck layers={camadas} />
      </Map>
      {!estado && <p className="aviso" role="status">Carregando a rede de Belo Horizonte…</p>}
      {estado && "erro" in estado && (
        <p className="aviso aviso-erro" role="alert">
          <strong>Não deu para carregar a rede.</strong>
          <span>{estado.erro}</span>
        </p>
      )}
    </>
  );
}
