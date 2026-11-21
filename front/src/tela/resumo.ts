import type { Analise } from "../api/tipos";

/** % com luz pela demanda, arredondado para baixo: 100% só quando ninguém está sem luz. */
export function resumoDaCidade(a: Analise): { porcento: number; frase: string } {
  const n = a.semEnergia.pontos.length;
  const porcento = a.demandaTotal > 0 ? Math.floor(100 * (1 - a.semEnergia.demanda / a.demandaTotal)) : 100;
  // Fala em pontos, não em casas: não há conversão real de ponto para casa.
  const frase = n === 0 ? "Toda a cidade com luz" : `${n.toLocaleString("pt-BR")} ${n === 1 ? "ponto" : "pontos"} sem luz`;
  return { porcento: n === 0 ? 100 : Math.min(porcento, 99), frase };
}

export function formatarPotencia(kva: number): string {
  return kva < 1000
    ? `${Math.round(kva).toLocaleString("pt-BR")} kVA`
    : `${(kva / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MVA`;
}

export function formatarTempo(ms: number): string {
  return `${Math.round(ms).toLocaleString("pt-BR")} ms`;
}
