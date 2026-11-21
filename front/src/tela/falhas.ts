import type { Analise, Pedido, Rede } from "../api/tipos";

/** O que se derruba no modo Derrubar. Na T20, só trecho e subestação (o mock de BH não tem chave nem AT ligada). */
export type Alvo = { tipo: "aresta" | "subestacao"; id: string };

export function alternarFalha(falhas: Alvo[], alvo: Alvo): Alvo[] {
  return falhas.some((f) => f.id === alvo.id) ? falhas.filter((f) => f.id !== alvo.id) : [...falhas, alvo];
}

export function pedidoDe(falhas: Alvo[]): Pedido {
  const de = (tipo: Alvo["tipo"]) => falhas.filter((f) => f.tipo === tipo).map((f) => f.id);
  return { falhas: { arestas: de("aresta"), subestacoes: de("subestacao") }, chavesFechadas: [] };
}

export function rotuloDoAlvo(alvo: Alvo, rede: Rede): string {
  if (alvo.tipo === "subestacao") return rede.subestacoes.find((s) => s[0] === alvo.id)?.[1] ?? alvo.id;
  return `Trecho ${alvo.id.replace(/^t:/, "")}`;
}

/** Objeto que o deck.gl entregou no clique → alvo. A camada `trechos` também desenha chaves: elas não caem. */
export function alvoDoClique(camada: string | undefined, objeto: unknown): Alvo | null {
  if ((camada === "trechos" || camada === "caidos") && objeto && typeof objeto === "object") {
    const { id, tipo } = objeto as { id?: unknown; tipo?: unknown };
    return tipo === "trecho" && typeof id === "string" ? { tipo: "aresta", id } : null;
  }
  if (camada === "subestacoes" && Array.isArray(objeto) && typeof objeto[0] === "string") return { tipo: "subestacao", id: objeto[0] };
  return null;
}

export interface EstadoFalhas {
  falhas: Alvo[];
  inicial: Analise | null;
  /** a última análise boa: com falhas, a da resposta mais recente aceita */
  atual: Analise | null;
  /** sobe a cada mudança na lista; só a resposta da versão atual vale */
  versao: number;
  calculando: boolean;
  erro: string | null;
}

export const ESTADO_INICIAL: EstadoFalhas = { falhas: [], inicial: null, atual: null, versao: 0, calculando: false, erro: null };

export type Acao =
  | { tipo: "inicial"; analise: Analise }
  | { tipo: "alternar"; alvo: Alvo }
  | { tipo: "restaurarTudo" }
  | { tipo: "resposta"; versao: number; resultado: { ok: Analise } | { erro: string } };

function comLista(e: EstadoFalhas, falhas: Alvo[]): EstadoFalhas {
  const versao = e.versao + 1;
  // sem falhas não há o que pedir: volta para a análise inicial guardada
  return falhas.length ? { ...e, falhas, versao, calculando: true } : { ...e, falhas, versao, atual: e.inicial, calculando: false, erro: null };
}

export function reduzirFalhas(e: EstadoFalhas, a: Acao): EstadoFalhas {
  switch (a.tipo) {
    case "inicial":
      return { ...e, inicial: a.analise, atual: e.falhas.length ? e.atual : a.analise };
    case "alternar":
      return comLista(e, alternarFalha(e.falhas, a.alvo));
    case "restaurarTudo":
      return comLista(e, []);
    case "resposta":
      if (a.versao !== e.versao || !e.falhas.length) return e;
      return "ok" in a.resultado
        ? { ...e, atual: a.resultado.ok, erro: null, calculando: false }
        : { ...e, erro: a.resultado.erro, calculando: false };
  }
}
