import type { Analise, Rede } from "../api/tipos";
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

export function detalheDe(
  sel: Selecao, rede: Rede, analise: Analise | null, falhas: Alvo[], chavesFechadas: string[],
): { titulo: string; linhas: [string, string][] } {
  const caiu = falhas.some((f) => f.id === sel.id);
  if (sel.tipo === "subestacao") {
    const s = rede.subestacoes.find((x) => x[0] === sel.id);
    return { titulo: s?.[1] ?? sel.id, linhas: [["Capacidade", s ? formatarPotencia(s[4]) : "—"], ["Estado", caiu ? "caída" : "ligada"]] };
  }
  const a = rede.arestas.find((x) => x[0] === sel.id);
  if (!a) return { titulo: sel.id, linhas: [] };
  const [id, de, para, tipo, capacidade] = a;
  const f = analise?.fluxo.find((x) => x[0] === id);
  const semLuz = new Set(analise?.semEnergia.pontos);
  const estado = caiu ? "caído"
    : tipo === "chave" ? (chavesFechadas.includes(id) ? "fechada pelo religamento" : "aberta")
    : semLuz.has(de) && semLuz.has(para) ? "sem luz" : "ligado";
  return {
    titulo: `${TITULO[tipo]} ${numero(id)}`,
    linhas: [
      ["Capacidade", formatarPotencia(capacidade)],
      ["Fluxo", f ? formatarPotencia(Math.abs(f[1])) : "sem fluxo"],
      ["Uso", f ? `${Math.round(f[2] * 100)}% · ${NOME_DA_FAIXA[faixaDoUso(f[2])]}` : "—"],
      ["Estado", estado],
    ],
  };
}
