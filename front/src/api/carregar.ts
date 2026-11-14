import urlBh from "../mocks/rede.bh.json?url"; // ?url: o JSON de 4 MB fica fora do bundle e é lido por fetch
import type { Rede } from "./tipos";
import { validarRede } from "./validar";

export const SERVIDOR = "http://localhost:8080/api";

export function urlDaRede(usarMock: boolean): string {
  return usarMock ? urlBh : `${SERVIDOR}/rede`;
}

export async function carregarRede(
  usarMock = import.meta.env.VITE_USAR_MOCK === "true",
  buscar: typeof fetch = fetch,
): Promise<Rede> {
  const url = urlDaRede(usarMock);
  let resposta: Response;
  try {
    resposta = await buscar(url);
  } catch {
    throw new Error(usarMock
      ? "não deu para abrir o mock da rede"
      : `o servidor não respondeu em ${SERVIDOR} (ele está ligado? ou use VITE_USAR_MOCK=true)`);
  }
  const corpo = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    throw new Error(corpo?.erro ?? `o servidor respondeu ${resposta.status} ao pedir a rede`);
  }
  const erros = validarRede(corpo);
  if (erros.length) throw new Error(`a rede não segue o contrato (06-api): ${erros.slice(0, 3).join("; ")}`);
  return corpo as Rede;
}
