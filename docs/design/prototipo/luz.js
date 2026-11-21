// Grade de células que diz onde a cidade tem luz (protótipo da T02).
// Cada célula é atendida pelo trecho de distribuição mais próximo; se o trecho cai, ela apaga.
// Script clássico: expõe globalThis.LuzesLuz.
(function () {
  const COS_LAT = Math.cos((19.9 * Math.PI) / 180); // BH: 1° de longitude encolhe para ~0,94°

  // Distância (em graus de latitude) do ponto p ao segmento a-b.
  function distSegmento(p, a, b) {
    const px = p[0] * COS_LAT, ax = a[0] * COS_LAT, bx = b[0] * COS_LAT;
    const dx = bx - ax, dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (p[1] - a[1]) * dy) / len2));
    return Math.hypot(px - (ax + t * dx), p[1] - (a[1] + t * dy));
  }

  // Pseudoaleatório determinístico: a mesma célula sempre tem as mesmas luzes.
  function aleatorio(semente) {
    let s = semente >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gerarCelulas(linhas, { bbox, passo, raio, pontosPorCelula }) {
    const [w, s, e, n] = bbox;
    const grade = { w, s, passo, ni: Math.ceil((e - w) / passo), nj: Math.ceil((n - s) / passo) };
    const segs = [];
    for (const f of linhas.features) {
      if (f.properties.tipo !== "tronco" && f.properties.tipo !== "ramal") continue;
      const g = f.geometry.coordinates;
      for (let k = 1; k < g.length; k++) segs.push([g[k - 1], g[k], f.properties.id]);
    }
    const celulas = [];
    for (let i = 0; i < grade.ni; i++) {
      for (let j = 0; j < grade.nj; j++) {
        const x0 = w + i * passo, y0 = s + j * passo;
        const centro = [x0 + passo / 2, y0 + passo / 2];
        let melhor = Infinity, linha = null;
        for (const [a, b, id] of segs) {
          const d = distSegmento(centro, a, b);
          if (d < melhor) { melhor = d; linha = id; }
        }
        if (melhor > raio) continue;
        const r = aleatorio(i * 7919 + j * 104729);
        const pontos = [];
        for (let k = 0; k < pontosPorCelula; k++) pontos.push([x0 + r() * passo, y0 + r() * passo]);
        const poligono = [[[x0, y0], [x0 + passo, y0], [x0 + passo, y0 + passo], [x0, y0 + passo], [x0, y0]]];
        celulas.push({ i, j, centro, poligono, linha, distancia: melhor, pontos });
      }
    }
    return { celulas, grade };
  }

  function celulaDe(lon, lat, grade) {
    const i = Math.floor((lon - grade.w) / grade.passo);
    const j = Math.floor((lat - grade.s) / grade.passo);
    if (i < 0 || j < 0 || i >= grade.ni || j >= grade.nj) return null;
    return { i, j };
  }

  // Distância normalizada (0 a 1) de cada célula até a origem: a ordem em que reacendem.
  function ondaDe(celulas, origem) {
    const d = celulas.map((c) => Math.hypot((c.centro[0] - origem[0]) * COS_LAT, c.centro[1] - origem[1]));
    const min = Math.min(...d), max = Math.max(...d);
    return d.map((v) => (max === min ? 0 : (v - min) / (max - min)));
  }

  // ---------- contorno das zonas (marching squares sobre os centros das células) ----------
  // Campo indexado por j * ni + i. Média 3x3 com borda zero: espalha sem criar valor.
  function suavizar(f, ni, nj) {
    const out = new Float32Array(f.length);
    for (let j = 0; j < nj; j++) for (let i = 0; i < ni; i++) {
      let soma = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const x = i + di, y = j + dj;
        if (x >= 0 && y >= 0 && x < ni && y < nj) soma += f[y * ni + x];
      }
      out[j * ni + i] = soma / 9;
    }
    return out;
  }

  const ponto = (g, i, j) => [g.w + (i + 0.5) * g.passo, g.s + (j + 0.5) * g.passo];
  const entre = (a, b, va, vb, t) => { const r = (t - va) / (vb - va); return [a[0] + r * (b[0] - a[0]), a[1] + r * (b[1] - a[1])]; };

  // Os 4 cantos de cada quadrado, em volta: inferior esquerdo, inferior direito, superior direito, superior esquerdo.
  function quadrados(f, g, fazer) {
    for (let j = 0; j < g.nj - 1; j++) for (let i = 0; i < g.ni - 1; i++) {
      const ij = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
      fazer(ij.map(([x, y]) => ponto(g, x, y)), ij.map(([x, y]) => f[y * g.ni + x]));
    }
  }

  // Polígonos da região com valor >= t: cada quadrado recortado no limiar.
  function isobanda(f, g, t) {
    const pols = [];
    quadrados(f, g, (p, v) => {
      const anel = [];
      for (let k = 0; k < 4; k++) {
        const n = (k + 1) % 4;
        if (v[k] >= t) anel.push(p[k]);
        if ((v[k] >= t) !== (v[n] >= t)) anel.push(entre(p[k], p[n], v[k], v[n], t));
      }
      if (anel.length >= 3) pols.push([[...anel, anel[0]]]);
    });
    return pols;
  }

  // Segmentos da linha onde o campo cruza t.
  function isolinha(f, g, t) {
    const segs = [];
    quadrados(f, g, (p, v) => {
      const cruza = [];
      for (let k = 0; k < 4; k++) {
        const n = (k + 1) % 4;
        if ((v[k] >= t) !== (v[n] >= t)) cruza.push(entre(p[k], p[n], v[k], v[n], t));
      }
      if (cruza.length === 2) segs.push([cruza[0], cruza[1]]);
      // Sela: liga as arestas do mesmo jeito que o isobanda monta a área, para o traço não atravessá-la.
      if (cruza.length === 4) {
        if (v[1] >= t) segs.push([cruza[3], cruza[0]], [cruza[1], cruza[2]]);
        else segs.push([cruza[0], cruza[1]], [cruza[2], cruza[3]]);
      }
    });
    return segs;
  }

  // Retângulo da distribuição (tronco e ramal) com folga, para as zonas não baterem na borda da grade.
  function bboxDe(linhas, folga) {
    let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
    for (const f of linhas.features) {
      if (f.properties.tipo !== "tronco" && f.properties.tipo !== "ramal") continue;
      for (const [x, y] of f.geometry.coordinates) { w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y); }
    }
    return [w - folga, s - folga, e + folga, n + folga];
  }

  // Uma linha por região para o painel: % de células com luz, uso médio dos trechos vivos e gargalos.
  // Ordena com os problemas primeiro, para escalar a muitas regiões (região metropolitana).
  function resumoPorRegiao(celulas, acesa, linhas, mortas) {
    const r = new Map();
    const de = (nome) => { if (!r.has(nome)) r.set(nome, { regiao: nome, total: 0, acesas: 0, usos: [], gargalos: 0 }); return r.get(nome); };
    const regiaoDe = {};
    for (const f of linhas.features) {
      const p = f.properties;
      if (!p.regiao) continue;
      regiaoDe[p.id] = p.regiao;
      const x = de(p.regiao);
      if (mortas.has(p.id)) continue;
      x.usos.push(p.uso);
      if (globalThis.Luzes.classeUso(p.uso) === "gargalo") x.gargalos++;
    }
    celulas.forEach((c, k) => { const x = de(regiaoDe[c.linha]); x.total++; if (acesa[k]) x.acesas++; });
    return [...r.values()]
      .map((x) => ({ regiao: x.regiao, pctComLuz: x.total ? Math.floor((100 * x.acesas) / x.total) : 100,
        usoMedio: x.usos.length ? x.usos.reduce((a, b) => a + b, 0) / x.usos.length : 0, gargalos: x.gargalos }))
      .sort((a, b) => a.pctComLuz - b.pctComLuz || a.regiao.localeCompare(b.regiao, "pt-BR"));
  }

  globalThis.LuzesLuz = { bboxDe, resumoPorRegiao, gerarCelulas, celulaDe, ondaDe, distSegmento, suavizar, isobanda, isolinha };
})();
