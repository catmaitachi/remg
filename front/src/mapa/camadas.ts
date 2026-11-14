import { PathLayer, ScatterplotLayer } from "@deck.gl/layers";
import type { Rede, Subestacao } from "../api/tipos";

export const CENTRO_BH = { latitude: -19.92, longitude: -43.94, zoom: 11.5 };

export function estiloDoMapa(escuro: boolean): string {
  return `https://tiles.openfreemap.org/styles/${escuro ? "dark" : "positron"}`;
}

type Cor = [number, number, number];
const cor = (hex: string): Cor => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Cor;

// Cores neutras de docs/design/tokens.md (T02). Cor de uso, clique e camadas ligáveis são da T18.
const CORES = {
  claro: { trecho: cor("#7f7f7f"), at: cor("#34466b"), subestacao: cor("#c97700"), contorno: cor("#ffffff") },
  escuro: { trecho: cor("#9ba7b5"), at: cor("#7f9bd1"), subestacao: cor("#ffd27a"), contorno: cor("#0c0c0c") },
};

interface Caminho { id: string; path: [number, number][] }

export function montarCamadas(rede: Rede, escuro: boolean) {
  const c = escuro ? CORES.escuro : CORES.claro;

  // Map por id montado uma vez: com ~53 mil arestas, procurar ponta por ponta seria quadrático.
  const lonLat = new Map<string, [number, number]>();
  for (const [id, lat, lon] of rede.pontos) lonLat.set(id, [lon, lat]);
  for (const [id, , lat, lon] of rede.subestacoes) lonLat.set(id, [lon, lat]);

  const trechos: Caminho[] = [];
  for (const [id, de, para, tipo] of rede.arestas) {
    const a = lonLat.get(de), b = lonLat.get(para);
    if (tipo !== "linha_at" && a && b) trechos.push({ id, path: [a, b] });
  }
  const linhasAT: Caminho[] = Object.entries(rede.geometriaAT).map(([id, coords]) => ({
    id, path: coords.map(([lat, lon]) => [lon, lat]),
  }));

  return [
    new PathLayer<Caminho>({
      id: "trechos", data: trechos, getPath: (d) => d.path,
      getColor: c.trecho, getWidth: 2, widthUnits: "pixels", widthMinPixels: 1,
    }),
    new PathLayer<Caminho>({
      id: "linhas-at", data: linhasAT, getPath: (d) => d.path,
      getColor: c.at, getWidth: 6, widthUnits: "pixels", jointRounded: true, capRounded: true,
    }),
    new ScatterplotLayer<Subestacao>({
      id: "subestacoes", data: rede.subestacoes, getPosition: (s) => [s[3], s[2]],
      getFillColor: c.subestacao, getLineColor: c.contorno, stroked: true,
      getRadius: 7, radiusUnits: "pixels", lineWidthUnits: "pixels", getLineWidth: 2,
    }),
  ];
}
