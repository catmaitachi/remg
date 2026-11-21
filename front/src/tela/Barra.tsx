import type { Analise } from "../api/tipos";
import type { Alvo } from "./falhas";
import { formatarPotencia, formatarTempo, resumoDaCidade } from "./resumo";
import { Logo } from "./Logo";

export type Modo = "observar" | "derrubar";

interface Props {
  area: string; analise: Analise | null; usandoMock: boolean;
  modo: Modo; aoMudarModo: (m: Modo) => void;
  falhas: { alvo: Alvo; rotulo: string }[]; calculando: boolean;
  aoRestaurar: (alvo: Alvo) => void; aoRestaurarTudo: () => void;
}

const MODOS: [Modo, string][] = [["observar", "Observar"], ["derrubar", "Derrubar"]];
const Icone = ({ d }: { d: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const FECHAR = "M6 6l12 12M18 6 6 18";
const RESTAURAR = "M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5";

export function Barra({ area, analise, usandoMock, modo, aoMudarModo, falhas, calculando, aoRestaurar, aoRestaurarTudo }: Props) {
  const resumo = analise ? resumoDaCidade(analise) : null;
  const blocos: [string, string][] = [
    ["Energia entregue", analise ? formatarPotencia(analise.fluxoTotal) : "—"],
    ["Demanda", analise ? formatarPotencia(analise.demandaTotal) : "—"],
    ["Gargalos", analise ? analise.gargalos.length.toLocaleString("pt-BR") : "—"],
    ["Tempo de cálculo", analise ? formatarTempo(analise.tempoMs) : "—"],
  ];

  return (
    <aside className="vidro barra" aria-label="Resumo da rede">
      <header className="marca">
        <span className="selo" aria-hidden="true"><Logo /></span>
        <span>
          <strong className="marca-nome">REMG</strong>
          <span className="marca-sub">Rede de Energia de Minas Gerais</span>
        </span>
      </header>

      <div className="modo">
        <div className="segmentos segmentos-2" role="group" aria-label="Modo">
          {MODOS.map(([m, nome]) => (
            <button key={m} type="button" aria-pressed={modo === m} onClick={() => aoMudarModo(m)}>{nome}</button>
          ))}
        </div>
        {modo === "derrubar" && !falhas.length && <p className="modo-dica">Clique num trecho ou numa subestação para derrubar.</p>}
      </div>

      <section className="cidade" aria-live="polite" aria-label="Situação da área">
        <p className="cidade-linha">
          <span className="cidade-area">{area}</span>
          <span className="cidade-porcento">{resumo ? `${resumo.porcento}%` : "—"}</span>
        </p>
        <div
          className="cidade-barra" role="progressbar" aria-label="Demanda com luz"
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={resumo?.porcento}
        >
          <span style={{ width: `${resumo?.porcento ?? 0}%` }} />
        </div>
        <p className="cidade-frase">{resumo?.frase ?? "Sem dados da análise"}</p>
        {/* sempre no DOM: o leitor de tela só anuncia mudança dentro de um status que já existe */}
        <p className="calculando" role="status">
          {calculando && <><span className="calculando-ponto" aria-hidden="true" />Calculando…</>}
        </p>
      </section>

      {falhas.length > 0 && (
        <section className="falhas" aria-label="Falhas">
          <div className="falhas-topo">
            <h2 className="falhas-titulo">Falhas <span>{falhas.length}</span></h2>
            <button type="button" className="botao-texto" onClick={aoRestaurarTudo}>
              <Icone d={RESTAURAR} />Restaurar tudo
            </button>
          </div>
          <ul className="falhas-lista">
            {falhas.map(({ alvo, rotulo }) => (
              <li key={alvo.id}>
                <span>{rotulo}</span>
                <button type="button" className="falhas-tirar" aria-label={`Restaurar ${rotulo}`} title={`Restaurar ${rotulo}`}
                  onClick={() => aoRestaurar(alvo)}>
                  <Icone d={FECHAR} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <dl className="blocos">
        {blocos.map(([rotulo, valor]) => (
          <div className="bloco" key={rotulo}>
            <dt>{rotulo}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>

      {usandoMock && <p className="barra-nota">Dados de exemplo até o servidor ficar pronto.</p>}
    </aside>
  );
}
