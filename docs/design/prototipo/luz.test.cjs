// Testes da grade de células que diz onde tem luz. Rodar: node --test docs/design/prototipo/
const test = require("node:test");
const assert = require("node:assert/strict");
require("./cenarios.js");
require("./luz.js");
const { gerarCelulas, celulaDe, ondaDe, distSegmento } = globalThis.LuzesLuz;
const L = globalThis.Luzes;

const OPTS = { bbox: [-44.06, -20.02, -43.86, -19.79], passo: 0.0035, raio: 0.012, pontosPorCelula: 6 };
const { celulas, grade } = gerarCelulas(L.rede.linhas, OPTS);
const atende = L.rede.linhas.features.filter((f) => f.properties.tipo === "tronco" || f.properties.tipo === "ramal");
const distLinha = (p, f) => Math.min(...f.geometry.coordinates.slice(1).map((b, k) => distSegmento(p, f.geometry.coordinates[k], b)));

test("gera células e só tronco/ramal atendem", () => {
  assert.ok(celulas.length > 300);
  const tipo = Object.fromEntries(L.rede.linhas.features.map((f) => [f.properties.id, f.properties.tipo]));
  for (const c of celulas) assert.ok(["tronco", "ramal"].includes(tipo[c.linha]), c.linha);
});

test("cada célula é ligada ao trecho mais próximo, dentro do raio", () => {
  for (const c of celulas.filter((_, k) => k % 7 === 0)) {
    const minha = distLinha(c.centro, atende.find((f) => f.properties.id === c.linha));
    const melhor = Math.min(...atende.map((f) => distLinha(c.centro, f)));
    assert.ok(Math.abs(minha - melhor) < 1e-12, `${c.i},${c.j}`);
    assert.ok(minha <= OPTS.raio);
  }
});

test("pontos de luz ficam dentro da célula e são sempre os mesmos", () => {
  const again = gerarCelulas(L.rede.linhas, OPTS).celulas;
  assert.deepEqual(again[10].pontos, celulas[10].pontos);
  for (const c of celulas.slice(0, 50)) {
    assert.equal(c.pontos.length, OPTS.pontosPorCelula);
    const [[w, s], , [e, n]] = c.poligono[0];
    for (const [x, y] of c.pontos) assert.ok(x >= w && x <= e && y >= s && y <= n);
  }
});

test("celulaDe acha a célula de um ponto e devolve null fora da grade", () => {
  const c = celulas[42];
  assert.deepEqual(celulaDe(c.centro[0], c.centro[1], grade), { i: c.i, j: c.j });
  assert.equal(celulaDe(-45, -19.9, grade), null);
});

test("onda vai de 0 na origem até 1 na célula mais longe", () => {
  const algumas = celulas.slice(0, 40);
  const onda = ondaDe(algumas, algumas[0].centro);
  assert.equal(onda[0], 0);
  assert.equal(Math.max(...onda), 1);
  for (const v of onda) assert.ok(v >= 0 && v <= 1);
});

// ---------- contorno das zonas ----------
const { suavizar, isobanda, isolinha } = globalThis.LuzesLuz;
const G = { w: 0, s: 0, passo: 1, ni: 5, nj: 5 };
const campoCentro = () => { const f = new Float32Array(25); f[2 * 5 + 2] = 1; return f; }; // i=2, j=2

test("suavizar espalha o valor e não cria energia do nada", () => {
  const f = suavizar(campoCentro(), G.ni, G.nj);
  assert.ok(f[12] < 1 && f[12] > 0);
  assert.ok(f[11] > 0 && f[13] > 0);
  assert.equal(f[0], 0);
});

test("campo zerado não gera área nem contorno", () => {
  const z = new Float32Array(25);
  assert.equal(isobanda(z, G, 0.5).length, 0);
  assert.equal(isolinha(z, G, 0.5).length, 0);
});

