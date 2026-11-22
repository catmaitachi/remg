import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useMap } from "react-map-gl/maplibre";
import { iconeChave, iconeSubestacao, type Intensidade, type Visiveis } from "../mapa/camadas";
import { PALETA, type Tema } from "../mapa/cores";

interface Props {
  visiveis: Visiveis; aoMudar: (v: Visiveis) => void; temChaves: boolean; tema: Tema; aoTrocarTema: () => void;
  animando: boolean; aoAlternarAnimacao: () => void; intensidade: Intensidade; aoMudarIntensidade: (i: Intensidade) => void;
}

const Icone = ({ d }: { d: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const MAIS = "M12 5v14M5 12h14";
const MENOS = "M5 12h14";
const CAMADAS = "M12 3 2 8l10 5 10-5-10-5zM2 16l10 5 10-5M2 12l10 5 10-5";
const SOL = "M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z";
const LUA = "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z";
const NIVEIS: [Intensidade, string][] = [["suave", "Suave"], ["media", "Média"], ["forte", "Forte"]];

/** Zoom e norte no canto de baixo; fica fora do <Map>, dentro do MapProvider do App: acha o mapa pelo id "mapa". */
export function Controles() {
  const { mapa } = useMap();
  // rumo do mapa em graus: a agulha da bússola gira ao contrário para continuar apontando o norte
  const [rumo, setRumo] = useState(0);

  useEffect(() => {
    if (!mapa) return;
    const ler = () => setRumo(mapa.getBearing());
    ler();
    mapa.on("rotate", ler);
    return () => { mapa.off("rotate", ler); };
  }, [mapa]);

  return (
    <div className="superficie controles" role="toolbar" aria-label="Controles do mapa" aria-orientation="vertical">
        <button type="button" className="controle" aria-label="Aproximar" onClick={() => mapa?.zoomIn()}><Icone d={MAIS} /></button>
        <button type="button" className="controle" aria-label="Afastar" onClick={() => mapa?.zoomOut()}><Icone d={MENOS} /></button>
        <button type="button" className="controle" aria-label="Apontar para o norte" onClick={() => mapa?.resetNorthPitch()}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ transform: `rotate(${-rumo}deg)` }}>
            <path d="M12 2.5 16 12H8z" fill="currentColor" />
            <path d="M12 21.5 8 12h8z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        </button>
    </div>
  );
}

/** Tema e camadas, no fim da linha de comando do console; o painel abre embaixo do botão. */
export function Ferramentas({ visiveis, aoMudar, temChaves, tema, aoTrocarTema, animando, aoAlternarAnimacao, intensidade, aoMudarIntensidade }: Props) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const idPainel = useId();
  const idIntensidade = useId();
  const p = PALETA[tema];

  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") { setAberto(false); botao.current?.focus(); } };
    const fora = (e: PointerEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    document.addEventListener("keydown", tecla);
    document.addEventListener("pointerdown", fora);
    return () => { document.removeEventListener("keydown", tecla); document.removeEventListener("pointerdown", fora); };
  }, [aberto]);

  const linhas: { chave: keyof Visiveis; nome: string; apoio?: string; amostra: ReactNode }[] = [
    { chave: "at", nome: "Alta tensão", amostra: <path d="M3 7H23" stroke={p.at} strokeWidth="5" strokeLinecap="round" /> },
    { chave: "distribuicao", nome: "Distribuição", amostra: <path d="M3 7H23" stroke={p.normal} strokeWidth="3" strokeLinecap="round" /> },
    { chave: "subestacoes", nome: "Subestações", amostra: <image href={iconeSubestacao(p.subestacao, p.contorno, p.fundo)} x="6" y="0" width="14" height="14" /> },
    {
      chave: "chaves", nome: "Chaves", apoio: temChaves ? undefined : "nenhuma nesta rede",
      amostra: <image href={iconeChave(p.at, p.contorno)} x="6" y="0" width="14" height="14" />,
    },
    {
      chave: "predios3d", nome: "Prédios 3D",
      amostra: <path d="M8 12V5l5-3 5 3v7M8 5l5 3 5-3M13 8v5" fill="none" stroke={p.at} strokeWidth="1.5" strokeLinejoin="round" />,
    },
  ];


  return (
    <div ref={raiz} className="ferramentas">
        <button type="button" className="controle" onClick={aoTrocarTema}
          aria-label={tema === "escuro" ? "Usar tema claro" : "Usar tema escuro"}>
          <Icone d={tema === "escuro" ? SOL : LUA} />
        </button>
        <button ref={botao} type="button" className="controle" aria-label="Camadas" aria-expanded={aberto} aria-controls={idPainel}
          onClick={() => setAberto((a) => !a)}>
          <Icone d={CAMADAS} />
        </button>

      <section id={idPainel} className="superficie painel" aria-label="Camadas" hidden={!aberto}>
        <h2 className="painel-titulo">Camadas</h2>
        <ul className="painel-lista">
          {linhas.map(({ chave, nome, apoio, amostra }) => (
            <li key={chave}>
              <svg width="26" height="14" viewBox="0 0 26 14" aria-hidden="true">{amostra}</svg>
              <span className="painel-nome">{nome}{apoio && <small>{apoio}</small>}</span>
              <button type="button" role="switch" className="switch" aria-checked={visiveis[chave]} aria-label={nome}
                onClick={() => aoMudar({ ...visiveis, [chave]: !visiveis[chave] })} />
            </li>
          ))}
        </ul>

        <h2 className="painel-titulo painel-secao">Efeito elétrico</h2>
        <ul className="painel-lista">
          <li>
            <svg width="26" height="14" viewBox="0 0 26 14" aria-hidden="true">
              <path d="M17 1.5 9 7h8l-8 5.5" fill="none" stroke={p.normal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="painel-nome">Animação do fluxo</span>
            <button type="button" role="switch" className="switch" aria-checked={animando} aria-label="Animação do fluxo"
              onClick={aoAlternarAnimacao} />
          </li>
        </ul>
        <p className="painel-rotulo" id={idIntensidade}>Intensidade</p>
        <div className="segmentos" role="group" aria-labelledby={idIntensidade}>
          {NIVEIS.map(([nivel, nome]) => (
            <button key={nivel} type="button" aria-pressed={intensidade === nivel} disabled={!animando}
              onClick={() => aoMudarIntensidade(nivel)}>{nome}</button>
          ))}
        </div>
        {/* o botão (i) do MapLibre saiu: o crédito do mapa fica aqui, curto, com as fontes */}
        <p className="painel-credito">
          Mapa © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>
          {" · "}<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a>
          {" · "}<a href="https://www.openmaptiles.org" target="_blank" rel="noreferrer">OpenMapTiles</a>
        </p>
      </section>
    </div>
  );
}
