import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import rotaMock from "../mocks/rota-alternativa.json";
import type { RotaAlternativa } from "../api/tipos";
import { Religamento } from "./Religamento";

const base = { faltando: 0, temFalhas: true, temSemLuz: true, usandoMock: false, calculando: false, aoAcharRota: () => {} };
const status = (html: string) => html.match(/<div[^>]*role="status"[^>]*>(.*?)<\/div><\/section>/)?.[1];

test("o resultado fica numa região de status que existe antes dele", () => {
  expect(status(renderToStaticMarkup(<Religamento {...base} rota={null} />))).toBe("");
  const semChaves = { ...(rotaMock as RotaAlternativa), chavesParaFechar: [], caminho: [] };
  const html = renderToStaticMarkup(<Religamento {...base} rota={{ fase: "pronta", resultado: semChaves, semLuzAntes: 10, chavesAntes: [] }} />);
  expect(status(html)).toContain("Nenhuma chave alcança a área sem luz.");
});
