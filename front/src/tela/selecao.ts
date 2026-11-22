import type { Analise, Rede, TipoAresta } from "../api/tipos";
import { faixaDoUso, type Faixa } from "../mapa/cores";
import type { Alvo } from "./falhas";
import { formatarPotencia } from "./resumo";

/** O que foi clicado no Observar ou no Religar. Ao contrário do Alvo, aceita chave e linha AT. */
export type Selecao = { tipo: "aresta" | "subestacao"; id: string };

const CAMADAS_DE_ARESTA = new Set(["trechos", "caidos", "linhas-at", "rota"]);

export function selecaoDoClique(camada: string | undefined, objeto: unknown): Selecao | null {
  if (camada && CAMADAS_DE_ARESTA.has(camada) && objeto && typeof objeto === "object" && !Array.isArray(objeto)) {
    const { id } = objeto as { id?: unknown };
    return typeof id === "string" ? { tipo: "aresta", id } : null;
  }
  if (camada === "subestacoes" && Array.isArray(objeto) && typeof objeto[0] === "string") return { tipo: "subestacao", id: objeto[0] };
  return null;
}

const NOME_DA_FAIXA: Record<Faixa, string> = { normal: "normal", alerta: "perto do limite", gargalo: "gargalo" };
const TITULO = { trecho: "Trecho", chave: "Chave", linha_at: "Linha AT" } as const;
const numero = (id: string) => id.replace(/^[a-z]+:/, "");

/** O que o cartão mostra como ícone ao lado do título. */
export type TipoItem = "subestacao" | TipoAresta;
/** Ponte: aresta cuja queda isola parte da rede. Articulação: vértice cuja queda parte a rede (Tarjan, GET /criticos). */
export interface CriticosDaRede { pontes: Set<string>; articulacoes: Set<string> }

export function detalheDe(
  sel: Selecao, rede: Rede, analise: Analise | null, falhas: Alvo[], chavesFechadas: string[], criticos: CriticosDaRede | null = null,
): { tipo: TipoItem; titulo: string; linhas: [string, string][] } {
  const caiu = falhas.some((f) => f.id === sel.id);
  // crítico é mais uma linha do cartão, só quando o item é ponte ou articulação
  const critico: [string, string][] = sel.tipo === "subestacao"
    ? (criticos?.articulacoes.has(sel.id) ? [["Crítico", "articulação"]] : [])
    : (criticos?.pontes.has(sel.id) ? [["Crítico", "ponte"]] : []);
  if (sel.tipo === "subestacao") {
    const s = rede.subestacoes.find((x) => x[0] === sel.id);
    return { tipo: "subestacao", titulo: s?.[1] ?? sel.id, linhas: [["Capacidade", s ? formatarPotencia(s[4]) : "—"], ["Estado", caiu ? "caída" : "ligada"], ...critico] };
  }
  const a = rede.arestas.find((x) => x[0] === sel.id);
  if (!a) return { tipo: "trecho", titulo: sel.id, linhas: [] };
  const [id, de, para, tipo, capacidade] = a;
  const f = analise?.fluxo.find((x) => x[0] === id);
  const semLuz = new Set(analise?.semEnergia.pontos);
  const estado = caiu ? "caído"
    : tipo === "chave" ? (chavesFechadas.includes(id) ? "fechada pelo religamento" : "aberta")
    : semLuz.has(de) && semLuz.has(para) ? "sem luz" : "ligado";
  return {
    tipo, titulo: `${TITULO[tipo]} ${numero(id)}`,
    linhas: [
      ["Capacidade", formatarPotencia(capacidade)],
      ["Fluxo", f ? formatarPotencia(Math.abs(f[1])) : "sem fluxo"],
      ["Uso", f ? `${Math.round(f[2] * 100)}% · ${NOME_DA_FAIXA[faixaDoUso(f[2])]}` : "—"],
      ["Estado", estado],
      ...critico,
    ],
  };
}

/** Chave não se derruba no cartão: quem mexe em chave é o religamento. */
export function podeDerrubar(sel: Selecao, rede: Rede): boolean {
  return sel.tipo === "subestacao" || rede.arestas.find((a) => a[0] === sel.id)?.[3] !== "chave";
}

/** Para onde o mapa voa ao clicar numa falha: a subestação ou o meio da aresta, em [lon, lat]. */
export function posicaoDoAlvo(alvo: Alvo, rede: Rede): [number, number] | null {
  const lugar = (id: string): [number, number] | undefined => {
    const s = rede.subestacoes.find((x) => x[0] === id);
    if (s) return [s[3], s[2]];
    const p = rede.pontos.find((x) => x[0] === id);
    return p && [p[2], p[1]];
  };
  if (alvo.tipo === "subestacao") return lugar(alvo.id) ?? null;
  const a = rede.arestas.find((x) => x[0] === alvo.id);
  const de = a && lugar(a[1]), para = a && lugar(a[2]);
  return de && para ? [(de[0] + para[0]) / 2, (de[1] + para[1]) / 2] : null;
}
