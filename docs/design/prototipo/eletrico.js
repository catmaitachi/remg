// Lógica pura do efeito elétrico (inspirado no ElectricLogo do React Bits, recriado do zero).
// Script clássico: expõe globalThis.LuzesEletrico.
(function () {
  const NIVEL = { normal: 1, alerta: 2, gargalo: 3 };

  // 0 = sem energia · 1 normal · 2 perto do limite · 3 gargalo ou caminho acendendo
  function intensidade(p, { mortas, acendendo, chavesFechadas }) {
    if (mortas.has(p.id)) return 0;
    if (p.tipo === "chave" && !chavesFechadas.has(p.id)) return 0;
    if (acendendo.has(p.id)) return 3;
    if (p.tipo === "chave") return 1;
    return NIVEL[globalThis.Luzes.classeUso(p.uso)];
  }

  const frac = (x) => x - Math.floor(x);
  // Ruído em [-1, 1]: metade ondulação suave, metade estalo aleatório.
  // `desloc` faz a ondulação correr ao longo da linha (sentido do fluxo); `fase` faz o estalo.
  function ruido(k, fase, desloc) {
    const x = k - desloc;
    const suave = 0.6 * Math.sin(x * 0.9 + fase * 0.7) + 0.4 * Math.sin(x * 2.3 - fase * 1.3);
    const estalo = frac(Math.sin(k * 12.9898 + fase * 78.233) * 43758.5453) * 2 - 1;
    return 0.5 * suave + 0.5 * estalo;
  }

  // Adensa a linha a cada `passo` (graus) e desloca cada ponto na perpendicular
  // até `amp` (graus). As pontas ficam presas para o fio "sair" da linha.
  function tremer(coords, amp, passo, fase, desloc = 0) {
    const pts = [];
    let total = 0;
    for (let i = 1; i < coords.length; i++) total += Math.hypot(coords[i][0] - coords[i - 1][0], coords[i][1] - coords[i - 1][1]);
    let andado = 0, k = 0;
    for (let i = 1; i < coords.length; i++) {
      const [x0, y0] = coords[i - 1], [x1, y1] = coords[i];
      const len = Math.hypot(x1 - x0, y1 - y0);
      if (len === 0) continue;
      const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
      const n = Math.max(2, Math.ceil(len / passo));
      for (let j = 0; j < n; j++, k++) {
        const s = j / n;
        const taper = Math.sin(Math.PI * ((andado + s * len) / total));
        const d = amp * taper * ruido(k, fase, desloc);
        pts.push([x0 + (x1 - x0) * s + nx * d, y0 + (y1 - y0) * s + ny * d]);
      }
      andado += len;
    }
    pts[0] = coords[0].slice();
    pts.push(coords.at(-1).slice());
    return pts;
  }

  // Pontos da linha percorridos por segundo: mais carga, energia correndo mais rápido.
  function velocidade(uso) {
    return 2 + 18 * Math.max(0, Math.min(1, uso));
  }

  // Espaço entre pontos do fio: 6 px na tela, mas nunca mais de ~300 pontos por linha (zoom alto).
  function passoDoFio(coords, grausPorPx) {
    let comp = 0;
    for (let i = 1; i < coords.length; i++) comp += Math.hypot(coords[i][0] - coords[i - 1][0], coords[i][1] - coords[i - 1][1]);
    return Math.max(6 * grausPorPx, comp / 300);
  }

  globalThis.LuzesEletrico = { intensidade, tremer, velocidade, passoDoFio };
})();
