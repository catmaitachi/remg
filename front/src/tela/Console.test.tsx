import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { Console, Falhas } from "./Console";
import { Contexto } from "./Contexto";

const base = { area: "Belo Horizonte", analise: null, faltando: 0, calculando: false, modo: "religar" as const, aoMudarModo: () => {} };

test("a ação do modo fica no console", () => {
  const html = renderToStaticMarkup(<Console {...base} acao={<button type="button">Achar rota</button>} />);
  expect(html).toMatch(/<header[^>]*>.*Achar rota.*<\/header>/);
});

test("o cartão de contexto vazio não aparece", () => {
  expect(renderToStaticMarkup(<Contexto>{false}{null}</Contexto>)).toBe("");
  expect(renderToStaticMarkup(<Contexto><p>x</p></Contexto>)).toContain('aria-label="Detalhes"');
});

test("a falha sai pelo X e o Restaurar tudo não mora mais na lista", () => {
  const alvo = { tipo: "subestacao" as const, id: "s:1" };
  const html = renderToStaticMarkup(<Falhas falhas={[{ alvo, rotulo: "Subestação X" }]} aoRestaurar={() => {}} />);
  expect(html).toContain("Restaurar Subestação X");
  expect(html).not.toContain("Restaurar tudo");
});
