import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { Selecionado } from "./Selecionado";

const detalhe = { titulo: "Subestação X", linhas: [["Estado", "ligada"]] as [string, string][] };

test("o cartão do item traz a ação de derrubar (ou restaurar)", () => {
  const html = renderToStaticMarkup(<Selecionado detalhe={detalhe} aoFechar={() => {}} acao={{ texto: "Derrubar", aoClicar: () => {} }} />);
  expect(html).toMatch(/<button[^>]*>Derrubar<\/button>/);
  expect(renderToStaticMarkup(<Selecionado detalhe={detalhe} aoFechar={() => {}} />)).not.toContain("Derrubar");
});
