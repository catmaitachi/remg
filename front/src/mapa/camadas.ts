import { IconLayer, PathLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import type { Analise, Rede, Subestacao } from "../api/tipos";
import { PALETA, faixaDoUso, rgb, type Faixa, type Tema } from "./cores";
import { sentidoDoFluxo, type Sentido } from "./sentido";
import { ExtensaoOnda, INDICE_DA_FAIXA, type OndaProps } from "./onda";

export const CENTRO_BH = { latitude: -19.92, longitude: -43.94, zoom: 11.5 };

export function estiloDoMapa(escuro: boolean): string {
  return `https://tiles.openfreemap.org/styles/${escuro ? "dark" : "positron"}`;
}

export type Visiveis = { at: boolean; distribuicao: boolean; subestacoes: boolean; chaves: boolean };
export const VISIVEIS_INICIAL: Visiveis = { at: true, distribuicao: true, subestacoes: true, chaves: true };

export type LonLat = [number, number];
export interface Caminho { id: string; path: LonLat[]; faixa: Faixa | null; sentido?: Sentido }
interface Marco { id: string; posicao: LonLat }
export interface Dados {
  trechos: Caminho[]; comFluxo: Caminho[]; gargalos: Caminho[]; alertas: Marco[];
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
  const sentidos = analise ? sentidoDoFluxo(rede, analise) : new Map<string, Sentido>();

  const trechos: Caminho[] = [];
  const chaves: Marco[] = [];
  for (const [id, de, para, tipo] of rede.arestas) {
    const a = lonLat.get(de), b = lonLat.get(para);
    if (tipo === "linha_at" || !a || !b) continue;
    const u = uso.get(id);
    trechos.push({ id, path: [a, b], faixa: u === undefined ? null : faixaDoUso(u), sentido: sentidos.get(id) });
    if (tipo === "chave") chaves.push({ id, posicao: meio([a, b]) });
  }
  const porId = new Map(trechos.map((t) => [t.id, t]));
  const gargalos = (analise?.gargalos ?? []).flatMap((id) => porId.get(id) ?? []); // id fora da rede: ignora

  return {
    trechos, gargalos, chaves, subestacoes: rede.subestacoes,
    comFluxo: trechos.filter((t) => t.faixa !== null),
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

// Brilho parado do efeito elétrico (T18): versão suave do protótipo, que ali ia de 26% a 65%. A rede de BH é
// densa, então o normal quase não brilha. Fios e faíscas em movimento ficam para a T19.
const BRILHO: Record<Faixa, { largura: number; alfa: Record<Tema, number> }> = {
  normal: { largura: 5, alfa: { claro: 0.08, escuro: 0.14 } },
  alerta: { largura: 8, alfa: { claro: 0.16, escuro: 0.26 } },
  gargalo: { largura: 12, alfa: { claro: 0.24, escuro: 0.36 } },
};

/** O que muda a cada quadro da animação. `limites` = [oeste, sul, leste, norte]. */
export interface Quadro { tempo: number; zoom: number; limites: [number, number, number, number] }

const EXTENSAO_ONDA = new ExtensaoOnda();
const SOMA_LUZ = {
  blend: true, blendColorSrcFactor: "one", blendColorDstFactor: "one", blendAlphaSrcFactor: "one", blendAlphaDstFactor: "one",
} as const;

/** Camadas que só existem com a animação ligada; entram logo acima dos trechos. */
function camadasAnimadas(d: Dados, visiveis: Visiveis, tema: Tema, quadro: Quadro, cor: Record<Faixa, [number, number, number]>) {
  return [
    new PathLayer<Caminho, OndaProps<Caminho>>({
      id: "ondas", data: d.comFluxo, visible: visiveis.distribuicao, getPath: (c) => c.path,
      getColor: (c) => cor[c.faixa!], updateTriggers: { getColor: tema },
      getWidth: 2, widthUnits: "pixels", widthMinPixels: 1,
      extensions: [EXTENSAO_ONDA], tempo: quadro.tempo, aditivo: tema === "escuro",
      getOnda: (c) => [c.sentido!.tempoInicio, c.sentido!.comprimento, c.sentido!.positivo ? 1 : -1, INDICE_DA_FAIXA[c.faixa!]],
      parameters: tema === "escuro" ? SOMA_LUZ : {},
    }),
  ];
}

export function montarCamadas(d: Dados, visiveis: Visiveis, tema: Tema, quadro: Quadro | null = null) {
  const p = PALETA[tema];
  const cor = { normal: rgb(p.normal), alerta: rgb(p.alerta), gargalo: rgb(p.gargalo), semFluxo: rgb(p.semFluxo) };
  const fundo = rgb(p.fundo);
  const icone = { url: iconeChave(p.at, p.contorno), width: 24, height: 24, id: `chave-${tema}` };

  const camadas = [
    new PathLayer<Caminho>({
      id: "brilho", data: d.comFluxo, visible: visiveis.distribuicao, getPath: (c) => c.path,
      getColor: (c) => [...cor[c.faixa!], Math.round(BRILHO[c.faixa!].alfa[tema] * 255)],
      getWidth: (c) => BRILHO[c.faixa!].largura, updateTriggers: { getColor: tema },
      widthUnits: "pixels", capRounded: true, jointRounded: true,
    }),
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
  if (quadro) camadas.splice(camadas.findIndex((c) => c.id === "trechos") + 1, 0, ...camadasAnimadas(d, visiveis, tema, quadro, cor));
  return camadas;
}
