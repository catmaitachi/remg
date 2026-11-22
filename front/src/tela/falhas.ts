import type { Analise, Pedido, Rede, RotaAlternativa } from "../api/tipos";

/** O que se derruba (pelo cartão do selecionado). Na T20, só trecho e subestação (o mock de BH não tem chave nem AT ligada). */
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
  // lista nova = religamento novo: as chaves reabrem e a rota velha não vale mais. O faltante fica até a análise nova
  // chegar: a que está na tela ainda é a do religamento parcial, e sem ele a barra diria 100%.
  const limpo = { ...e, falhas, versao, chavesFechadas: [], rota: null, faltando: falhas.length ? e.faltando : 0 };
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
      const faltando = rota ? faltandoDe(rota) : 0; // análise sem religamento: não falta nada além do que ela mesma diz
      return { ...e, ...(rota && { rota: { ...rota, fase: "pronta" as const } }), faltando, atual: a.resultado.ok, erro: null, calculando: false };
    }
    case "acharRota":
      if (!e.falhas.length || e.calculando || analiseFalhou(e)) return e;
      return {
        ...e, versao: e.versao + 1, calculando: true, erro: null,
        rota: { fase: "buscando", resultado: null, semLuzAntes: Math.max(e.atual?.semEnergia.demanda ?? 0, e.faltando), // o faltante já inclui quem segue sem caminho
        chavesAntes: e.chavesFechadas },
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

/** A análise da lista atual falhou: `atual` ainda é a da lista anterior. Erro com rota é do religamento, e aí a base vale. */
export function analiseFalhou(e: EstadoFalhas): boolean {
  return e.erro !== null && e.rota === null;
}

function faltandoDe(rota: EstadoRota): number {
  return rota.resultado?.parcial ? Math.max(0, rota.semLuzAntes - rota.resultado.religado.demanda) : 0;
}

/** O pedido que o App faz nesta versão: a rota (fase buscando) ou a análise da lista com as chaves. */
export function pedidoPendente(e: EstadoFalhas): { tipo: "rota" | "analise"; pedido: Pedido } | null {
  if (!e.calculando || !e.falhas.length) return null;
  return { tipo: e.rota?.fase === "buscando" ? "rota" : "analise", pedido: pedidoDe(e.falhas, e.chavesFechadas) };
}

interface SituacaoDoReligar {
  usandoMock: boolean; temFalhas: boolean; temSemLuz: boolean; calculando: boolean; temResultado: boolean; analiseFalhou: boolean;
}

/** Por que "Achar rota" está desligado; `null` quando dá para pedir. `""` desliga sem texto (o resultado já explica). */
export function dicaDoReligar({ usandoMock, temFalhas, temSemLuz, calculando, temResultado, analiseFalhou }: SituacaoDoReligar): string | null {
  if (usandoMock) return "O Religar precisa do servidor.";
  if (!temFalhas) return "Derrube um item pelo cartão dele primeiro.";
  if (analiseFalhou && !calculando) return "A análise desta lista falhou: mude a lista para calcular de novo.";
  // sem ponto sem luz a rota não tem o que religar: o pedido levaria ~8 s em BH para responder "nada"
  if (!temSemLuz && !calculando) return temResultado ? "" : "Nenhum ponto sem luz para religar.";
  return null;
}
