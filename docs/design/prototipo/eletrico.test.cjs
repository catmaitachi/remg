// Testes da lógica pura do efeito elétrico. Rodar: node --test docs/design/prototipo/
const test = require("node:test");
const assert = require("node:assert/strict");
require("./cenarios.js");
require("./eletrico.js");
const { intensidade, tremer } = globalThis.LuzesEletrico;

const vazio = { mortas: new Set(), acendendo: new Set(), chavesFechadas: new Set() };
const linha = (id, tipo, uso) => ({ id, tipo, uso, fluxoKVA: uso * 1000, capacidadeKVA: 1000 });

test("intensidade segue o uso: normal 1, alerta 2, gargalo 3", () => {
  assert.equal(intensidade(linha("t:1", "tronco", 0.3), vazio), 1);
  assert.equal(intensidade(linha("t:1", "tronco", 0.7), vazio), 2);
  assert.equal(intensidade(linha("t:1", "tronco", 0.95), vazio), 3);
});

test("linha sem luz ou caída não tem eletricidade", () => {
  const ctx = { ...vazio, mortas: new Set(["t:1"]) };
  assert.equal(intensidade(linha("t:1", "tronco", 0.95), ctx), 0);
});

test("chave aberta não tem eletricidade; fechada tem", () => {
  assert.equal(intensidade(linha("c:1", "chave", 0), vazio), 0);
  assert.equal(intensidade(linha("c:1", "chave", 0), { ...vazio, chavesFechadas: new Set(["c:1"]) }), 1);
});

test("caminho religado estala no máximo enquanto acende", () => {
  const ctx = { ...vazio, acendendo: new Set(["t:1", "c:1"]), chavesFechadas: new Set(["c:1"]) };
  assert.equal(intensidade(linha("t:1", "tronco", 0.2), ctx), 3);
  assert.equal(intensidade(linha("c:1", "chave", 0), ctx), 3);
});

test("morta vence acendendo (religar parcial)", () => {
  const ctx = { ...vazio, mortas: new Set(["r:1"]), acendendo: new Set(["r:1"]) };
  assert.equal(intensidade(linha("r:1", "ramal", 0.5), ctx), 0);
});

const coords = [[-43.90, -19.90], [-43.80, -19.90], [-43.80, -19.80]];

test("tremer mantém as pontas e adensa a linha", () => {
  const t = tremer(coords, 0.001, 0.01, 1.7);
  assert.deepEqual(t[0], coords[0]);
  assert.deepEqual(t.at(-1), coords.at(-1));
  assert.ok(t.length > coords.length * 5);
});

test("tremer nunca afasta mais que a amplitude", () => {
  const amp = 0.002;
  for (const p of tremer(coords, amp, 0.01, 4.2)) {
    // distância até o traçado original (dois segmentos, um horizontal e um vertical)
    const d = Math.min(p[0] <= -43.80 ? Math.abs(p[1] + 19.90) : Infinity, p[1] >= -19.90 ? Math.abs(p[0] + 43.80) : Infinity);
    assert.ok(d <= amp + 1e-9, `ponto a ${d}`);
  }
});

test("amplitude zero devolve pontos sobre a linha original", () => {
  for (const p of tremer([[0, 0], [1, 0]], 0, 0.1, 3)) assert.equal(p[1], 0);
});

test("fases diferentes dão formas diferentes", () => {
  assert.notDeepEqual(tremer(coords, 0.001, 0.01, 1), tremer(coords, 0.001, 0.01, 2));
});

test("velocidade cresce com o uso e nunca para numa linha viva", () => {
  const { velocidade } = globalThis.LuzesEletrico;
  assert.ok(velocidade(0.95) > velocidade(0.7));
  assert.ok(velocidade(0.7) > velocidade(0.3));
  assert.ok(velocidade(0.3) > 0);
  assert.ok(velocidade(0) > 0);
});

test("deslocamento faz o padrão andar, com as pontas presas", () => {
  const a = tremer(coords, 0.001, 0.01, 1, 0);
  const b = tremer(coords, 0.001, 0.01, 1, 3);
  assert.notDeepEqual(a, b);
  assert.deepEqual(b[0], coords[0]);
  assert.deepEqual(b.at(-1), coords.at(-1));
});

test("passo do fio limita os pontos por linha mesmo com zoom alto", () => {
  const { passoDoFio } = globalThis.LuzesEletrico;
  const linha = [[0, 0], [0.1, 0]]; // 0,1 grau
  assert.equal(passoDoFio(linha, 0.001), 0.006); // zoom baixo: 6 px
  const pontos = 0.1 / passoDoFio(linha, 0.00001); // zoom alto
  assert.ok(pontos <= 300, `${pontos} pontos`);
});
