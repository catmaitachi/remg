import { FECHAR, Icone } from "./Icone";

interface Props { detalhe: { titulo: string; linhas: [string, string][] }; aoFechar: () => void }

/** O que foi clicado no Observar ou no Religar: capacidade, fluxo e uso (spec 07). */
export function Selecionado({ detalhe, aoFechar }: Props) {
  return (
    <section className="selecionado" aria-label="Selecionado" aria-live="polite">
      <div className="falhas-topo">
        <h2 className="falhas-titulo">{detalhe.titulo}</h2>
        <button type="button" className="falhas-tirar" aria-label="Fechar" title="Fechar" onClick={aoFechar}>
          <Icone d={FECHAR} />
        </button>
      </div>
      <dl className="selecionado-linhas">
        {detalhe.linhas.map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt>{rotulo}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
