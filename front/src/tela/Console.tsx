import type { ReactNode } from "react";
import type { Analise } from "../api/tipos";
import type { Alvo } from "./falhas";
import { formatarEntregue, formatarTempo, resumoDaCidade } from "./resumo";
import { Logo } from "./Logo";
import { FECHAR, Icone, RESTAURAR } from "./Icone";

interface Props {
  analise: Analise | null;
  /** kVA que o religamento parcial não devolveu: a linha da cidade não pode dizer 100% */
  faltando: number; calculando: boolean;
  /** tema e camadas, no fim da linha */
  ferramentas?: ReactNode;
}

/** Console no topo (T21): linha compacta com a logo, os números (rótulo e valor), o selo da cidade e as ferramentas. */
export function Console({ analise, faltando, calculando, ferramentas }: Props) {
  const resumo = analise ? resumoDaCidade(analise, faltando) : null;
  const numeros: [string, string][] = [
    ["Entregue", analise ? formatarEntregue(analise.fluxoTotal, analise.demandaTotal) : "—"],
    ["Gargalos", analise ? analise.gargalos.length.toLocaleString("pt-BR") : "—"],
    ["Cálculo", analise ? formatarTempo(analise.tempoMs) : "—"],
  ];

  return (
    <header className={`superficie console${calculando ? " console-calculando" : ""}`} aria-label="Resumo da rede">
      <h1 className="console-marca"><Logo /></h1>

      <dl className="numeros">
        {numeros.map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt>{rotulo}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>

      <section className="cidade" aria-live="polite" aria-label="Situação da área">
        <span className="cidade-frase">{resumo?.frase ?? "Sem dados da análise"}</span>
        {/* sempre no DOM: o leitor de tela só anuncia mudança dentro de um status que já existe */}
        <span className="calculando" role="status">
          {calculando && <><span className="calculando-ponto" aria-hidden="true" />Calculando…</>}
        </span>
      </section>
      {ferramentas}
    </header>
  );
}

/** Bloco de falhas abaixo do cartão de contexto: o nome leva o mapa até a falha, o X restaura, e o Religar vem dentro. */
export function Falhas({ falhas, aoRestaurar, aoRestaurarTudo, aoIr, children }: {
  falhas: { alvo: Alvo; rotulo: string }[]; aoRestaurar: (alvo: Alvo) => void; aoRestaurarTudo: () => void;
  aoIr: (alvo: Alvo) => void; children?: ReactNode;
}) {
  return (
    <aside className="superficie bloco-falhas" aria-label="Falhas">
      <div className="falhas-topo">
        <h2 className="falhas-titulo">Falhas <span>{falhas.length}</span></h2>
        <button type="button" className="botao-texto" onClick={aoRestaurarTudo}>
          <Icone d={RESTAURAR} />Restaurar tudo
        </button>
      </div>
      <ul className="falhas-lista">
        {falhas.map(({ alvo, rotulo }) => (
          <li key={alvo.id}>
            <button type="button" className="falhas-ir" title={`Ir até ${rotulo}`} onClick={() => aoIr(alvo)}>{rotulo}</button>
            <button type="button" className="falhas-tirar" aria-label={`Restaurar ${rotulo}`} title={`Restaurar ${rotulo}`}
              onClick={() => aoRestaurar(alvo)}>
              <Icone d={FECHAR} />
            </button>
          </li>
        ))}
      </ul>
      {children}
    </aside>
  );
}
