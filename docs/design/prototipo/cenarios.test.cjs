// Testes da rede de exemplo do protótipo. Rodar: node --test docs/design/prototipo/
const test = require("node:test");
const assert = require("node:assert/strict");
require("./cenarios.js");
const L = globalThis.Luzes;

const linhas = L.rede.linhas.features.map((f) => f.properties);
const idsLinhas = new Set(linhas.map((p) => p.id));
const idsSubs = new Set(L.rede.subestacoes.features.map((f) => f.properties.id));
const tipoDe = Object.fromEntries(linhas.map((p) => [p.id, p.tipo]));
const cenarios = Object.values(L.cenarios);
const parcial = (c) => c.depois.demandaKVA > 0;

test("classeUso respeita as faixas da spec", () => {
  assert.equal(L.classeUso(0.59), "normal");
  assert.equal(L.classeUso(0.6), "alerta");
  assert.equal(L.classeUso(0.89), "alerta");
  assert.equal(L.classeUso(0.9), "gargalo");
});

test("impacto em linguagem comum", () => {
  assert.deepEqual(L.impacto(0, 900000), { pctComLuz: 100, casas: 0 });
  assert.deepEqual(L.impacto(25000, 900000), { pctComLuz: 97, casas: 10000 });
});

test("impacto nunca arredonda para 100% se falta luz", () => {
  assert.equal(L.impacto(100, 900000).pctComLuz, 99);
});

test("impacto nunca diz 'nenhuma casa' se falta luz", () => {
  assert.equal(L.impacto(100, 900000).casas, 100);
});

test("textoCasas", () => {
  assert.equal(L.textoCasas(10000), "~10 mil casas");
  assert.equal(L.textoCasas(800), "~800 casas");
  assert.equal(L.textoCasas(0), "nenhuma casa");
});

test("cenários só usam ids que existem na rede", () => {
  for (const c of cenarios) {
    const alvo = c.falha.tipo === "linha" ? idsLinhas : idsSubs;
    assert.ok(alvo.has(c.falha.id), `falha ${c.falha.id}`);
    for (const id of [...c.semLuz.linhas, ...c.rota.chaves, ...c.rota.linhas, ...c.depois.linhas])
      assert.ok(idsLinhas.has(id), `linha ${id}`);
    for (const id of c.semLuz.subestacoes) assert.ok(idsSubs.has(id), `subestação ${id}`);
  }
});

test("2 ou 3 cenários, um de subestação e exatamente um parcial", () => {
  assert.deepEqual(Object.keys(L.cenarios).sort(), ["barreiro", "centro", "sub-norte"]);
  assert.equal(cenarios.filter((c) => c.falha.tipo === "subestacao").length, 1);
  assert.equal(cenarios.filter(parcial).length, 1);
});

test("toda chave da rota é do tipo chave", () => {
  for (const c of cenarios) for (const id of c.rota.chaves) assert.equal(tipoDe[id], "chave", id);
});

test("uso de cada linha = fluxo / capacidade, entre 0 e 1", () => {
  for (const p of linhas) {
    assert.ok(p.uso >= 0 && p.uso <= 1, p.id);
    assert.ok(Math.abs(p.uso - p.fluxoKVA / p.capacidadeKVA) < 0.01, p.id);
  }
});

test("estado base tem gargalos e trechos perto do limite, e o cartão conta certo", () => {
  const gargalos = linhas.filter((p) => L.classeUso(p.uso) === "gargalo").length;
  assert.ok(gargalos >= 2);
  assert.ok(linhas.some((p) => L.classeUso(p.uso) === "alerta"));
  assert.equal(L.base.gargalos, gargalos);
});

test("depois ⊂ semLuz e depois.demandaKVA < semLuz.demandaKVA", () => {
  for (const c of cenarios) {
    for (const id of c.depois.linhas) assert.ok(c.semLuz.linhas.includes(id), id);
    assert.ok(c.depois.demandaKVA < c.semLuz.demandaKVA);
    assert.equal(c.depois.area === null, !parcial(c));
  }
});

test("demanda sem luz não passa da demanda total", () => {
  for (const c of cenarios) assert.ok(c.semLuz.demandaKVA <= L.base.demandaTotalKVA);
});

test("os números do wireframe batem com os cenários", () => {
  assert.deepEqual(L.impacto(L.cenarios.centro.semLuz.demandaKVA, L.base.demandaTotalKVA), { pctComLuz: 97, casas: 10000 });
  const b = L.impacto(L.cenarios.barreiro.depois.demandaKVA, L.base.demandaTotalKVA);
  assert.equal(b.pctComLuz, 99);
  assert.equal(L.textoCasas(b.casas), "~1 mil casas");
});

test("coordenadas dentro de BH", () => {
  const dentro = ([lon, lat]) => lon >= -44.06 && lon <= -43.85 && lat >= -20.03 && lat <= -19.78;
  for (const f of L.rede.linhas.features) for (const c of f.geometry.coordinates) assert.ok(dentro(c), f.properties.id);
  for (const f of L.rede.subestacoes.features) assert.ok(dentro(f.geometry.coordinates), f.properties.id);
});

test("todo tronco e ramal tem a região da subestação de onde sai", () => {
  const nomes = Object.fromEntries(L.rede.subestacoes.features.map((f) => [f.properties.id, f.properties.nome.replace("Subestação ", "")]));
  const em = Object.fromEntries(L.rede.subestacoes.features.map((f) => [f.geometry.coordinates.join(","), f.properties.id]));
  for (const f of L.rede.linhas.features) {
    const p = f.properties;
    if (p.tipo !== "tronco" && p.tipo !== "ramal") { assert.equal(p.regiao, null, p.id); continue; }
    assert.ok(Object.values(nomes).includes(p.regiao), `${p.id}: ${p.regiao}`);
    const sub = em[f.geometry.coordinates[0].join(",")];
    if (sub) assert.equal(p.regiao, nomes[sub], p.id);
  }
});
