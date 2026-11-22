import { readFileSync, readdirSync } from "node:fs";
import { expect, test } from "vitest";

// Os diagramas de docs/diagramas usam os mesmos tokens da tela (docs/design/tokens.md).
const tokens = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
const pasta = new URL("../../../docs/diagramas/", import.meta.url);
const svgs = readdirSync(pasta).filter((f) => f.endsWith(".svg"));
const cores = (texto: string) => new Set((texto.match(/#[0-9a-f]{6}\b/gi) ?? []).map((c) => c.toLowerCase()));
const fonte = tokens.match(/--fonte:\s*([^;]+);/)![1];

test("os diagramas existem em claro e escuro", () => {
  expect(svgs.length).toBe(10);
  for (const f of svgs.filter((f) => !f.endsWith("-dark.svg"))) expect(svgs).toContain(f.replace(".svg", "-dark.svg"));
});

test.each(svgs)("%s só usa cores e fonte dos tokens da tela", (f) => {
  const svg = readFileSync(new URL(f, pasta), "utf8");
  const permitidas = cores(tokens);
  expect([...cores(svg)].filter((c) => !permitidas.has(c))).toEqual([]);
  const familias = new Set([...svg.matchAll(/font-family(?:=|:\s*)"?([^";]+)/g)].map((m) => m[1].trim()));
  expect([...familias]).toEqual([fonte]);
});
