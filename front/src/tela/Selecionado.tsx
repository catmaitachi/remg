import { FECHAR, Icone } from "./Icone";

interface Props {
  detalhe: { titulo: string; linhas: [string, string][] }; aoFechar: () => void;
  /** ícone do tipo do item (subestação, trecho, chave, linha AT), em data URL */
  icone?: string;
  /** Derrubar ou Restaurar: sem seletor de modo, a falha nasce aqui */
  acao?: { texto: string; aoClicar: () => void };
}

/** O que foi clicado no mapa: capacidade, fluxo e uso (spec 07), e a ação de derrubar ou restaurar. */
export function Selecionado({ detalhe, aoFechar, acao, icone }: Props) {
  return (
    <section className="selecionado" aria-label="Selecionado" aria-live="polite">
      <div className="falhas-topo">
        <h2 className="falhas-titulo selecionado-titulo">
          {icone && <img className="selecionado-icone" src={icone} alt="" width={20} height={20} />}
          {detalhe.titulo}
        </h2>
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
      {acao && <button type="button" className="botao-secundario" onClick={acao.aoClicar}>{acao.texto}</button>}
    </section>
  );
}
