import type { ReactNode } from "react";
import type { Analise } from "../api/tipos";
import type { Alvo } from "./falhas";
import { formatarPotencia, formatarTempo, resumoDaCidade } from "./resumo";
import { Logo } from "./Logo";
import { FECHAR, Icone } from "./Icone";

export type Modo = "observar" | "derrubar" | "religar";

interface Props {
  area: string; analise: Analise | null;
  /** kVA que o religamento parcial não devolveu: a linha da cidade não pode dizer 100% */
  faltando: number; calculando: boolean;
  modo: Modo; aoMudarModo: (m: Modo) => void;
  /** botão do modo (Achar rota, Restaurar tudo), na linha de comando */
  acao?: ReactNode;
  /** tema e camadas, no fim da linha de comando */
  ferramentas?: ReactNode;
}

const MODOS: [Modo, string][] = [["observar", "Observar"], ["derrubar", "Derrubar"], ["religar", "Religar"]];

/** Console no topo (T21): linha de comando (logo, modos, ação, ferramentas) e linha de leitura (a cidade e os números). */
export function Console({ area, analise, faltando, calculando, modo, aoMudarModo, acao, ferramentas }: Props) {
  const resumo = analise ? resumoDaCidade(analise, faltando) : null;
  const numeros: [string, string][] = [
    ["Energia entregue", analise ? formatarPotencia(analise.fluxoTotal) : "—"],
    ["Demanda", analise ? formatarPotencia(analise.demandaTotal) : "—"],
    ["Gargalos", analise ? analise.gargalos.length.toLocaleString("pt-BR") : "—"],
    ["Tempo de cálculo", analise ? formatarTempo(analise.tempoMs) : "—"],
  ];

  return (
    <header className="superficie console" aria-label="Resumo da rede">
      <div className="console-comando">
      <h1 className="console-marca"><Logo /></h1>
      <div className="segmentos console-modos" role="group" aria-label="Modo">
        {MODOS.map(([m, nome]) => (
          <button key={m} type="button" aria-pressed={modo === m} onClick={() => aoMudarModo(m)}>{nome}</button>
        ))}
      </div>
      <span className="console-vao" />
      {acao && <div className="console-acao">{acao}</div>}
      {ferramentas}
      </div>

      <div className="console-leitura">
      <section className="cidade" aria-live="polite" aria-label="Situação da área">
        <span className="cidade-area">{area}</span>
        <span className="cidade-porcento">{resumo ? `${resumo.porcento}%` : "—"}</span>
        <div
          className="cidade-barra" role="progressbar" aria-label="Demanda com luz"
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={resumo?.porcento}
        >
          <span style={{ width: `${resumo?.porcento ?? 0}%` }} />
        </div>
        <span className="cidade-frase">{resumo?.frase ?? "Sem dados da análise"}</span>
        {/* sempre no DOM: o leitor de tela só anuncia mudança dentro de um status que já existe */}
        <span className="calculando" role="status">
          {calculando && <><span className="calculando-ponto" aria-hidden="true" />Calculando…</>}
        </span>
      </section>

      <dl className="numeros">
        {numeros.map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt>{rotulo}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
      </div>
    </header>
  );
}

/** Falhas no cartão de contexto: cada uma sai pelo X; o Restaurar tudo fica no console. */
export function Falhas({ falhas, aoRestaurar }: { falhas: { alvo: Alvo; rotulo: string }[]; aoRestaurar: (alvo: Alvo) => void }) {
  return (
    <section className="falhas" aria-label="Falhas">
      <h2 className="falhas-titulo">Falhas <span>{falhas.length}</span></h2>
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
  );
}
