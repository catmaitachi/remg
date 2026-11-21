import urlBh from "../mocks/rede.bh.json?url"; // ?url: o JSON de 4 MB fica fora do bundle e é lido por fetch
import urlAnaliseBh from "../mocks/analise.bh.json?url";
import type { Analise, Pedido, Rede } from "./tipos";
import { validarAnalise, validarRede } from "./validar";

export const SERVIDOR = "http://localhost:8080/api";

const usarMockPadrao = () => import.meta.env.VITE_USAR_MOCK === "true";

export function urlDaRede(usarMock: boolean): string {
  return usarMock ? urlBh : `${SERVIDOR}/rede`;
}

export function urlDaAnalise(usarMock: boolean): string {
  return usarMock ? urlAnaliseBh : `${SERVIDOR}/analise`;
}

async function buscarValidado<T>(
  url: string, init: RequestInit | undefined, usarMock: boolean, buscar: typeof fetch,
  validar: (json: unknown) => string[], oQue: string,
): Promise<T> {
  let resposta: Response;
  try {
    resposta = await buscar(url, init);
  } catch {
    throw new Error(usarMock
      ? `não deu para abrir o arquivo de exemplo com ${oQue}`
      : `o servidor não respondeu em ${SERVIDOR} (ele está ligado? ou use VITE_USAR_MOCK=true)`);
  }
  const corpo = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    throw new Error(corpo?.erro ?? `o servidor respondeu ${resposta.status} ao pedir ${oQue}`);
  }
  const erros = validar(corpo);
  if (erros.length) throw new Error(`${oQue} não segue o contrato (06-api): ${erros.slice(0, 3).join("; ")}`);
  return corpo as T;
}

export function carregarRede(usarMock = usarMockPadrao(), buscar: typeof fetch = fetch): Promise<Rede> {
  return buscarValidado(urlDaRede(usarMock), undefined, usarMock, buscar, validarRede, "a rede");
}

/** Análise da rede sem falhas (pedido vazio). */
export function carregarAnalise(usarMock = usarMockPadrao(), buscar: typeof fetch = fetch): Promise<Analise> {
  const init = usarMock ? undefined : { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" };
  return buscarValidado(urlDaAnalise(usarMock), init, usarMock, buscar, validarAnalise, "a análise");
}

/** Análise com falhas. No mock, calcula com o gerador do mock (árvore fixa) em cima da rede já carregada. */
export async function pedirAnalise(
  pedido: Pedido, rede: Rede, signal?: AbortSignal, usarMock = usarMockPadrao(), buscar: typeof fetch = fetch,
): Promise<Analise> {
  if (usarMock) {
    // import dinâmico: o gerador fica fora do bundle de quem usa o servidor
    const { gerarAnalise } = await import("../../scripts/analise_sintetica.mjs");
    const analise = gerarAnalise(rede, pedido);
    const erros = validarAnalise(analise);
    if (erros.length) throw new Error(`a análise do mock não segue o contrato (06-api): ${erros.slice(0, 3).join("; ")}`);
    return analise;
  }
  const init = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pedido), signal };
  return buscarValidado(urlDaAnalise(false), init, false, buscar, validarAnalise, "a análise");
}
