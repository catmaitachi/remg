import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useMap } from "react-map-gl/maplibre";
import type { Visiveis } from "../mapa/camadas";
import { CENTRO_BH } from "../mapa/camadas";
import { PALETA, type Tema } from "../mapa/cores";

interface Props {
  visiveis: Visiveis; aoMudar: (v: Visiveis) => void; temChaves: boolean; tema: Tema; aoTrocarTema: () => void;
}

const Icone = ({ d }: { d: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const MAIS = "M12 5v14M5 12h14";
const MENOS = "M5 12h14";
const CENTRO = "M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z";
const CAMADAS = "M12 3 2 8l10 5 10-5-10-5zM2 16l10 5 10-5M2 12l10 5 10-5";
const SOL = "M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z";
const LUA = "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z";

/** Fica fora do <Map>, dentro do MapProvider do App: acha o mapa pelo id "mapa". */
export function Controles({ visiveis, aoMudar, temChaves, tema, aoTrocarTema }: Props) {
  const { mapa } = useMap();
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const idPainel = useId();
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
    { chave: "subestacoes", nome: "Subestações", amostra: <circle cx="13" cy="7" r="5" fill={p.subestacao} stroke={p.contorno} strokeWidth="1.5" /> },
    {
      chave: "chaves", nome: "Chaves", apoio: temChaves ? undefined : "nenhuma nesta rede",
      amostra: <rect x="8" y="2" width="10" height="10" fill={p.contorno} stroke={p.at} strokeWidth="2" />,
    },
  ];

  return (
    <div ref={raiz}>
      <div className="vidro controles" role="toolbar" aria-label="Controles do mapa" aria-orientation="vertical">
        <button type="button" className="controle" aria-label="Aproximar" onClick={() => mapa?.zoomIn()}><Icone d={MAIS} /></button>
        <button type="button" className="controle" aria-label="Afastar" onClick={() => mapa?.zoomOut()}><Icone d={MENOS} /></button>
        <button type="button" className="controle" aria-label="Voltar para Belo Horizonte"
          onClick={() => mapa?.flyTo({ center: [CENTRO_BH.longitude, CENTRO_BH.latitude], zoom: CENTRO_BH.zoom })}>
          <Icone d={CENTRO} />
        </button>
        <button type="button" className="controle" onClick={aoTrocarTema}
          aria-label={tema === "escuro" ? "Usar tema claro" : "Usar tema escuro"}>
          <Icone d={tema === "escuro" ? SOL : LUA} />
        </button>
        <button ref={botao} type="button" className="controle" aria-label="Camadas" aria-expanded={aberto} aria-controls={idPainel}
          onClick={() => setAberto((a) => !a)}>
          <Icone d={CAMADAS} />
        </button>
      </div>

      <section id={idPainel} className="vidro painel" aria-label="Camadas" hidden={!aberto}>
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
      </section>
    </div>
  );
}
