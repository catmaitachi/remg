import type { EstadoRota } from "./falhas";
import { formatarPotencia, formatarTempo } from "./resumo";

const plural = (n: number, um: string, varios: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? um : varios}`;
const TEXTO_DO_BOTAO = { buscando: "Procurando rota…", religando: "Religando…" } as const;

/** Botão do modo Religar, que mora no console (T21). */
export function AcharRota({ rota, dica, calculando, aoAcharRota }: {
  rota: EstadoRota | null; dica: string | null; calculando: boolean; aoAcharRota: () => void;
}) {
  const fase = rota?.fase;
  return (
    <button type="button" className="botao-primario" disabled={dica !== null || calculando} onClick={aoAcharRota}>
      {fase === "buscando" || fase === "religando" ? TEXTO_DO_BOTAO[fase] : "Achar rota"}
    </button>
  );
}

/** Resultado do Religar no cartão de contexto: diz quanto voltou, inclusive quando volta só em parte. */
export function Religamento({ rota, faltando, dica }: { rota: EstadoRota | null; faltando: number; dica: string | null }) {
  const r = rota?.fase === "pronta" ? rota.resultado : null;
  return (
    <section className="religamento" aria-label="Religamento">
      {dica && <p className="modo-dica">{dica}</p>}
      {/* sempre no DOM: o leitor de tela só anuncia mudança dentro de um status que já existe */}
      <div role="status">
        {r && !r.chavesParaFechar.length && <p className="religamento-nada">Nenhuma chave alcança a área sem luz.</p>}
        {r && r.chavesParaFechar.length > 0 && (
          <div className="religamento-resultado">
            <p className="religamento-total">
              {plural(r.chavesParaFechar.length, "chave fechada", "chaves fechadas")} · {plural(r.religado.pontos, "ponto religado", "pontos religados")}
            </p>
            {/* a linha da cidade já diz quanto falta; aqui, quanto chegou do que estava sem luz */}
            <p className={faltando > 0 ? "religamento-parcial" : "religamento-completo"}>
              {faltando > 0
                ? `Só chegam ${formatarPotencia(r.religado.demanda)} dos ${formatarPotencia(rota!.semLuzAntes)} que faltavam`
                : `Tudo religado: ${formatarPotencia(r.religado.demanda)}`}
            </p>
            <p className="modo-dica">Tempo da rota {formatarTempo(r.tempoMs)}</p>
          </div>
        )}
      </div>
    </section>
  );
}
