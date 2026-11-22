import type { Analise } from "../api/tipos";

/**
 * % com luz pela demanda, arredondado para baixo: 100% só quando nada falta.
 * `faltando` (kVA) é o que um religamento parcial não devolveu: já inclui quem segue sem caminho, então não se soma.
 */
export function resumoDaCidade(a: Analise, faltando = 0): { porcento: number; frase: string } {
  const n = a.semEnergia.pontos.length;
  const perda = Math.max(a.semEnergia.demanda, faltando);
  const porcento = a.demandaTotal > 0 ? Math.max(0, Math.floor(100 * (1 - perda / a.demandaTotal))) : 100;
  // Fala em pontos, não em casas: não há conversão real de ponto para casa.
  const frase = n > 0 ? `${n.toLocaleString("pt-BR")} ${n === 1 ? "ponto" : "pontos"} sem luz`
    : faltando > 0 ? `Religado em parte: faltam ${formatarPotencia(faltando)}` : "Toda a cidade com luz";
  // Sem demanda não há % a calcular: mostrar 99% seria inventar número.
  return { porcento: (n === 0 && faltando <= 0) || a.demandaTotal <= 0 ? 100 : Math.min(porcento, 99), frase };
}

export function formatarPotencia(kva: number): string {
  return kva < 1000
    ? `${Math.round(kva).toLocaleString("pt-BR")} kVA`
    : `${(kva / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MVA`;
}

/** "233,5 de 243,6 MVA": entregue e demanda num número só; a unidade aparece uma vez quando é a mesma. */
export function formatarEntregue(entregueKva: number, demandaKva: number): string {
  const a = formatarPotencia(entregueKva), b = formatarPotencia(demandaKva);
  const unidade = (t: string) => t.slice(t.lastIndexOf(" ") + 1);
  return unidade(a) === unidade(b) ? `${a.slice(0, a.lastIndexOf(" "))} de ${b}` : `${a} de ${b}`;
}

export function formatarTempo(ms: number): string {
  return `${Math.round(ms).toLocaleString("pt-BR")} ms`;
}
