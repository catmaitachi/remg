import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { Legenda } from "./Legenda";

const base = { tema: "claro" as const, semLuz: false, caidos: false, religou: false };

test("a legenda recolhe: o botão diz se está aberta e, fechada, só o título fica", () => {
  const aberta = renderToStaticMarkup(<Legenda {...base} abertaDeInicio />);
  expect(aberta).toMatch(/<button[^>]*aria-expanded="true"[^>]*>.*Legenda/);
  expect(aberta).toContain("Normal, abaixo de 60%");
  const fechada = renderToStaticMarkup(<Legenda {...base} abertaDeInicio={false} />);
  expect(fechada).toContain('aria-expanded="false"');
  expect(fechada).not.toContain("Normal, abaixo de 60%");
});
