import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { Console, Falhas } from "./Console";
import { Contexto } from "./Contexto";

const base = { analise: null, faltando: 0, calculando: false };

test("sem nome da cidade nem indicador: os números ficam em destaque, e a frase da cidade continua", () => {
  const html = renderToStaticMarkup(<Console {...base} />);
  expect(html).not.toContain("Belo Horizonte");
  expect(html).not.toContain('role="progressbar"');
  expect(html).toContain("Sem dados da análise");
  for (const rotulo of ["Entregue", "Gargalos", "Cálculo"]) expect(html).toContain(`<dt>${rotulo}</dt>`);
  expect(html).not.toContain("<dt>Demanda</dt>"); // a demanda vive junto da entrega: "x de y"
});

test("sem seletor de modo: o console é só leitura e ferramentas", () => {
  const html = renderToStaticMarkup(<Console {...base} ferramentas={<button type="button">Camadas</button>} />);
  expect(html).not.toContain('aria-label="Modo"');
  expect(html).toMatch(/<header[^>]*>.*Camadas.*<\/header>/);
});

test("o cartão de contexto vazio não aparece", () => {
  expect(renderToStaticMarkup(<Contexto>{false}{null}</Contexto>)).toBe("");
  expect(renderToStaticMarkup(<Contexto><p>x</p></Contexto>)).toContain('aria-label="Detalhes"');
});

test("bloco de falhas: o nome leva até a falha, o X restaura, e o Religar vem dentro", () => {
  const alvo = { tipo: "subestacao" as const, id: "s:1" };
  const html = renderToStaticMarkup(
    <Falhas falhas={[{ alvo, rotulo: "Subestação X" }]} aoRestaurar={() => {}} aoRestaurarTudo={() => {}} aoIr={() => {}}>
      <button type="button">Achar rota</button>
    </Falhas>,
  );
  expect(html).toMatch(/<button[^>]*title="Ir até Subestação X"[^>]*>Subestação X<\/button>/);
  expect(html).toContain("Restaurar Subestação X");
  expect(html).toContain("Restaurar tudo");
  expect(html).toContain("Achar rota");
});
