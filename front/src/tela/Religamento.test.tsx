import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import rotaMock from "../mocks/rota-alternativa.json";
import type { RotaAlternativa } from "../api/tipos";
import { dicaDoReligar } from "./falhas";
import { AcharRota, Religamento } from "./Religamento";

const status = (html: string) => html.match(/<div[^>]*role="status"[^>]*>(.*?)<\/div><\/section>/)?.[1];

test("a dica segue a ordem mock → sem falhas → sem ponto sem luz", () => {
  const base = { usandoMock: false, temFalhas: true, temSemLuz: true, calculando: false, temResultado: false };
  expect(dicaDoReligar({ ...base, usandoMock: true, temFalhas: false })).toBe("O Religar precisa do servidor.");
  expect(dicaDoReligar({ ...base, temFalhas: false })).toBe("Derrube um item pelo cartão dele primeiro.");
  expect(dicaDoReligar({ ...base, temSemLuz: false })).toBe("Nenhum ponto sem luz para religar.");
  expect(dicaDoReligar({ ...base, temSemLuz: false, temResultado: true })).toBe("");
  expect(dicaDoReligar(base)).toBeNull();
  expect(dicaDoReligar({ ...base, temSemLuz: false, calculando: true })).toBeNull();
});

test("o botão fica desligado com dica", () => {
  const props = { rota: null, calculando: false, aoAcharRota: () => {} };
  expect(renderToStaticMarkup(<AcharRota {...props} dica="" />)).toContain("disabled");
  expect(renderToStaticMarkup(<AcharRota {...props} dica={null} />)).not.toContain("disabled");
});

test("o resultado fica numa região de status que existe antes dele", () => {
  expect(status(renderToStaticMarkup(<Religamento rota={null} faltando={0} dica={null} />))).toBe("");
  const semChaves = { ...(rotaMock as RotaAlternativa), chavesParaFechar: [], caminho: [] };
  const html = renderToStaticMarkup(
    <Religamento rota={{ fase: "pronta", resultado: semChaves, semLuzAntes: 10, chavesAntes: [] }} faltando={0} dica={null} />,
  );
  expect(status(html)).toContain("Nenhuma chave alcança a área sem luz.");
});
