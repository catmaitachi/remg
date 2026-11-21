import type { Caminho, LonLat, Marco } from "./camadas";

const chave = ([lon, lat]: LonLat) => `${lon},${lat}`;
const meio = ([a, b]: LonLat[]): LonLat => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

/** Gargalos que se encostam (pontas em comum) viram um marcador, no trecho mais perto do centro do grupo. */
export function agruparGargalos(gargalos: Caminho[]): Marco[] {
  const pai = gargalos.map((_, i) => i);
  const raiz = (i: number): number => (pai[i] === i ? i : (pai[i] = raiz(pai[i])));
  const dono = new Map<string, number>();
  gargalos.forEach((g, i) => {
    for (const p of g.path) {
      const k = chave(p), j = dono.get(k);
      if (j === undefined) dono.set(k, i);
      else pai[raiz(i)] = raiz(j);
    }
  });
  const grupos = new Map<number, Caminho[]>();
  gargalos.forEach((g, i) => grupos.set(raiz(i), [...(grupos.get(raiz(i)) ?? []), g]));
  return [...grupos.values()].map((grupo) => {
    const meios = grupo.map((g) => meio(g.path));
    const cx = meios.reduce((s, m) => s + m[0], 0) / meios.length, cy = meios.reduce((s, m) => s + m[1], 0) / meios.length;
    let melhor = 0;
    meios.forEach((m, i) => { if (Math.hypot(m[0] - cx, m[1] - cy) < Math.hypot(meios[melhor][0] - cx, meios[melhor][1] - cy)) melhor = i; });
    return { id: grupo[melhor].id, posicao: meios[melhor] };
  });
}

/** Tira os marcadores que, no zoom dado, cairiam a menos de `minPx` de um já mantido (Web Mercator, 512 · 2^zoom px). */
export function espalharAlertas(alertas: Marco[], zoom: number, minPx = 28): Marco[] {
  const W = 512 * 2 ** zoom;
  const px = ([lon, lat]: LonLat) => {
    const r = (lat * Math.PI) / 180;
    return [((lon + 180) / 360) * W, ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * W];
  };
  const mantidos: { m: Marco; p: number[] }[] = [];
  for (const m of alertas) {
    const p = px(m.posicao);
    if (mantidos.every((k) => Math.hypot(k.p[0] - p[0], k.p[1] - p[1]) >= minPx)) mantidos.push({ m, p });
  }
  return mantidos.length === alertas.length ? alertas : mantidos.map((k) => k.m);
}
