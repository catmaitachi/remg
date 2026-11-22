import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { Logo } from "./Logo";

test("a logo se lê como REMG", () => {
  const html = renderToStaticMarkup(<Logo />);
  expect(html).toContain('aria-label="REMG · Rede de Energia de Minas Gerais"');
  expect(html).toContain(">RE<");
  expect(html).toContain(">G<");
  expect(html).toContain('points="58,36 66,6 78,28 90,6 98,36"');
});
