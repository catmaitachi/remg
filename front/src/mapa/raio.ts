// Raio de perto (T19): porte do docs/design/prototipo/eletrico.js, suavizado para a rede densa de BH.
import type { Caminho, LonLat, Quadro } from "./camadas";
import { INDICE_DA_FAIXA, ONDA } from "./onda";

// ZOOM 14: no MapLibre (tiles de 512 px) é a escala do "zoom 15" da prévia, que usava 256 px.
export const RAIO = {
  ZOOM: 14, MAX: 500, PASSO_PX: 6, MAX_PONTOS: 60,
  FIOS: [1, 2, 3], AMP_PX: [2.5, 3.5, 5], FAISCA: [0, 0.04, 0.18],
} as const;

const frac = (x: number) => x - Math.floor(x);
/** Em [-1, 1]: metade ondulação suave (que corre com `desloc`), metade estalo (que troca com `fase`). */
export function ruido(k: number, fase: number, desloc: number): number {
  const x = k - desloc;
  const suave = 0.6 * Math.sin(x * 0.9 + fase * 0.7) + 0.4 * Math.sin(x * 2.3 - fase * 1.3);
  const estalo = frac(Math.sin(k * 12.9898 + fase * 78.233) * 43758.5453) * 2 - 1;
  return 0.5 * suave + 0.5 * estalo;
}

// Web Mercator do MapLibre: o mundo tem 512 · 2^zoom px.
const paraPx = ([lon, lat]: LonLat, W: number): [number, number] => {
  const r = (lat * Math.PI) / 180;
  return [((lon + 180) / 360) * W, ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * W];
};
const dePx = ([x, y]: [number, number], W: number): LonLat =>
  [(x / W) * 360 - 180, (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / W))) * 180) / Math.PI];

/** Fio tremendo de `a` a `b`: um ponto a cada 6 px (até 60 trechos), deslocado na perpendicular até `ampPx`, pontas presas. */
export function tremer(a: LonLat, b: LonLat, ampPx: number, zoom: number, fase: number, desloc: number): LonLat[] {
  const W = 512 * 2 ** zoom, pa = paraPx(a, W), pb = paraPx(b, W);
  const len = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
  if (len === 0) return [a, b];
  const nx = -(pb[1] - pa[1]) / len, ny = (pb[0] - pa[0]) / len;
  const n = Math.min(RAIO.MAX_PONTOS, Math.max(1, Math.ceil(len / RAIO.PASSO_PX)));
  const pts: LonLat[] = [a];
  for (let k = 1; k < n; k++) {
    const q = k / n, d = ampPx * Math.sin(Math.PI * q) * ruido(k, fase, desloc);
    pts.push(dePx([pa[0] + (pb[0] - pa[0]) * q + nx * d, pa[1] + (pb[1] - pa[1]) * q + ny * d], W));
  }
  pts.push(b);
  return pts;
}

const comprimentoPx = (c: Caminho, W: number) => {
  const [pa, pb] = [paraPx(c.path[0], W), paraPx(c.path[1], W)];
  return Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
};

/** Trechos com fluxo que ganham raio neste quadro: zoom ≥ 14, visíveis, ≥ 6 px, gargalo primeiro, no máximo 500. */
export function escolherRaio(comFluxo: Caminho[], quadro: Quadro): Caminho[] {
  if (quadro.zoom < RAIO.ZOOM) return [];
  const [oeste, sul, leste, norte] = quadro.limites, W = 512 * 2 ** quadro.zoom;
  const visivel = ({ path: [[x1, y1], [x2, y2]] }: Caminho) =>
    Math.max(x1, x2) >= oeste && Math.min(x1, x2) <= leste && Math.max(y1, y2) >= sul && Math.min(y1, y2) <= norte;
  return comFluxo
    .filter((c) => c.faixa && visivel(c) && comprimentoPx(c, W) >= RAIO.PASSO_PX)
    .sort((a, b) => INDICE_DA_FAIXA[b.faixa!] - INDICE_DA_FAIXA[a.faixa!])
    .slice(0, RAIO.MAX);
}

/** Fios (1/2/3 por faixa) correndo no sentido do fluxo, e faíscas de 3 riscos pela chance da faixa. */
export function montarRaio(sel: Caminho[], quadro: Quadro, aleatorio: () => number = Math.random): { fios: Caminho[]; faiscas: Caminho[] } {
  const fios: Caminho[] = [], faiscas: Caminho[] = [];
  const fase = Math.floor(quadro.tempo * 24), W = 512 * 2 ** quadro.zoom;
  for (const c of sel) {
    const i = INDICE_DA_FAIXA[c.faixa!];
    const [a, b] = c.sentido?.positivo === false ? [c.path[1], c.path[0]] : [c.path[0], c.path[1]];
    const desloc = (quadro.tempo * ONDA.VEL[i]) / 25;
    for (let f = 0; f < RAIO.FIOS[i]; f++) {
      fios.push({ id: `${c.id}#${f}`, faixa: c.faixa, path: tremer(a, b, RAIO.AMP_PX[i], quadro.zoom, fase + f * 7.3, desloc + f * 17) });
    }
    if (aleatorio() < RAIO.FAISCA[i]) {
      const q = aleatorio(), pa = paraPx(a, W), pb = paraPx(b, W);
      const p: [number, number] = [pa[0] + (pb[0] - pa[0]) * q, pa[1] + (pb[1] - pa[1]) * q];
      for (let r = 0; r < 3; r++) {
        const ang = aleatorio() * Math.PI * 2, l = 3 + aleatorio() * 5;
        faiscas.push({ id: `${c.id}!${r}`, faixa: c.faixa, path: [dePx(p, W), dePx([p[0] + Math.cos(ang) * l, p[1] + Math.sin(ang) * l], W)] });
      }
    }
  }
  return { fios, faiscas };
}
