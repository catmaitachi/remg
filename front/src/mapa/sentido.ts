import type { Analise, Rede } from "../api/tipos";
import { faixaDoUso } from "./cores";
import { ONDA } from "./onda";

/** Por trecho com fluxo: onde a energia entra nele, contado da origem, e o sentido. */
export interface Sentido {
  /** metros pela rede, da origem até a ponta de entrada */
  distInicio: number;
  comprimento: number;
  /** segundos até a onda chegar à ponta de entrada (soma de comprimento / VEL da faixa) */
  tempoInicio: number;
  /** true = a energia vai de `de` para `para` */
  positivo: boolean;
}

const RAIO_TERRA = 6371000, rad = Math.PI / 180;
function metros([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]): number {
  const h = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * RAIO_TERRA * Math.asin(Math.sqrt(h));
}
const INDICE = { normal: 0, alerta: 1, gargalo: 2 } as const;

/**
 * Segue o fluxo com sinal a partir das origens (pontos sem fluxo entrando), em ordem topológica (Kahn).
 * Só trecho e chave: linha_at não é animada e faria uma subestação "receber" energia da outra.
 * Ponto preso num ciclo fica com distância e tempo 0.
 */
export function sentidoDoFluxo(rede: Rede, analise: Analise): Map<string, Sentido> {
  const pos = new Map<string, [number, number]>();
  for (const [id, lat, lon] of rede.pontos) pos.set(id, [lat, lon]);
  for (const [id, , lat, lon] of rede.subestacoes) pos.set(id, [lat, lon]);
  const arestas = new Map(rede.arestas.filter((a) => a[3] !== "linha_at").map((a) => [a[0], a]));

  interface Seta { id: string; ini: string; fim: string; comprimento: number; vel: number; positivo: boolean }
  const saem = new Map<string, Seta[]>();
  const entram = new Map<string, number>();
  for (const [id, fluxo, uso] of analise.fluxo) {
    const a = arestas.get(id);
    if (!a) continue;
    const [, de, para] = a;
    const pa = pos.get(de), pb = pos.get(para);
    if (!pa || !pb) continue;
    const positivo = fluxo > 0;
    const [ini, fim] = positivo ? [de, para] : [para, de];
    const seta = { id, ini, fim, comprimento: metros(pa, pb), vel: ONDA.VEL[INDICE[faixaDoUso(uso)]], positivo };
    saem.set(ini, [...(saem.get(ini) ?? []), seta]);
    entram.set(fim, (entram.get(fim) ?? 0) + 1);
  }

  const dist = new Map<string, number>(), tempo = new Map<string, number>();
  const fila = [...saem.keys()].filter((p) => !entram.has(p));
  for (const p of fila) { dist.set(p, 0); tempo.set(p, 0); }
  const resultado = new Map<string, Sentido>();
  const marcar = (s: Seta) => resultado.set(s.id, {
    distInicio: dist.get(s.ini) ?? 0, comprimento: s.comprimento, tempoInicio: tempo.get(s.ini) ?? 0, positivo: s.positivo,
  });

  for (let i = 0; i < fila.length; i++) { // índice em vez de shift(): BH tem 35 mil pontos
    for (const s of saem.get(fila[i]) ?? []) {
      marcar(s);
      const chegada = dist.get(s.ini)! + s.comprimento;
      if (!dist.has(s.fim) || chegada < dist.get(s.fim)!) {
        dist.set(s.fim, chegada);
        tempo.set(s.fim, tempo.get(s.ini)! + s.comprimento / s.vel);
      }
      const resta = entram.get(s.fim)! - 1;
      entram.set(s.fim, resta);
      if (resta === 0) fila.push(s.fim);
    }
  }
  // o que sobrou está num ciclo: nunca teve todas as entradas resolvidas
  for (const setas of saem.values()) for (const s of setas) if (!resultado.has(s.id)) marcar(s);
  return resultado;
}
