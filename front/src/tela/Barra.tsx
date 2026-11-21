import type { Analise } from "../api/tipos";
import { formatarPotencia, formatarTempo, resumoDaCidade } from "./resumo";

interface Props { area: string; analise: Analise | null; usandoMock: boolean }

export function Barra({ area, analise, usandoMock }: Props) {
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
        <span className="selo" aria-hidden="true">RE</span>
        <span>
          <strong className="marca-nome">REMG</strong>
          <span className="marca-sub">Rede de Energia de Minas Gerais</span>
        </span>
      </header>

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
      </section>

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
