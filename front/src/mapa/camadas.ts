import { IconLayer, PathLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import type { Analise, Rede, Subestacao } from "../api/tipos";
import { PALETA, faixaDoUso, rgb, type Faixa, type Tema } from "./cores";

export const CENTRO_BH = { latitude: -19.92, longitude: -43.94, zoom: 11.5 };

export function estiloDoMapa(escuro: boolean): string {
  return `https://tiles.openfreemap.org/styles/${escuro ? "dark" : "positron"}`;
}

export type Visiveis = { at: boolean; distribuicao: boolean; subestacoes: boolean; chaves: boolean };
export const VISIVEIS_INICIAL: Visiveis = { at: true, distribuicao: true, subestacoes: true, chaves: true };

type LonLat = [number, number];
interface Caminho { id: string; path: LonLat[]; faixa: Faixa | null }
interface Marco { id: string; posicao: LonLat }
export interface Dados {
  trechos: Caminho[]; gargalos: Caminho[]; alertas: Marco[];
  linhasAT: Caminho[]; chaves: Marco[]; subestacoes: Subestacao[];
}

const meio = ([a, b]: LonLat[]): LonLat => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

/** Monta os caminhos uma vez; trocar camada ou tema reaproveita estes arrays (53 mil trechos em BH). */
export function prepararDados(rede: Rede, analise: Analise | null): Dados {
  // Map por id montado uma vez: procurar ponta por ponta seria quadrático.
  const lonLat = new Map<string, LonLat>();
  for (const [id, lat, lon] of rede.pontos) lonLat.set(id, [lon, lat]);
  for (const [id, , lat, lon] of rede.subestacoes) lonLat.set(id, [lon, lat]);
  const uso = new Map(analise?.fluxo.map(([id, , u]) => [id, u]));

  const trechos: Caminho[] = [];
  const chaves: Marco[] = [];
  for (const [id, de, para, tipo] of rede.arestas) {
    const a = lonLat.get(de), b = lonLat.get(para);
    if (tipo === "linha_at" || !a || !b) continue;
    const u = uso.get(id);
    trechos.push({ id, path: [a, b], faixa: u === undefined ? null : faixaDoUso(u) });
    if (tipo === "chave") chaves.push({ id, posicao: meio([a, b]) });
  }
  const porId = new Map(trechos.map((t) => [t.id, t]));
  const gargalos = (analise?.gargalos ?? []).flatMap((id) => porId.get(id) ?? []); // id fora da rede: ignora

  return {
    trechos, gargalos, chaves, subestacoes: rede.subestacoes,
    alertas: gargalos.map((g) => ({ id: g.id, posicao: meio(g.path) })),
    linhasAT: Object.entries(rede.geometriaAT).map(([id, coords]) => ({
      id, path: coords.map(([lat, lon]) => [lon, lat] as LonLat), faixa: null,
    })),
  };
}

const iconeChave = (borda: string, fundo: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect x="3" y="3" width="18" height="18" fill="${fundo}" stroke="${borda}" stroke-width="3"/></svg>`,
  )}`;

export function montarCamadas(d: Dados, visiveis: Visiveis, tema: Tema) {
  const p = PALETA[tema];
  const cor = { normal: rgb(p.normal), alerta: rgb(p.alerta), gargalo: rgb(p.gargalo), semFluxo: rgb(p.semFluxo) };
  const fundo = rgb(p.fundo);
  const icone = { url: iconeChave(p.at, p.contorno), width: 24, height: 24, id: `chave-${tema}` };

  return [
    new PathLayer<Caminho>({
      id: "halo-gargalos", data: d.gargalos, visible: visiveis.distribuicao, getPath: (c) => c.path,
      getColor: fundo, getWidth: 8, widthUnits: "pixels", capRounded: true,
    }),
    new PathLayer<Caminho>({
      id: "trechos", data: d.trechos, visible: visiveis.distribuicao, getPath: (c) => c.path,
      getColor: (c) => cor[c.faixa ?? "semFluxo"], updateTriggers: { getColor: tema },
      getWidth: 2, widthUnits: "pixels", widthMinPixels: 1,
    }),
    new PathLayer<Caminho>({
      id: "linhas-at", data: d.linhasAT, visible: visiveis.at, getPath: (c) => c.path,
      getColor: rgb(p.at), getWidth: 6, widthUnits: "pixels", jointRounded: true, capRounded: true,
    }),
    new IconLayer<Marco>({
      id: "chaves", data: d.chaves, visible: visiveis.chaves, getPosition: (m) => m.posicao,
      getIcon: () => icone, updateTriggers: { getIcon: tema }, getSize: 12, sizeUnits: "pixels",
    }),
    new ScatterplotLayer<Subestacao>({
      id: "subestacoes", data: d.subestacoes, visible: visiveis.subestacoes, getPosition: (s) => [s[3], s[2]],
      getFillColor: rgb(p.subestacao), getLineColor: rgb(p.contorno), stroked: true,
      getRadius: 7, radiusUnits: "pixels", lineWidthUnits: "pixels", getLineWidth: 2,
    }),
    new ScatterplotLayer<Marco>({
      id: "gargalos-alerta", data: d.alertas, visible: visiveis.distribuicao, getPosition: (m) => m.posicao,
      getFillColor: cor.gargalo, getLineColor: fundo, stroked: true,
      getRadius: 9, radiusUnits: "pixels", lineWidthUnits: "pixels", getLineWidth: 2,
    }),
    new TextLayer<Marco>({
      id: "gargalos-alerta-texto", data: d.alertas, visible: visiveis.distribuicao, getPosition: (m) => m.posicao,
      getText: () => "!", getColor: [255, 255, 255], getSize: 13, sizeUnits: "pixels",
      fontWeight: 800, fontFamily: "Rawline, Raleway, sans-serif", characterSet: ["!"],
    }),
  ];
}
