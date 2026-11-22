import { useEffect, useMemo, useReducer, useState } from "react";
import { Map, MapProvider } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import "./tela/tela.css";
import { carregarAnalise, carregarRede, pedirAnalise } from "./api/carregar";
import type { Analise, Rede } from "./api/tipos";
import { animacaoInicial } from "./mapa/animacao";
import { CENTRO_BH, VISIVEIS_INICIAL, estiloDoMapa, prepararDados, type Intensidade, type Visiveis } from "./mapa/camadas";
import { CamadasDeck } from "./mapa/CamadasDeck";
import type { Tema } from "./mapa/cores";
import { Barra, type Modo } from "./tela/Barra";
import { Controles } from "./tela/Controles";
import { Legenda } from "./tela/Legenda";
import { ESTADO_INICIAL, pedidoDe, reduzirFalhas, rotuloDoAlvo } from "./tela/falhas";
import { Selecionado } from "./tela/Selecionado";
import { detalheDe, type Selecao } from "./tela/selecao";

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

const movimentoReduzido = matchMedia("(prefers-reduced-motion: reduce)");

/** Animação ligada, a não ser que o sistema peça menos movimento; segue a mudança da preferência. */
function useAnimacao(): [boolean, () => void] {
  const [ligada, setLigada] = useState(() => animacaoInicial(movimentoReduzido.matches));
  useEffect(() => {
    const mudar = () => setLigada(animacaoInicial(movimentoReduzido.matches));
    movimentoReduzido.addEventListener("change", mudar);
    return () => movimentoReduzido.removeEventListener("change", mudar);
  }, []);
  return [ligada, () => setLigada((l) => !l)];
}

const USANDO_MOCK = import.meta.env.VITE_USAR_MOCK === "true";

type Carga<T> = { ok: T } | { erro: string } | null;

export default function App() {
  const [tema, trocarTema] = useTema();
  const [animando, alternarAnimacao] = useAnimacao();
  const [intensidade, setIntensidade] = useState<Intensidade>("media");
  const [rede, setRede] = useState<Carga<Rede>>(null);
  // A análise é opcional: sem ela o mapa fica em cinza e a barra mostra "—".
  const [analise, setAnalise] = useState<Carga<Analise>>(null);
  const [visiveis, setVisiveis] = useState<Visiveis>(VISIVEIS_INICIAL);
  const [modo, setModo] = useState<Modo>("observar");
  const [selecao, setSelecao] = useState<Selecao | null>(null);
  // falhas, análise atual e "calculando": só vale a resposta da versão atual da lista (reducer testado em falhas.ts)
  const [estado, despachar] = useReducer(reduzirFalhas, ESTADO_INICIAL);

  useEffect(() => {
    carregarRede().then((ok) => setRede({ ok }), (e: Error) => setRede({ erro: e.message }));
    carregarAnalise().then((ok) => { setAnalise({ ok }); despachar({ tipo: "inicial", analise: ok }); }, (e: Error) => setAnalise({ erro: e.message }));
  }, []);

  const redeOk = rede && "ok" in rede ? rede.ok : null;
  const dados = useMemo(() => (redeOk ? prepararDados(redeOk, estado.atual) : null), [redeOk, estado.atual]);
  const listaDeFalhas = useMemo(
    () => (redeOk ? estado.falhas.map((alvo) => ({ alvo, rotulo: rotuloDoAlvo(alvo, redeOk) })) : []), [redeOk, estado.falhas],
  );

  // Cada mudança na lista pede a análise da lista inteira (a API não tem estado). O abort cobre clique novo e saída.
  useEffect(() => {
    if (!redeOk || !estado.falhas.length) return;
    const controle = new AbortController(), versao = estado.versao;
    pedirAnalise(pedidoDe(estado.falhas), redeOk, controle.signal).then(
      (ok) => despachar({ tipo: "resposta", versao, resultado: { ok } }),
      (e: Error) => { if (!controle.signal.aborted) despachar({ tipo: "resposta", versao, resultado: { erro: e.message } }); },
    );
    return () => controle.abort();
  }, [redeOk, estado.versao, estado.falhas]);
  const temChaves = useMemo(() => !!redeOk?.arestas.some((a) => a[3] === "chave"), [redeOk]);

  // MapProvider: os controles usam useMap() fora do <Map>. Dentro dele ficariam abaixo do canvas do deck.gl,
  // que o MapLibre põe num contêiner de controle com z-index 2.
  return (
    <MapProvider>
      <Map
        id="mapa"
        initialViewState={CENTRO_BH}
        mapStyle={estiloDoMapa(tema === "escuro")}
        attributionControl={{ compact: true, customAttribution: "© OpenStreetMap contributors" }}
        style={{ position: "fixed", inset: 0 }}
      >
        <CamadasDeck dados={dados} visiveis={visiveis} tema={tema} animando={animando} intensidade={intensidade}
          falhas={estado.falhas} derrubando={modo === "derrubar"} aoClicar={(alvo) => despachar({ tipo: "alternar", alvo })}
          aoSelecionar={setSelecao} />
      </Map>

      <Controles visiveis={visiveis} aoMudar={setVisiveis} temChaves={temChaves} tema={tema} aoTrocarTema={trocarTema}
        animando={animando} aoAlternarAnimacao={alternarAnimacao} intensidade={intensidade} aoMudarIntensidade={setIntensidade} />

      {redeOk && (
        <Barra area={redeOk.area} analise={estado.atual} usandoMock={USANDO_MOCK} modo={modo}
          aoMudarModo={(m) => { setModo(m); if (m === "derrubar") setSelecao(null); }}
          falhas={listaDeFalhas} calculando={estado.calculando}
          aoRestaurar={(alvo) => despachar({ tipo: "alternar", alvo })} aoRestaurarTudo={() => despachar({ tipo: "restaurarTudo" })}>
          {selecao && modo !== "derrubar" && (
            <Selecionado detalhe={detalheDe(selecao, redeOk, estado.atual, estado.falhas, estado.chavesFechadas)} aoFechar={() => setSelecao(null)} />
          )}
        </Barra>
      )}
      {redeOk && <Legenda tema={tema} semLuz={!!estado.atual?.semEnergia.pontos.length} caidos={estado.falhas.length > 0} />}

      {!rede && <p className="vidro aviso" role="status">Carregando a rede de Belo Horizonte…</p>}
      {rede && "erro" in rede && (
        <p className="vidro aviso aviso-erro" role="alert">
          <strong>Não deu para carregar a rede.</strong>
          <span>{rede.erro}</span>
        </p>
      )}
      {estado.erro && (
        <p className="vidro aviso aviso-erro" role="alert">
          <strong>Não deu para calcular a falha.</strong>
          <span>{estado.erro}</span>
        </p>
      )}
      {redeOk && analise && "erro" in analise && (
        <p className="vidro aviso aviso-erro" role="alert">
          <strong>Não deu para carregar a análise.</strong>
          <span>{analise.erro}</span>
        </p>
      )}
    </MapProvider>
  );
}
