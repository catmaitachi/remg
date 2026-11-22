import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { VISIVEIS_INICIAL } from "../mapa/camadas";
import { Ferramentas } from "./Controles";

test("o crédito do mapa fica curto no pé do painel de camadas, com os links das fontes", () => {
  const html = renderToStaticMarkup(
    <Ferramentas visiveis={VISIVEIS_INICIAL} aoMudar={() => {}} temChaves tema="claro" aoTrocarTema={() => {}}
      animando aoAlternarAnimacao={() => {}} intensidade="media" aoMudarIntensidade={() => {}} />,
  );
  expect(html).toMatch(/<p class="painel-credito">.*OpenStreetMap.*<\/p><\/section>/);
  expect(html).toContain('href="https://www.openstreetmap.org/copyright"');
  expect(html).toContain('href="https://openfreemap.org"');
});
