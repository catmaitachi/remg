import type { Analise } from "../src/api/tipos";

export interface PedidoParcial {
  falhas?: { arestas?: string[]; subestacoes?: string[] };
  chavesFechadas?: string[];
}

/** Aceita a rede do contrato (ou uma montada à mão nos testes). */
export function gerarAnalise(rede: unknown, pedido?: PedidoParcial, agora?: () => number): Analise;
