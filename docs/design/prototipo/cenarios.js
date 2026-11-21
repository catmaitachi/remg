// Rede e cenários de EXEMPLO do protótipo da T02. Nada aqui é dado real de BH:
// as linhas são desenhadas à mão sobre o mapa e os resultados são pré-calculados.
// Script clássico (sem módulos) para abrir via file://.
(function () {
  // Suposição declarada: consumo médio de uma casa, só para traduzir kVA em "casas".
  const KVA_POR_CASA = 2.5;

  const CAP = { at: 100000, tronco: 8000, ramal: 3000, chave: 6000 };

  const SUBS = [
    ["s:1", "Subestação Norte", [-43.955, -19.830]],
    ["s:2", "Subestação Centro", [-43.935, -19.915]],
    ["s:3", "Subestação Barreiro", [-44.015, -19.975]],
    ["s:4", "Subestação Sul", [-43.925, -19.965]],
  ];
  const P = Object.fromEntries(SUBS.map(([id, , c]) => [id, c]));

  // [id, tipo, fluxoKVA, coordenadas da fonte para a carga]
  const LINHAS = [
    ["at:1", "at", 42000, [P["s:2"], [-43.950, -19.880], P["s:1"]]],
    ["at:2", "at", 70000, [P["s:2"], [-43.930, -19.940], P["s:4"]]],
    ["at:3", "at", 38000, [P["s:2"], [-43.980, -19.935], [-44.000, -19.955], P["s:3"]]],
    ["at:4", "at", 31000, [P["s:3"], [-44.040, -19.920], [-44.000, -19.860], P["s:1"]]],
    ["at:5", "at", 26000, [P["s:4"], [-43.960, -19.990], P["s:3"]]],
    ["at:6", "at", 55000, [[-43.870, -19.900], P["s:2"]]],

    ["t:c1", "tronco", 7400, [P["s:2"], [-43.935, -19.937], [-43.930, -19.945]]],
    ["r:c1", "ramal", 1500, [[-43.935, -19.937], [-43.945, -19.945]]],
    ["r:c2", "ramal", 1300, [[-43.930, -19.945], [-43.922, -19.952]]],
    ["t:c2", "tronco", 3600, [P["s:2"], [-43.915, -19.910], [-43.900, -19.905]]],
    ["r:c3", "ramal", 1100, [[-43.915, -19.910], [-43.910, -19.895]]],
    ["t:c3a", "tronco", 4200, [P["s:2"], [-43.955, -19.920]]],
    ["t:c3b", "tronco", 2600, [[-43.955, -19.920], [-43.970, -19.925]]],
    ["r:c4", "ramal", 1600, [[-43.955, -19.920], [-43.960, -19.905]]],
    ["t:c4", "tronco", 3100, [P["s:2"], [-43.945, -19.890], [-43.950, -19.860], [-43.948, -19.835]]],

    ["t:b1a", "tronco", 4600, [P["s:3"], [-44.000, -19.985]]],
    ["t:b1b", "tronco", 3400, [[-44.000, -19.985], [-43.990, -19.995]]],
    ["r:b1", "ramal", 1000, [[-44.000, -19.985], [-44.010, -20.000]]],
    ["r:b2", "ramal", 2850, [[-43.990, -19.995], [-43.980, -20.005]]],
    ["t:b2", "tronco", 2900, [P["s:3"], [-44.030, -19.960], [-44.040, -19.950]]],
    ["r:b3", "ramal", 900, [[-44.030, -19.960], [-44.045, -19.970]]],
    ["t:b3", "tronco", 2400, [P["s:3"], [-43.995, -19.950], [-43.985, -19.935]]],

    ["t:n1", "tronco", 4400, [P["s:1"], [-43.945, -19.815], [-43.940, -19.800]]],
    ["r:n1", "ramal", 1200, [[-43.945, -19.815], [-43.930, -19.810]]],
    ["r:n3", "ramal", 1400, [[-43.945, -19.815], [-43.960, -19.805], [-43.968, -19.800]]],
    ["t:n2", "tronco", 5600, [P["s:1"], [-43.970, -19.845], [-43.985, -19.855]]],
    ["r:n2", "ramal", 1700, [[-43.970, -19.845], [-43.975, -19.860]]],

    ["t:s1", "tronco", 6000, [P["s:4"], [-43.940, -19.975], [-43.950, -19.985]]],
    ["r:s1", "ramal", 1400, [[-43.940, -19.975], [-43.935, -19.990]]],
    ["t:s2", "tronco", 2800, [P["s:4"], [-43.910, -19.960], [-43.900, -19.955]]],

    // Chaves de manobra: abertas no estado base, sem fluxo.
    ["c:1", "chave", 0, [[-43.985, -19.935], [-43.970, -19.925]]],
    ["c:2", "chave", 0, [[-43.950, -19.985], [-43.990, -19.995]]],
    ["c:3", "chave", 0, [[-43.948, -19.835], [-43.945, -19.815]]],
    ["c:4", "chave", 0, [[-43.950, -19.860], [-43.970, -19.845]]],
    ["c:5", "chave", 0, [[-43.922, -19.952], [-43.915, -19.961]]],
  ];

  const ponto = ([id, nome, c]) => ({ type: "Feature", properties: { id, nome }, geometry: { type: "Point", coordinates: c } });
  // A letra depois do ":" diz de qual subestação o trecho sai (t:c1 = Centro).
  const REGIAO = { c: "Centro", b: "Barreiro", n: "Norte", s: "Sul" };
  const regiaoDe = (id, tipo) => (tipo === "tronco" || tipo === "ramal" ? REGIAO[id.split(":")[1][0]] : null);
  const linha = ([id, tipo, fluxoKVA, coords]) => ({
    type: "Feature",
    properties: { id, tipo, regiao: regiaoDe(id, tipo), capacidadeKVA: CAP[tipo], fluxoKVA, uso: Math.round((fluxoKVA / CAP[tipo]) * 1000) / 1000 },
    geometry: { type: "LineString", coordinates: coords },
  });

  const rede = {
    subestacoes: { type: "FeatureCollection", features: SUBS.map(ponto) },
    linhas: { type: "FeatureCollection", features: LINHAS.map(linha) },
  };

  function classeUso(u) {
    if (u >= 0.9) return "gargalo";
    if (u >= 0.6) return "alerta";
    return "normal";
  }

  function impacto(semLuzKVA, totalKVA) {
    if (semLuzKVA <= 0) return { pctComLuz: 100, casas: 0 };
    // Arredonda para baixo: nunca prometer luz que não há.
    const pctComLuz = Math.min(99, Math.floor(100 * (1 - semLuzKVA / totalKVA)));
    const casas = Math.max(100, Math.round(semLuzKVA / KVA_POR_CASA / 100) * 100);
    return { pctComLuz, casas };
  }

  function textoCasas(casas) {
    if (casas <= 0) return "nenhuma casa";
    if (casas < 1000) return `~${casas} casas`;
    return `~${Math.round(casas / 1000).toLocaleString("pt-BR")} mil casas`;
  }

  const semDepois = { linhas: [], area: null, demandaKVA: 0 };

  const cenarios = {
    centro: {
      titulo: "Linha do Centro",
      falha: { tipo: "linha", id: "t:c3a" },
      semLuz: {
        linhas: ["t:c3b", "r:c4"], subestacoes: [], demandaKVA: 25000,
        area: [[[-43.975, -19.930], [-43.950, -19.927], [-43.950, -19.900], [-43.965, -19.898], [-43.975, -19.915], [-43.975, -19.930]]],
      },
      rota: { chaves: ["c:1"], linhas: ["t:b3", "c:1", "t:c3b", "r:c4"] },
      depois: semDepois,
    },
    barreiro: {
      titulo: "Linha do Barreiro",
      falha: { tipo: "linha", id: "t:b1a" },
      semLuz: {
        linhas: ["t:b1b", "r:b1", "r:b2"], subestacoes: [], demandaKVA: 40000,
        area: [[[-44.018, -19.980], [-43.985, -19.978], [-43.972, -20.000], [-43.978, -20.012], [-44.015, -20.008], [-44.018, -19.980]]],
      },
      // A linha do Sul não aguenta a carga toda: o ramal r:b1 continua sem luz.
      rota: { chaves: ["c:2"], linhas: ["t:s1", "c:2", "t:b1b", "r:b2"] },
      depois: {
        linhas: ["r:b1"], demandaKVA: 2500,
        area: [[[-44.015, -19.982], [-44.003, -19.981], [-44.002, -20.004], [-44.015, -20.005], [-44.015, -19.982]]],
      },
    },
    "sub-norte": {
      titulo: "Subestação Norte",
      falha: { tipo: "subestacao", id: "s:1" },
      semLuz: {
        linhas: ["t:n1", "r:n1", "r:n3", "t:n2", "r:n2"], subestacoes: ["s:1"], demandaKVA: 60000,
        area: [[[-43.992, -19.850], [-43.980, -19.865], [-43.965, -19.862], [-43.950, -19.838], [-43.925, -19.815], [-43.930, -19.795], [-43.972, -19.795], [-43.992, -19.850]]],
      },
      rota: { chaves: ["c:3", "c:4"], linhas: ["t:c4", "c:3", "c:4", "t:n1", "r:n1", "r:n3", "t:n2", "r:n2"] },
      depois: semDepois,
    },
  };

  const gargalos = rede.linhas.features.filter((f) => classeUso(f.properties.uso) === "gargalo").length;

  globalThis.Luzes = {
    area: "Belo Horizonte", // como no GET /rede da API; o painel lê daqui
    rede, cenarios, KVA_POR_CASA, classeUso, impacto, textoCasas,
    // Números de exemplo, coerentes entre si, para o cartão e o "ver detalhes".
    base: { demandaTotalKVA: 900000, fluxoTotalKVA: 812000, gargalos, tempoMs: 104, tempoRotaMs: 37 },
  };
})();
