// Contrato da API (docs/spec/06-api.md, congelado). Listas posicionais para o JSON ficar menor.

export type TipoAresta = "trecho" | "chave" | "linha_at";

/** id, nome, lat, lon, capacidade kVA */
export type Subestacao = [id: string, nome: string, lat: number, lon: number, capacidade: number];
/** id, lat, lon, demanda kVA */
export type Ponto = [id: string, lat: number, lon: number, demanda: number];
/** id, de, para, tipo, capacidade kVA */
export type Aresta = [id: string, de: string, para: string, tipo: TipoAresta, capacidade: number];

export interface Rede {
  area: string;
  subestacoes: Subestacao[];
  pontos: Ponto[];
  arestas: Aresta[];
  /** id da linha AT → [[lat, lon], …] */
  geometriaAT: Record<string, [number, number][]>;
}

/** Pedido do POST /analise e /rota-alternativa; vazio ({}) = rede sem falhas. */
export interface Pedido {
  falhas?: { arestas: string[]; subestacoes: string[] };
  chavesFechadas?: string[];
}

export interface Analise {
  fluxoTotal: number;
  demandaTotal: number;
  /** id, fluxo kVA com sinal (+ = de → para da aresta), uso de 0 a 1 = |fluxo| / capacidade (só fluxo ≠ 0) */
  fluxo: [id: string, fluxo: number, uso: number][];
  gargalos: string[];
  semEnergia: { pontos: string[]; demanda: number };
  tempoMs: number;
}

export interface RotaAlternativa {
  chavesParaFechar: string[];
  caminho: string[];
  religado: { pontos: number; demanda: number };
  parcial: boolean;
  tempoMs: number;
}

export interface Criticos {
  pontes: string[];
  articulacoes: string[];
  tempoMs: number;
}

export interface Saude {
  ok: boolean;
  vertices?: number;
  arestas?: number;
}
