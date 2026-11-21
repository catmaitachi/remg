import { PALETA, type Tema } from "../mapa/cores";

const ITENS = [
  ["normal", "Normal, abaixo de 60%"],
  ["alerta", "Perto do limite, 60 a 90%"],
  ["gargalo", "Gargalo, 90% ou mais"],
] as const;

export function Legenda({ tema }: { tema: Tema }) {
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
    </section>
  );
}