test("campo cheio cobre todos os quadrados e não tem contorno interno", () => {
  const um = new Float32Array(25).fill(1);
  assert.equal(isobanda(um, G, 0.5).length, (G.ni - 1) * (G.nj - 1));
  assert.equal(isolinha(um, G, 0.5).length, 0);
});

test("um pico gera um contorno fechado em volta dele", () => {
  const segs = isolinha(campoCentro(), G, 0.5);
  assert.equal(segs.length, 4);
  // as pontas dos segmentos se encontram duas a duas: o contorno fecha
  const chave = ([x, y]) => `${x.toFixed(6)},${y.toFixed(6)}`;
  const conta = new Map();
  for (const s of segs) for (const p of s) conta.set(chave(p), (conta.get(chave(p)) || 0) + 1);
  for (const n of conta.values()) assert.equal(n, 2);
});

test("área e contorno ficam entre os centros das células", () => {
  for (const pol of isobanda(campoCentro(), G, 0.5)) for (const [x, y] of pol[0]) {
    assert.ok(x >= 0.5 && x <= 4.5 && y >= 0.5 && y <= 4.5);
  }
});

test("bboxDe envolve toda a distribuição com folga", () => {
  const { bboxDe } = globalThis.LuzesLuz;
  const [w, s, e, n] = bboxDe(L.rede.linhas, 0.02);
  for (const f of atende) for (const [x, y] of f.geometry.coordinates) {
    assert.ok(x - 0.02 >= w - 1e-12 && x + 0.02 <= e + 1e-12 && y - 0.02 >= s - 1e-12 && y + 0.02 <= n + 1e-12);
  }
});

test("sela com BR e TL acesos: o contorno separa os cantos apagados, sem atravessar a área", () => {
  const G2 = { w: 0, s: 0, passo: 1, ni: 2, nj: 2 };
  const f = new Float32Array([0, 1, 1, 0]); // bl=0, br=1, tl=1, tr=0
  const k = ([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`;
  const segs = isolinha(f, G2, 0.5).map((s) => s.map(k).sort().join("|")).sort();
  const esperado = [[[1, 0.5], [0.5, 1]], [[1.5, 1], [1, 1.5]]].map((s) => s.map(k).sort().join("|")).sort();
  assert.deepEqual(segs, esperado);
});

test("resumo por região: % com luz, uso médio e gargalos, problemas primeiro", () => {
  const { resumoPorRegiao } = globalThis.LuzesLuz;
  const regiaoDe = Object.fromEntries(L.rede.linhas.features.map((f) => [f.properties.id, f.properties.regiao]));
  const tudoAceso = resumoPorRegiao(celulas, celulas.map(() => true), L.rede.linhas, new Set());
  assert.deepEqual(tudoAceso.map((r) => r.regiao), ["Barreiro", "Centro", "Norte", "Sul"]);
  for (const r of tudoAceso) {
    assert.equal(r.pctComLuz, 100);
    assert.ok(r.usoMedio > 0 && r.usoMedio < 1);
  }
  assert.equal(tudoAceso.reduce((a, r) => a + r.gargalos, 0), 2);

  // apaga metade das células do Centro: o Centro vem primeiro, com ~50%
  let n = 0;
  const acesa = celulas.map((c) => !(regiaoDe[c.linha] === "Centro" && n++ % 2 === 0));
  const r = resumoPorRegiao(celulas, acesa, L.rede.linhas, new Set());
  assert.equal(r[0].regiao, "Centro");
  assert.ok(r[0].pctComLuz >= 49 && r[0].pctComLuz <= 51, `${r[0].pctComLuz}`);

  // linha morta não entra no uso médio nem conta gargalo
  const semGargalo = resumoPorRegiao(celulas, celulas.map(() => true), L.rede.linhas, new Set(["t:c1"]));
  assert.equal(semGargalo.find((x) => x.regiao === "Centro").gargalos, 0);
});
