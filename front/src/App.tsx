import { useEffect, useMemo, useState } from "react";
import { Map, useControl } from "react-map-gl/maplibre";
import { MapboxOverlay, type MapboxOverlayProps } from "@deck.gl/mapbox";
import "maplibre-gl/dist/maplibre-gl.css";
import "./tela/tela.css";
import { carregarAnalise, carregarRede } from "./api/carregar";
import type { Analise, Rede } from "./api/tipos";
import { CENTRO_BH, VISIVEIS_INICIAL, estiloDoMapa, montarCamadas, prepararDados, type Visiveis } from "./mapa/camadas";
import type { Tema } from "./mapa/cores";
import { Barra } from "./tela/Barra";
import { Controles } from "./tela/Controles";
import { Legenda } from "./tela/Legenda";

function CamadasDeck(props: MapboxOverlayProps) {
  const overlay = useControl(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

const temaEscuro = matchMedia("(prefers-color-scheme: dark)");
const temaDoSistema = (): Tema => (temaEscuro.matches ? "escuro" : "claro");

/** Começa pelo tema do sistema e segue ele até a pessoa trocar no botão dos controles. */
function useTema(): [Tema, () => void] {
  const [tema, setTema] = useState<Tema>(temaDoSistema);
  useEffect(() => {
    const mudar = () => setTema(temaDoSistema());
    temaEscuro.addEventListener("change", mudar);
    return () => temaEscuro.removeEventListener("change", mudar);
  }, []);
  useEffect(() => { document.documentElement.dataset.tema = tema; }, [tema]);
  return [tema, () => setTema((t) => (t === "escuro" ? "claro" : "escuro"))];
}

const USANDO_MOCK = import.meta.env.VITE_USAR_MOCK === "true";

type Carga<T> = { ok: T } | { erro: string } | null;

export default function App() {
  const [tema, trocarTema] = useTema();
  const [rede, setRede] = useState<Carga<Rede>>(null);
  // A análise é opcional: sem ela o mapa fica em cinza e a barra mostra "—".
  const [analise, setAnalise] = useState<Carga<Analise>>(null);
  const [visiveis, setVisiveis] = useState<Visiveis>(VISIVEIS_INICIAL);

  useEffect(() => {
    carregarRede().then((ok) => setRede({ ok }), (e: Error) => setRede({ erro: e.message }));
    carregarAnalise().then((ok) => setAnalise({ ok }), (e: Error) => setAnalise({ erro: e.message }));
  }, []);

  const redeOk = rede && "ok" in rede ? rede.ok : null;
  const analiseOk = analise && "ok" in analise ? analise.ok : null;
  const dados = useMemo(() => (redeOk ? prepararDados(redeOk, analiseOk) : null), [redeOk, analiseOk]);
  const camadas = useMemo(() => (dados ? montarCamadas(dados, visiveis, tema) : []), [dados, visiveis, tema]);
  const temChaves = useMemo(() => !!redeOk?.arestas.some((a) => a[3] === "chave"), [redeOk]);

  return (
    <>
      <Map
        initialViewState={CENTRO_BH}
        mapStyle={estiloDoMapa(tema === "escuro")}
        attributionControl={{ compact: true, customAttribution: "© OpenStreetMap contributors" }}
        style={{ position: "fixed", inset: 0 }}
      >
        <CamadasDeck layers={camadas} />
        <Controles visiveis={visiveis} aoMudar={setVisiveis} temChaves={temChaves} tema={tema} aoTrocarTema={trocarTema} />
      </Map>

      {redeOk && <Barra area={redeOk.area} analise={analiseOk} usandoMock={USANDO_MOCK} />}
      {redeOk && <Legenda tema={tema} />}

      {!rede && <p className="vidro aviso" role="status">Carregando a rede de Belo Horizonte…</p>}
      {rede && "erro" in rede && (
        <p className="vidro aviso aviso-erro" role="alert">
          <strong>Não deu para carregar a rede.</strong>
          <span>{rede.erro}</span>
        </p>
      )}
      {redeOk && analise && "erro" in analise && (
        <p className="vidro aviso aviso-erro" role="alert">
          <strong>Não deu para carregar a análise.</strong>
          <span>{analise.erro}</span>
        </p>
      )}
    </>
  );
}
