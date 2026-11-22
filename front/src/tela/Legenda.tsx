import { PALETA, type Tema } from "../mapa/cores";

const ITENS = [
  ["normal", "Normal, abaixo de 60%"],
  ["alerta", "Perto do limite, 60 a 90%"],
  ["gargalo", "Gargalo, 90% ou mais"],
] as const;

interface Props { tema: Tema; semLuz: boolean; caidos: boolean; religou: boolean }

export function Legenda({ tema, semLuz, caidos, religou }: Props) {
  const p = PALETA[tema];
  return (
    <section className="vidro legenda" aria-label="Legenda do uso das linhas">
      {ITENS.map(([faixa, texto]) => (
        <span className="legenda-item" key={faixa}>
          <svg width="28" height="12" viewBox="0 0 28 12" aria-hidden="true">
            {faixa === "gargalo" && <path d="M3 6H25" stroke={p.fundo} strokeWidth="8" strokeLinecap="round" />}
            <path d="M3 6H25" stroke={p[faixa]} strokeWidth={faixa === "gargalo" ? 4 : 3} strokeLinecap="round" />
          </svg>
          {texto}
        </span>
      ))}
      {semLuz && (
        <span className="legenda-item">
          <svg width="28" height="12" viewBox="0 0 28 12" aria-hidden="true">
            <path d="M3 6H25" stroke={p.semLuz} strokeWidth="3" strokeLinecap="round" />
          </svg>
          Sem luz
        </span>
      )}
      {caidos && (
        <span className="legenda-item">
          <svg width="28" height="12" viewBox="0 0 28 12" aria-hidden="true">
            <path d="M2 6h4M9 6h4M16 6h4M23 6h3" stroke={p.caido} strokeWidth="3" strokeLinecap="round" />
            <path d="M11 3l6 6M17 3l-6 6" stroke={p.caido} strokeWidth="2" strokeLinecap="round" />
          </svg>
          Linha caída
        </span>
      )}
      {religou && (
        <span className="legenda-item">
          <svg width="28" height="12" viewBox="0 0 28 12" aria-hidden="true">
            <path d="M3 6H25" stroke={p.primario} strokeWidth="3" strokeLinecap="round" />
            <circle cx="14" cy="6" r="4.5" fill={p.fundo} stroke={p.primario} strokeWidth="2" />
          </svg>
          Chave fechada pelo religamento
        </span>
      )}
    </section>
  );
}
