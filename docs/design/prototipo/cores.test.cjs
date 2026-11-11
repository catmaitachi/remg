// Filtro da paleta: contraste com o fundo do mapa e distinção com daltonismo.
// Não prova legibilidade sobre ruas e parques; isso é conferido no mapa real.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const css = fs.readFileSync(path.join(__dirname, "estilo.css"), "utf8");

function bloco(seletor) {
  const i = css.indexOf(seletor + " {");
  assert.ok(i >= 0, `bloco ${seletor} não encontrado`);
  const corpo = css.slice(i, css.indexOf("}", i));
  return Object.fromEntries([...corpo.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}
const temas = {
  claro: { vars: bloco(":root"), fundo: [242, 243, 240] },
  escuro: { vars: { ...bloco(":root"), ...bloco(':root[data-theme="escuro"]') }, fundo: [12, 12, 12] },
};

const hex = (h) => { const n = parseInt(h.replace("#", ""), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const enc = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const luminancia = (rgb) => { const [r, g, b] = rgb.map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contraste = (a, b) => { const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// Machado, Oliveira e Fernandes (2009), severidade 1.0, em RGB linear.
const MATRIZ = {
  deuteranopia: [[0.367, 0.861, -0.228], [0.280, 0.673, 0.047], [-0.012, 0.043, 0.969]],
  protanopia: [[0.152, 1.053, -0.205], [0.115, 0.786, 0.099], [-0.004, -0.048, 1.052]],
};
const simular = (rgb, m) => { const l = rgb.map(lin); return m.map((r) => enc(Math.min(1, Math.max(0, r[0] * l[0] + r[1] * l[1] + r[2] * l[2])))); };

function lab(rgb) {
  const [r, g, b] = rgb.map(lin);
  const xyz = [(0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, 0.2126 * r + 0.7152 * g + 0.0722 * b, (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883];
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const [fx, fy, fz] = xyz.map(f);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
const deltaE = (a, b) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]));

const VISOES = { normal: (c) => c, deuteranopia: (c) => simular(c, MATRIZ.deuteranopia), protanopia: (c) => simular(c, MATRIZ.protanopia) };
const USOS = ["--uso-normal", "--uso-alerta", "--uso-gargalo"];

for (const [nome, { vars, fundo }] of Object.entries(temas)) {
  const cor = (v) => { assert.ok(vars[v], `${v} ausente no tema ${nome}`); return hex(vars[v]); };

  test(`${nome}: cada cor de uso tem contraste ≥ 3:1 com o fundo do mapa (WCAG 1.4.11)`, () => {
    for (const v of USOS) assert.ok(contraste(cor(v), fundo) >= 3, `${v} ${contraste(cor(v), fundo).toFixed(2)}:1`);
  });

  test(`${nome}: linha caída tem contraste ≥ 3:1 com o fundo do mapa`, () => {
    assert.ok(contraste(cor("--caiu"), fundo) >= 3, `--caiu ${contraste(cor("--caiu"), fundo).toFixed(2)}:1`);
  });

  test(`${nome}: as 3 cores de uso ficam distintas (ΔE76 ≥ 20) em toda visão`, () => {
    for (const [visao, ver] of Object.entries(VISOES))
      for (let i = 0; i < USOS.length; i++)
        for (let j = i + 1; j < USOS.length; j++) {
          const d = deltaE(ver(cor(USOS[i])), ver(cor(USOS[j])));
          assert.ok(d >= 20, `${visao}: ${USOS[i]} × ${USOS[j]} ΔE ${d.toFixed(1)}`);
        }
  });

  test(`${nome}: caiu e apagado não se confundem com cor de uso (ΔE76 ≥ 20)`, () => {
    for (const [visao, ver] of Object.entries(VISOES))
      for (const cinza of ["--caiu", "--apagado"])
        for (const v of USOS) {
          const d = deltaE(ver(cor(cinza)), ver(cor(v)));
          assert.ok(d >= 20, `${visao}: ${cinza} × ${v} ΔE ${d.toFixed(1)}`);
        }
  });
}

test("larguras: at > tronco > ramal ≥ 2", () => {
  const px = (v) => parseFloat(temas.claro.vars[v]);
  assert.ok(px("--larg-at") > px("--larg-tronco"));
  assert.ok(px("--larg-tronco") > px("--larg-ramal"));
  assert.ok(px("--larg-ramal") >= 2);
});
