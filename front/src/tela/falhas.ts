import type { Analise, Pedido, Rede, RotaAlternativa } from "../api/tipos";

/** O que se derruba no modo Derrubar. Na T20, só trecho e subestação (o mock de BH não tem chave nem AT ligada). */
export type Alvo = { tipo: "aresta" | "subestacao"; id: string };

export function alternarFalha(falhas: Alvo[], alvo: Alvo): Alvo[] {
  return falhas.some((f) => f.id === alvo.id) ? falhas.filter((f) => f.id !== alvo.id) : [...falhas, alvo];
}

export function pedidoDe(falhas: Alvo[], chavesFechadas: string[] = []): Pedido {
  const de = (tipo: Alvo["tipo"]) => falhas.filter((f) => f.tipo === tipo).map((f) => f.id);
  return { falhas: { arestas: de("aresta"), subestacoes: de("subestacao") }, chavesFechadas };
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
  /** chaves fechadas pelo religamento; valem até a lista de falhas mudar */
  chavesFechadas: string[];
  rota: EstadoRota | null;
  /** kVA que o religamento vigente não devolveu (religamento parcial); a barra não pode dizer 100% com isso */
  faltando: number;
}

export type FaseRota = "buscando" | "religando" | "pronta" | "erro";
export interface EstadoRota {
  fase: FaseRota;
  resultado: RotaAlternativa | null;
  /** kVA sem luz (ou faltando) quando a busca começou */
  semLuzAntes: number;
  /** chaves de antes da busca: voltam se a análise com as novas falhar */
  chavesAntes: string[];
}

export const ESTADO_INICIAL: EstadoFalhas = {
  falhas: [], inicial: null, atual: null, versao: 0, calculando: false, erro: null, chavesFechadas: [], rota: null, faltando: 0,
};

export type Acao =
  | { tipo: "inicial"; analise: Analise }
  | { tipo: "alternar"; alvo: Alvo }
  | { tipo: "restaurarTudo" }
  | { tipo: "resposta"; versao: number; resultado: { ok: Analise } | { erro: string } }
  | { tipo: "acharRota" }
  | { tipo: "rota"; versao: number; resultado: { ok: RotaAlternativa } | { erro: string } };

function comLista(e: EstadoFalhas, falhas: Alvo[]): EstadoFalhas {
  const versao = e.versao + 1;
  // lista nova = religamento novo: as chaves reabrem e a rota velha não vale mais
  const limpo = { ...e, falhas, versao, chavesFechadas: [], rota: null, faltando: 0 };
  // sem falhas não há o que pedir: volta para a análise inicial guardada
  return falhas.length ? { ...limpo, calculando: true } : { ...limpo, atual: e.inicial, calculando: false, erro: null };
}

export function reduzirFalhas(e: EstadoFalhas, a: Acao): EstadoFalhas {
  switch (a.tipo) {
    case "inicial":
      return { ...e, inicial: a.analise, atual: e.falhas.length ? e.atual : a.analise };
    case "alternar":
      return comLista(e, alternarFalha(e.falhas, a.alvo));
    case "restaurarTudo":
      return comLista(e, []);
    case "resposta": {
      if (a.versao !== e.versao || !e.falhas.length) return e;
      const rota = e.rota?.fase === "religando" ? e.rota : null;
      if ("erro" in a.resultado) {
        const voltar = rota ? { chavesFechadas: rota.chavesAntes, rota: { ...rota, fase: "erro" as const } } : {};
        return { ...e, ...voltar, erro: a.resultado.erro, calculando: false };
      }
      const pronto = rota && { rota: { ...rota, fase: "pronta" as const }, faltando: faltandoDe(rota) };
      return { ...e, ...pronto, atual: a.resultado.ok, erro: null, calculando: false };
    }
    case "acharRota":
      if (!e.falhas.length || e.calculando) return e;
      return {
        ...e, versao: e.versao + 1, calculando: true, erro: null,
        rota: { fase: "buscando", resultado: null, semLuzAntes: (e.atual?.semEnergia.demanda ?? 0) + e.faltando, chavesAntes: e.chavesFechadas },
      };
    case "rota": {
      if (a.versao !== e.versao || e.rota?.fase !== "buscando") return e;
      if ("erro" in a.resultado) return { ...e, rota: { ...e.rota, fase: "erro" }, erro: a.resultado.erro, calculando: false };
      const resultado = a.resultado.ok;
      if (!resultado.chavesParaFechar.length) return { ...e, rota: { ...e.rota, fase: "pronta", resultado }, calculando: false };
      const chavesFechadas = [...new Set([...e.chavesFechadas, ...resultado.chavesParaFechar])];
      return { ...e, chavesFechadas, versao: e.versao + 1, rota: { ...e.rota, fase: "religando", resultado } };
    }
  }
}

function faltandoDe(rota: EstadoRota): number {
  return rota.resultado?.parcial ? Math.max(0, rota.semLuzAntes - rota.resultado.religado.demanda) : 0;
}

/** O pedido que o App faz nesta versão: a rota (fase buscando) ou a análise da lista com as chaves. */
export function pedidoPendente(e: EstadoFalhas): { tipo: "rota" | "analise"; pedido: Pedido } | null {
  if (!e.calculando || !e.falhas.length) return null;
  return { tipo: e.rota?.fase === "buscando" ? "rota" : "analise", pedido: pedidoDe(e.falhas, e.chavesFechadas) };
}
