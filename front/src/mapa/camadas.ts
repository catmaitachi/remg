import { IconLayer, PathLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import type { Analise, Rede, Subestacao, TipoAresta } from "../api/tipos";
import type { Alvo } from "../tela/falhas";
import { PALETA, faixaDoUso, rgb, type Faixa, type Tema } from "./cores";
import { sentidoDoFluxo, type Sentido } from "./sentido";
import { ExtensaoOnda, INDICE_DA_FAIXA, type OndaProps } from "./onda";
import { escolherRaio, montarRaio } from "./raio";
import { agruparGargalos } from "./alertas";

export const CENTRO_BH = { latitude: -19.92, longitude: -43.94, zoom: 11.5 };

export function estiloDoMapa(escuro: boolean): string {
  return `https://tiles.openfreemap.org/styles/${escuro ? "dark" : "positron"}`;
}

export type Visiveis = { at: boolean; distribuicao: boolean; subestacoes: boolean; chaves: boolean };
export const VISIVEIS_INICIAL: Visiveis = { at: true, distribuicao: true, subestacoes: true, chaves: true };

export type LonLat = [number, number];
export interface Caminho {
  id: string; path: LonLat[]; faixa: Faixa | null; sentido?: Sentido; tipo?: TipoAresta;
  /** as duas pontas sem energia */
  semLuz?: boolean;
}
export interface Marco { id: string; posicao: LonLat }
export interface Dados {
  trechos: Caminho[]; comFluxo: Caminho[]; destaques: Caminho[]; gargalos: Caminho[]; alertas: Marco[];
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
  const semEnergia = new Set(analise?.semEnergia.pontos); // Set: includes por ponta seria quadrático em BH

  const trechos: Caminho[] = [];
  const chaves: Marco[] = [];
  for (const [id, de, para, tipo] of rede.arestas) {
    const a = lonLat.get(de), b = lonLat.get(para);
    if (tipo === "linha_at" || !a || !b) continue;
    const u = uso.get(id);
    trechos.push({
      id, path: [a, b], faixa: u === undefined ? null : faixaDoUso(u), sentido: sentidos.get(id), tipo,
      semLuz: semEnergia.has(de) && semEnergia.has(para),
    });
    if (tipo === "chave") chaves.push({ id, posicao: meio([a, b]) });
  }
  const porId = new Map(trechos.map((t) => [t.id, t]));
  const gargalos = (analise?.gargalos ?? []).flatMap((id) => porId.get(id) ?? []); // id fora da rede: ignora

  return {
    trechos, gargalos, chaves, subestacoes: rede.subestacoes,
    comFluxo: trechos.filter((t) => t.faixa !== null),
    destaques: trechos.filter((t) => t.faixa === "alerta" || t.faixa === "gargalo"),
    alertas: agruparGargalos(gargalos),
    linhasAT: Object.entries(rede.geometriaAT).map(([id, coords]) => ({
      id, path: coords.map(([lat, lon]) => [lon, lat] as LonLat), faixa: null,
    })),
  };
}

/** O que caiu, desenhado já no clique (antes da resposta): tracejado e ✕. */
export interface Caidos { ids: Set<string>; tracos: Caminho[]; marcas: Marco[] }
const SEM_CAIDOS: Caidos = { ids: new Set(), tracos: [], marcas: [] };

/** 4 traços com vãos iguais: o trecho em 7 partes, traço nas pares. Sem @deck.gl/extensions. */
function tracejar(c: Caminho): Caminho[] {
  const [a, b] = c.path;
  const em = (k: number): LonLat => [a[0] + ((b[0] - a[0]) * k) / 7, a[1] + ((b[1] - a[1]) * k) / 7];
  return [0, 2, 4, 6].map((k) => ({ id: c.id, path: [em(k), em(k + 1)], faixa: null, tipo: c.tipo }));
}

/**
 * Tira os caídos do brilho, das ondas e dos gargalos na hora do clique. `trechos` fica o mesmo array (os
 * 53 mil caminhos não são refeitos): o caído some da linha cheia pelo alfa, em montarCamadas.
 */
export function aplicarFalhas(d: Dados, falhas: Alvo[]): { dados: Dados; caidos: Caidos } {
  if (!falhas.length) return { dados: d, caidos: SEM_CAIDOS };
  const ids = new Set(falhas.map((f) => f.id));
  const fora = (c: { id: string }) => !ids.has(c.id);
  const caidosTrechos = d.trechos.filter((t) => ids.has(t.id));
  const caidas = d.subestacoes.filter((s) => ids.has(s[0]));
  return {
    dados: {
      ...d, comFluxo: d.comFluxo.filter(fora), destaques: d.destaques.filter(fora),
      gargalos: d.gargalos.filter(fora), alertas: d.alertas.filter(fora),
    },
    caidos: {
      ids,
      tracos: caidosTrechos.flatMap(tracejar),
      marcas: [
        ...caidosTrechos.map((t) => ({ id: t.id, posicao: meio(t.path) })),
        ...caidas.map((s) => ({ id: s[0], posicao: [s[3], s[2]] as LonLat })),
      ],
    },
  };
}

// ✕ desenhado (não glifo de fonte), com contorno do fundo para se ler sobre a malha
const iconeCaido = (cor: string, fundo: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18" stroke="${fundo}" stroke-width="7"/><path d="M6 6l12 12M18 6 6 18" stroke="${cor}" stroke-width="3.5"/></svg>`,
  )}`;

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

/** Intensidade dos efeitos, escolhida no painel de camadas. A suave é a da prévia aprovada. */
export type Intensidade = "suave" | "media" | "forte";
export const INTENSIDADE: Record<Intensidade, { ganho: number; largura: number; alfaRaio: number }> = {
  suave: { ganho: 1, largura: 2, alfaRaio: 153 },
  media: { ganho: 1.8, largura: 3, alfaRaio: 204 },
  forte: { ganho: 2.6, largura: 4, alfaRaio: 255 },
};
export interface Opcoes {
  intensidade?: Intensidade;
  /** marcadores de gargalo já espalhados para o zoom atual; sem isso, todos os de `Dados.alertas` */
  alertas?: Marco[];
  caidos?: Caidos;
  /** modo Derrubar: trechos e subestações respondem ao mouse */
  derrubando?: boolean;
}

const EXTENSAO_ONDA = new ExtensaoOnda();
const SOMA_LUZ = {
  blend: true, blendColorSrcFactor: "one", blendColorDstFactor: "one", blendAlphaSrcFactor: "one", blendAlphaDstFactor: "one",
} as const;

/** Camadas que só existem com a animação ligada; entram logo acima dos trechos. */
function camadasAnimadas(d: Dados, visiveis: Visiveis, tema: Tema, quadro: Quadro, cor: Record<Faixa, [number, number, number]>, intensidade: Intensidade) {
  const forca = INTENSIDADE[intensidade];
  const { fios, faiscas } = montarRaio(escolherRaio(d.comFluxo, quadro), quadro);
  return [
    new PathLayer<Caminho, OndaProps<Caminho>>({
      id: "ondas", data: d.comFluxo, visible: visiveis.distribuicao, getPath: (c) => c.path,
      getColor: (c) => cor[c.faixa!], updateTriggers: { getColor: tema },
      getWidth: forca.largura, widthUnits: "pixels", widthMinPixels: 1,
      extensions: [EXTENSAO_ONDA], tempo: quadro.tempo, aditivo: tema === "escuro", ganho: forca.ganho,
      getOnda: (c) => [c.sentido!.tempoInicio, c.sentido!.comprimento, c.sentido!.positivo ? 1 : -1, INDICE_DA_FAIXA[c.faixa!]],
      parameters: tema === "escuro" ? SOMA_LUZ : {},
    }),
    new PathLayer<Caminho>({
      id: "raio", data: fios, visible: visiveis.distribuicao, getPath: (c) => c.path,
      getColor: (c) => [...cor[c.faixa!], forca.alfaRaio], updateTriggers: { getColor: intensidade }, getWidth: 1, widthUnits: "pixels", jointRounded: true,
    }),
    new PathLayer<Caminho>({
      id: "faiscas", data: faiscas, visible: visiveis.distribuicao, getPath: (c) => c.path,
      getColor: (c) => [...cor[c.faixa!], 230], getWidth: 1, widthUnits: "pixels", capRounded: true,
    }),
  ];
}

export function montarCamadas(d: Dados, visiveis: Visiveis, tema: Tema, quadro: Quadro | null = null, opcoes: Opcoes = {}) {
  const intensidade = opcoes.intensidade ?? "media";
  const caidos = opcoes.caidos ?? SEM_CAIDOS, clicavel = !!opcoes.derrubando;
  // os espalhados vêm de fora; com falhas, de aplicarFalhas (já sem os caídos)
  const alertas = opcoes.alertas ?? d.alertas;
  const p = PALETA[tema];
  const cor = { normal: rgb(p.normal), alerta: rgb(p.alerta), gargalo: rgb(p.gargalo), semFluxo: rgb(p.semFluxo) };
  const semLuz = rgb(p.semLuz), caido = rgb(p.caido);
  const destaque = { pickable: clicavel, autoHighlight: clicavel, highlightColor: [...rgb(p.primario), 200] as [number, number, number, number] };
  const fundo = rgb(p.fundo);
  const icone = { url: iconeChave(p.at, p.contorno), width: 24, height: 24, id: `chave-${tema}` };
  const iconeX = { url: iconeCaido(p.caido, p.fundo), width: 24, height: 24, id: `caido-${tema}` };

  const camadas = [
    new PathLayer<Caminho>({
      // com animação, a onda faz o brilho das normais: o brilho largo nos 35 mil trechos custava metade do FPS no arraste
      id: "brilho", data: quadro ? d.destaques : d.comFluxo, visible: visiveis.distribuicao, getPath: (c) => c.path,
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
      // com animação, a linha vira trilho apagado (com fluxo 30%, sem fluxo 50%) e a onda e o raio correm por cima, como na prévia
      getColor: (c): [number, number, number] | [number, number, number, number] => {
        if (caidos.ids.has(c.id)) return [0, 0, 0, 0]; // o tracejado da camada `caidos` ocupa o lugar
        if (c.semLuz) return semLuz;
        return quadro ? [...cor[c.faixa ?? "semFluxo"], c.faixa ? 77 : 128] : cor[c.faixa ?? "semFluxo"];
      },
      updateTriggers: { getColor: [tema, !!quadro, caidos.ids] },
      getWidth: 2, widthUnits: "pixels", widthMinPixels: 1, ...destaque,
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
      getFillColor: (s) => (caidos.ids.has(s[0]) ? [0, 0, 0, 0] : rgb(p.subestacao)),
      getLineColor: (s) => (caidos.ids.has(s[0]) ? caido : rgb(p.contorno)), stroked: true,
      updateTriggers: { getFillColor: [tema, caidos.ids], getLineColor: [tema, caidos.ids] },
      getRadius: 7, radiusUnits: "pixels", lineWidthUnits: "pixels", getLineWidth: 2, ...destaque,
    }),
    ...(caidos.ids.size ? [
      new PathLayer<Caminho>({
        id: "caidos", data: caidos.tracos, getPath: (c) => c.path, getColor: () => caido, updateTriggers: { getColor: tema },
        getWidth: 3, widthUnits: "pixels", capRounded: true, ...destaque,
      }),
      new IconLayer<Marco>({
        id: "caidos-x", data: caidos.marcas, getPosition: (m) => m.posicao,
        getIcon: () => iconeX, updateTriggers: { getIcon: tema }, getSize: 16, sizeUnits: "pixels",
      }),
    ] : []),
    new ScatterplotLayer<Marco>({
      id: "gargalos-alerta", data: alertas, visible: visiveis.distribuicao, getPosition: (m) => m.posicao,
      getFillColor: cor.gargalo, getLineColor: fundo, stroked: true,
      getRadius: 9, radiusUnits: "pixels", lineWidthUnits: "pixels", getLineWidth: 2,
    }),
    new TextLayer<Marco>({
      id: "gargalos-alerta-texto", data: alertas, visible: visiveis.distribuicao, getPosition: (m) => m.posicao,
      getText: () => "!", getColor: [255, 255, 255], getSize: 13, sizeUnits: "pixels",
      fontWeight: 800, fontFamily: "Rawline, Raleway, sans-serif", characterSet: ["!"],
    }),
  ];
  if (quadro) camadas.splice(camadas.findIndex((c) => c.id === "trechos") + 1, 0, ...camadasAnimadas(d, visiveis, tema, quadro, cor, intensidade));
  return camadas;
}
