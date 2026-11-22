import type { EstadoRota } from "./falhas";
import { formatarPotencia, formatarTempo } from "./resumo";

interface Props {
  rota: EstadoRota | null; faltando: number; temFalhas: boolean; temSemLuz: boolean; usandoMock: boolean; calculando: boolean;
  aoAcharRota: () => void;
}

const plural = (n: number, um: string, varios: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? um : varios}`;
const TEXTO_DO_BOTAO = { buscando: "Procurando rota…", religando: "Religando…" } as const;

/** Modo Religar (T21): acha a rota pelas chaves abertas e diz quanto voltou, inclusive quando volta só em parte. */
export function Religamento({ rota, faltando, temFalhas, temSemLuz, usandoMock, calculando, aoAcharRota }: Props) {
  const fase = rota?.fase;
  const r = fase === "pronta" ? rota?.resultado : null;
  // sem ponto sem luz a rota não tem o que religar: o pedido levaria ~8 s em BH para responder "nada"
  const dica = usandoMock ? "O Religar precisa do servidor." : !temFalhas ? "Derrube algo no modo Derrubar primeiro."
    : !temSemLuz && !calculando ? (r ? "" : "Nenhum ponto sem luz para religar.") : null;

  return (
    <section className="religamento" aria-label="Religamento">
      <button type="button" className="botao-primario" disabled={dica !== null || calculando} onClick={aoAcharRota}>
        {fase === "buscando" || fase === "religando" ? TEXTO_DO_BOTAO[fase] : "Achar rota"}
      </button>
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
