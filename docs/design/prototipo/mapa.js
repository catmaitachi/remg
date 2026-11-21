// Protótipo da tela principal (T02). Interface primeiro, mapa depois:
// se o MapLibre ou os tiles não carregarem, passos, cartão e cenários seguem funcionando.
(function () {
  const L = globalThis.Luzes;
  const E = globalThis.LuzesEletrico;
  const LZ = globalThis.LuzesLuz;
  const $ = (s) => document.querySelector(s);
  const raiz = document.documentElement;
  const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const ESTILO = { claro: "https://tiles.openfreemap.org/styles/positron", escuro: "https://tiles.openfreemap.org/styles/dark" };
  const TERRENO = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
  const estado = {
    passo: 1,
    tema: raiz.dataset.theme === "escuro" ? "escuro" : "claro",
    tresD: true,
    cenario: null,
    religado: false,
    procurando: false,
    acendendoAte: 0,
    onda: null,
    grupos: { at: true, dist: true, chave: true },
    sel: null, // aresta em destaque (o resto esmaece)
  };

  // A cidade atendida, em células de ~380 m (cada uma ligada ao trecho mais próximo).
  // Folga = raio + 4 células: a zona e a suavização terminam antes da borda da grade.
  const PASSO_GRADE = 0.0035, RAIO_GRADE = 0.016;
  const { celulas: CELULAS, grade: GRADE } = LZ.gerarCelulas(L.rede.linhas, { bbox: LZ.bboxDe(L.rede.linhas, RAIO_GRADE + 4 * PASSO_GRADE), passo: PASSO_GRADE, raio: RAIO_GRADE, pontosPorCelula: 0 });
  const regiaoDaLinha = Object.fromEntries(L.rede.linhas.features.map((f) => [f.properties.id, f.properties.regiao]));
  const REGIOES = [...new Set(CELULAS.map((c) => regiaoDaLinha[c.linha]))];
  const CENTRO_REGIAO = Object.fromEntries(REGIOES.map((r) => {
    const cs = CELULAS.filter((c) => regiaoDaLinha[c.linha] === r);
    return [r, [cs.reduce((a, c) => a + c.centro[0], 0) / cs.length, cs.reduce((a, c) => a + c.centro[1], 0) / cs.length]];
  }));
  const BBOX_REGIAO = Object.fromEntries(REGIOES.map((r) => {
    const pts = CELULAS.filter((c) => regiaoDaLinha[c.linha] === r).flatMap((c) => c.poligono[0]);
    return [r, [[Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1]))], [Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))]]];
  }));

  // ---------- números e textos ----------
  const fmt = (n) => n.toLocaleString("pt-BR");
  const mva = (kva) => `${fmt(Math.round(kva / 1000))} MVA`;

  function demandaSemLuz() {
    const c = L.cenarios[estado.cenario];
    if (!c) return 0;
    return estado.religado ? c.depois.demandaKVA : c.semLuz.demandaKVA;
  }

  // ---------- interface (não depende do mapa) ----------
  function renderUI() {
    const c = L.cenarios[estado.cenario];
    const sem = demandaSemLuz();
    const { pctComLuz, casas } = L.impacto(sem, L.base.demandaTotalKVA);

    $("#area").textContent = L.area;
    $("#pct").textContent = `${pctComLuz}%`;
    $("#bateria").style.setProperty("--p", `${pctComLuz}%`);
    $(".cartao").classList.toggle("alerta", sem > 0);
    const nota = $("#nota");
    nota.hidden = true;
    if (estado.religado && sem === 0) {
      $("#casas").textContent = "área religada por outro caminho";
    } else if (estado.religado) {
      $("#casas").textContent = `${L.textoCasas(casas)} ainda sem luz`;
      nota.hidden = false;
      nota.textContent = "Religamento parcial: nenhum caminho aguenta toda a carga.";
    } else {
      $("#casas").textContent = sem === 0 ? "toda a cidade com luz" : `${L.textoCasas(casas)} sem luz`;
    }

    $("#d-fluxo").textContent = mva(L.base.fluxoTotalKVA - sem);
    $("#d-demanda").textContent = mva(L.base.demandaTotalKVA);
    $("#d-gargalos").textContent = fmt(L.base.gargalos);
    $("#d-tempo").textContent = `${estado.procurando || estado.religado ? L.base.tempoRotaMs : L.base.tempoMs} ms`;


    const principal = $("#principal");
    principal.hidden = false;
    principal.disabled = false;
    $("#cenarios").hidden = true;
    $("#dica").hidden = true;
    $("#restaurar").hidden = !c;
    if (estado.passo === 1) principal.textContent = "Derrubar uma linha";
    if (estado.passo === 2) {
      principal.hidden = true;
      $("#cenarios").hidden = false;
      $("#dica").hidden = false;
      $("#dica").textContent = "Clique numa linha ou subestação marcada, ou escolha abaixo";
    }
    if (estado.passo === 3) {
      principal.textContent = estado.procurando ? "Procurando rota…" : "Achar rota alternativa";
      principal.disabled = estado.procurando;
    }
    if (estado.passo === 4) principal.hidden = true;

    const temaBtn = $("#tema");
    const rotulo = estado.tema === "escuro" ? "Mapa claro" : "Mapa escuro";
    temaBtn.setAttribute("aria-label", rotulo);
    temaBtn.title = rotulo;
    temaBtn.setAttribute("aria-pressed", String(estado.tema === "escuro"));
    $("#tres-d").setAttribute("aria-pressed", String(estado.tresD));
    renderRegioes();
    renderSelecionado();
  }

  // Regiões: uma linha por região, problemas primeiro (escala para muitas regiões e cidades).
  function renderRegioes() {
    const mortas = mortasDaLuz(contexto());
    const acesa = CELULAS.map((_, k) => celulaAcesa(k, mortas));
    const lista = LZ.resumoPorRegiao(CELULAS, acesa, L.rede.linhas, contexto().mortas);
    $("#n-regioes").textContent = String(lista.length);
    $("#lista-regioes").replaceChildren(...lista.map((r) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.className = "regiao" + (r.pctComLuz < 100 ? " regiao-alerta" : "");
      b.dataset.regiao = r.regiao;
      const garg = r.gargalos ? `, ${r.gargalos} ${r.gargalos > 1 ? "gargalos" : "gargalo"}` : "";
      b.title = `Região ${r.regiao}: uso médio ${Math.round(r.usoMedio * 100)}%${garg}. Clique para ir até ela.`;
      b.style.setProperty("--p", `${r.pctComLuz}%`);
      b.innerHTML = `<span class="regiao-nome"></span><span class="barra-uso regiao-barra"><span></span></span><span class="regiao-pct">${r.pctComLuz}%</span>`;
      b.querySelector(".regiao-nome").textContent = r.regiao;
      li.append(b);
      return li;
    }));
  }

  // Cartão da aresta em destaque.
  const NOME_TIPO = { at: "Linha de alta tensão", tronco: "Tronco do alimentador", ramal: "Ramal", chave: "Chave de manobra" };
  function situacaoDe(id, ctx) {
    const p = linhaPorId[id].properties;
    if (ctx.c && ctx.c.falha.tipo === "linha" && ctx.c.falha.id === id) return "Caída";
    if (ctx.mortas.has(id)) return "Sem energia";
    if (p.tipo === "chave") return ctx.chavesFechadas.has(id) ? "Fechada: leva energia para a área" : "Aberta: reserva para religar";
    return "Com energia";
  }
  function renderSelecionado() {
    const caixa = $("#selecionado");
    caixa.hidden = !estado.sel;
    if (!estado.sel) return;
    const ctx = contexto();
    const p = linhaPorId[estado.sel].properties;
    const sit = situacaoDe(estado.sel, ctx);
    const viva = sit === "Com energia" || sit.startsWith("Fechada");
    $("#sel-titulo").textContent = `${NOME_TIPO[p.tipo]} ${p.id}`;
    $("#sel-situacao").textContent = sit;
    $("#sel-regiao").textContent = p.regiao || "Transmissão";
    $("#sel-capacidade").textContent = `${fmt(p.capacidadeKVA)} kVA`;
    $("#sel-fluxo").textContent = viva ? `${fmt(p.fluxoKVA)} kVA` : "0 kVA";
    const uso = viva ? Math.round(p.uso * 100) : 0;
    $("#sel-uso").textContent = `uso ${uso}%`;
    const barra = $("#sel-uso-barra");
    barra.style.width = `${uso}%`;
    barra.className = `uso-${viva ? L.classeUso(p.uso) : "morto"}`;
  }

  function selecionar(id) {
    estado.sel = estado.sel === id ? null : id;
    fecharPopup();
    render();
  }

  function render() {
    renderUI();
    renderMapa();
  }

  // ---------- ações ----------
  function irParaDerrubar() {
    limparCenario();
    estado.passo = 2;
    verTudo();
    render();
  }

  let busca = null;
  function limparCenario() {
    clearTimeout(busca);
    estado.cenario = null;
    estado.religado = false;
    estado.procurando = false;
    estado.acendendoAte = 0;
    estado.onda = null;
    estado.sel = null;
    fecharPopup();
  }

  function restaurar() {
    limparCenario();
    estado.passo = 1;
    render();
    verTudo();
  }

  function derrubar(id) {
    limparCenario();
    estado.cenario = id;
    estado.passo = 3;
    render();
    enquadrar();
  }

  function acharRota() {
    estado.procurando = true;
    fecharPopup();
    render();
    enquadrar();
    const fim = () => {
      const antes = contexto(false).mortas;
      estado.procurando = false;
      estado.religado = true;
      estado.passo = 4;
      estado.acendendoAte = performance.now() + 2000;
      iniciarOnda(antes);
      render();
      setTimeout(render, 2050); // o caminho acalma e volta ao nível do uso
    };
    busca = setTimeout(fim, reduzir ? 0 : 1500);
  }

  // As luzes que voltam reacendem em onda, a partir da chave que fechou.
  function iniciarOnda(mortasAntes) {
    const c = L.cenarios[estado.cenario];
    if (reduzir || !c || !c.rota.chaves.length) return;
    const depois = contexto(true).mortas;
    const linhas = new Set([...mortasAntes].filter((id) => !depois.has(id)));
    const alvo = CELULAS.map((cel, k) => [cel, k]).filter(([cel]) => linhas.has(cel.linha));
    const onda = LZ.ondaDe(alvo.map(([cel]) => cel), meio(linhaPorId[c.rota.chaves[0]].geometry.coordinates));
    const valor = new Map(alvo.map(([, k], n) => [k, onda[n]]));
    estado.onda = { inicio: performance.now(), dur: 1800, valor, progresso: 0 };
  }

  // Botões de cenário: caminho alternativo ao clique no mapa.
  for (const [id, c] of Object.entries(L.cenarios)) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "botao sec";
    b.textContent = c.titulo;
    b.addEventListener("click", () => derrubar(id));
    $("#cenarios").append(b);
  }

  $("#principal").addEventListener("click", () => {
    if (estado.passo === 1) irParaDerrubar();
    else if (estado.passo === 3) acharRota();
  });
  $("#restaurar").addEventListener("click", restaurar);
  $("#tema").addEventListener("click", () => {
    estado.tema = estado.tema === "escuro" ? "claro" : "escuro";
    if (estado.tema === "escuro") raiz.dataset.theme = "escuro";
    else delete raiz.dataset.theme;
    renderUI();
    if (mapa) { carregou = false; mapa.setStyle(ESTILO[estado.tema], { diff: false }); setTimeout(() => { if (!carregou) avisoSemMapa(); }, 8000); } // sem diff o style.load dispara e as camadas voltam
  });
  const camadasBtn = $("#camadas");
  camadasBtn.addEventListener("click", () => {
    const aberto = camadasBtn.getAttribute("aria-expanded") === "true";
    camadasBtn.setAttribute("aria-expanded", String(!aberto));
    $("#painel-camadas").hidden = aberto;
  });
  for (const cb of document.querySelectorAll("[data-grupo]")) {
    cb.addEventListener("change", () => { estado.grupos[cb.dataset.grupo] = cb.checked; renderMapa(); });
  }
  $("#btn-legenda").addEventListener("click", () => {
    const btn = $("#btn-legenda");
    const mostrar = btn.getAttribute("aria-pressed") !== "true";
    btn.setAttribute("aria-pressed", String(mostrar));
    $("#legenda").hidden = !mostrar;
  });
  $("#sel-fechar").addEventListener("click", () => estado.sel && selecionar(estado.sel));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && estado.sel) selecionar(estado.sel); });
  $("#lista-regioes").addEventListener("click", (e) => {
    const b = e.target.closest("[data-regiao]");
    if (b && mapa) mapa.fitBounds(BBOX_REGIAO[b.dataset.regiao], { padding: margens(), pitch: 0, bearing: 0, duration: reduzir ? 0 : 900 });
  });
  $("#bussola").addEventListener("click", () => mapa && mapa.easeTo({ bearing: 0, pitch: 0, duration: reduzir ? 0 : 600 }));
  $("#mais").addEventListener("click", () => mapa && mapa.zoomIn());
  $("#menos").addEventListener("click", () => mapa && mapa.zoomOut());
  $("#tres-d").addEventListener("click", () => { estado.tresD = !estado.tresD; renderUI(); aplicar3D(true); });

  // ---------- mapa ----------
  let mapa = null;
  let carregou = false;
  let jaCarregou = false; // erros depois da primeira carga (tile perdido, troca de tema) não são "sem internet"
  let popup = null;
  const css = (n) => getComputedStyle(raiz).getPropertyValue(n).trim();
  const px = (n) => parseFloat(css(n));
  const grupoDe = (tipo) => (tipo === "at" ? "at" : tipo === "chave" ? "chave" : "dist");
  const meio = (coords) => {
    if (coords.length > 2) return coords[Math.floor(coords.length / 2)];
    return [(coords[0][0] + coords[1][0]) / 2, (coords[0][1] + coords[1][1]) / 2];
  };
  const linhaPorId = Object.fromEntries(L.rede.linhas.features.map((f) => [f.properties.id, f]));
  const subPorId = Object.fromEntries(L.rede.subestacoes.features.map((f) => [f.properties.id, f]));
  const fc = (features) => ({ type: "FeatureCollection", features });
  const pt = (coords, properties) => ({ type: "Feature", properties, geometry: { type: "Point", coordinates: coords } });

  function contexto(religado = estado.religado) {
    const c = L.cenarios[estado.cenario];
    const mortas = new Set();
    const chavesFechadas = new Set();
    const acendendo = new Set();
    if (c) {
      for (const id of religado ? c.depois.linhas : c.semLuz.linhas) mortas.add(id);
      if (c.falha.tipo === "linha") mortas.add(c.falha.id);
      if (c.falha.tipo === "subestacao") {
        const [sx, sy] = subPorId[c.falha.id].geometry.coordinates;
        const toca = ([x, y]) => x === sx && y === sy;
        for (const f of L.rede.linhas.features) {
          const g = f.geometry.coordinates;
          const religada = religado && c.rota.linhas.includes(f.properties.id);
          if ((toca(g[0]) || toca(g.at(-1))) && !religada) mortas.add(f.properties.id);
        }
      }
      if (religado) {
        for (const id of c.rota.chaves) chavesFechadas.add(id);
        if (performance.now() < estado.acendendoAte) for (const id of c.rota.linhas) acendendo.add(id);
      }
    }
    return { c, mortas, chavesFechadas, acendendo };
  }

  // Linhas com o estado de cada uma nas propriedades: as camadas só filtram.
  let vivas = [];
  function linhasComEstado(ctx) {
    vivas = [];
    const feats = [];
    for (const f of L.rede.linhas.features) {
      const p = f.properties;
      if (!estado.grupos[grupoDe(p.tipo)]) continue;
      const caida = ctx.c && ctx.c.falha.tipo === "linha" && ctx.c.falha.id === p.id;
      const aberta = p.tipo === "chave" && !ctx.chavesFechadas.has(p.id);
      const int = E.intensidade(p, ctx);
      const sit = caida ? "caida" : ctx.mortas.has(p.id) ? "morta" : aberta ? "aberta" : "viva";
      const classe = L.classeUso(p.uso); // acender muda a intensidade, nunca a cor do uso
      const foco = !estado.sel || estado.sel === p.id;
      feats.push({ type: "Feature", properties: { ...p, sit, int, classe, foco, sel: estado.sel === p.id, gargalo: sit === "viva" && classe === "gargalo" }, geometry: f.geometry });
      if (int > 0) {
        const uso = ctx.acendendo.has(p.id) ? 1 : p.uso;
        vivas.push({ coords: f.geometry.coordinates, int, classe, foco, vel: E.velocidade(uso), semente: p.id.length * 7.3 + p.id.charCodeAt(p.id.length - 1) });
      }
    }
    return feats;
  }

  // ---------- luz da cidade ----------
  function celulaAcesa(k, mortas) {
    if (mortas.has(CELULAS[k].linha)) return false;
    const o = estado.onda;
    if (o && o.valor.has(k)) return o.valor.get(k) <= o.progresso;
    return true;
  }

  let mortasAtuais = new Set();
  // A linha caída continua desenhada como caída, mas depois de religar a área dela já é atendida pela rota.
  function mortasDaLuz(ctx) {
    const m = new Set(ctx.mortas);
    if (estado.religado && ctx.c && ctx.c.falha.tipo === "linha") m.delete(ctx.c.falha.id);
    return m;
  }

  // Uma zona por região (subestação): contorno próprio, pontilhado de casas por dentro
  // e o nome no centro. Onde duas regiões se encostam, os contornos marcam a fronteira.
  // A área sem luz vira uma zona à parte, fria e tracejada.
  const LIMIAR = 0.5;
  function renderLuz() {
    if (!mapa || !mapa.getSource("zonas")) return;
    const { ni, nj } = GRADE;
    const campos = Object.fromEntries(REGIOES.map((r) => [r, new Float32Array(ni * nj)]));
    const off = new Float32Array(ni * nj);
    const somas = Object.fromEntries(REGIOES.map((r) => [r, [0, 0, 0]]));
    CELULAS.forEach((c, k) => {
      const idx = c.j * ni + c.i;
      const r = regiaoDaLinha[c.linha];
      if (celulaAcesa(k, mortasAtuais)) { campos[r][idx] = 1; somas[r][0] += c.centro[0]; somas[r][1] += c.centro[1]; somas[r][2]++; }
      else off[idx] = 1;
    });
    const liso = (f) => LZ.suavizar(LZ.suavizar(f, ni, nj), ni, nj);
    const foco = !estado.sel;
    const poligono = (props) => (coords) => ({ type: "Feature", properties: { ...props, foco }, geometry: { type: "Polygon", coordinates: coords } });
    const zonas = [], contornos = [], nomes = [];
    for (const r of REGIOES) {
      const f = liso(campos[r]);
      zonas.push(...LZ.isobanda(f, GRADE, LIMIAR).map(poligono({ tipo: "luz", regiao: r })));
      contornos.push({ type: "Feature", properties: { tipo: "luz", foco }, geometry: { type: "MultiLineString", coordinates: LZ.isolinha(f, GRADE, LIMIAR) } });
      if (somas[r][2] > 3) nomes.push(pt(CENTRO_REGIAO[r], { nome: `Região ${r}`, foco }));
    }
    const fOff = liso(off);
    zonas.push(...LZ.isobanda(fOff, GRADE, LIMIAR).map(poligono({ tipo: "off" })));
    contornos.push({ type: "Feature", properties: { tipo: "off", foco }, geometry: { type: "MultiLineString", coordinates: LZ.isolinha(fOff, GRADE, LIMIAR) } });
    mapa.getSource("zonas").setData(fc(zonas));
    mapa.getSource("contornos").setData(fc(contornos));
    mapa.getSource("nomes").setData(fc(nomes));
  }

  function renderMapa() {
    if (!mapa || !mapa.getSource("linhas")) return;
    const ctx = contexto();
    mortasAtuais = mortasDaLuz(ctx);
    const feats = linhasComEstado(ctx);
    mapa.getSource("linhas").setData(fc(feats));

    const subs = L.rede.subestacoes.features.map((f) =>
      pt(f.geometry.coordinates, { ...f.properties, foco: !estado.sel, morta: !!(ctx.c && ((ctx.c.falha.tipo === "subestacao" && ctx.c.falha.id === f.properties.id) || (ctx.c.semLuz.subestacoes.includes(f.properties.id) && !estado.religado))) }));
    mapa.getSource("subs").setData(fc(subs));

    const icones = [];
    for (const f of feats) {
      if (f.properties.gargalo) icones.push(pt(meio(f.geometry.coordinates), { icone: "alerta", foco: f.properties.foco }));
      if (f.properties.tipo === "chave" && estado.grupos.chave) {
        const naRota = !!(ctx.c && ctx.c.rota.chaves.includes(f.properties.id));
        icones.push(pt(meio(f.geometry.coordinates), { icone: "chave", naRota, fechada: naRota && estado.religado, foco: f.properties.foco }));
      }
    }
    if (ctx.c) {
      const alvo = ctx.c.falha.tipo === "linha" ? meio(linhaPorId[ctx.c.falha.id].geometry.coordinates) : subPorId[ctx.c.falha.id].geometry.coordinates;
      icones.push(pt(alvo, { icone: "xis", foco: !estado.sel }));
    }
    mapa.getSource("icones").setData(fc(icones));

    const alvos = estado.passo === 2
      ? Object.entries(L.cenarios).map(([id, c]) => pt(
          c.falha.tipo === "linha" ? meio(linhaPorId[c.falha.id].geometry.coordinates) : subPorId[c.falha.id].geometry.coordinates, { cenario: id }))
      : [];
    mapa.getSource("alvos").setData(fc(alvos));
    mapa.setLayoutProperty("escurecer", "visibility", estado.sel ? "visible" : "none");
    renderLuz();
    // Fios na hora da mudança: não depende do próximo quadro (que trava com a aba em segundo plano).
    if (!reduzir) atualizarFios(performance.now());
  }

  function enquadrar() {
    const c = L.cenarios[estado.cenario];
    if (!mapa || !c) return;
    const ids = [...c.semLuz.linhas, ...c.rota.linhas, ...(c.falha.tipo === "linha" ? [c.falha.id] : [])];
    const b = new maplibregl.LngLatBounds();
    for (const id of ids) for (const p of linhaPorId[id].geometry.coordinates) b.extend(p);
    if (c.falha.tipo === "subestacao") b.extend(subPorId[c.falha.id].geometry.coordinates);
    const cam = mapa.cameraForBounds(b, { padding: margens() });
    if (!cam) return;
    // Com 3D, a câmera inclina para a cidade "levantar" na hora da falha.
    mapa.easeTo({ ...cam, zoom: Math.min(cam.zoom, 14), pitch: estado.tresD ? 50 : 0, bearing: 0, duration: reduzir ? 0 : 1100 });
  }

  const TUDO = [[-44.05, -20.01], [-43.86, -19.79]];
  function verTudo() {
    if (mapa) mapa.fitBounds(TUDO, { padding: margens(), pitch: 0, bearing: 0, duration: reduzir ? 0 : 900 });
  }

  function margens() {
    const largo = innerWidth > 760;
    return { top: 48, bottom: largo ? 96 : 48, left: largo ? 360 : 32, right: largo ? 96 : 32 }; // barra lateral (12 + 300 px) e faixa da legenda no pé
  }

  // ---------- 3D: relevo e prédios (neutros) ----------
  function aplicar3D(animar) {
    if (!mapa || !mapa.getLayer("predios")) return;
    const vis = estado.tresD ? "visible" : "none";
    mapa.setLayoutProperty("predios", "visibility", vis);
    mapa.setLayoutProperty("relevo", "visibility", vis);
    mapa.setTerrain(estado.tresD ? { source: "dem", exaggeration: 1.4 } : null);
    mapa.setMaxPitch(estado.tresD ? 75 : 0);
    if (!estado.tresD && animar) mapa.easeTo({ pitch: 0, duration: reduzir ? 0 : 500 });
    atualizarBussola(); // o setMaxPitch endireita o mapa sem disparar evento
  }

  // Ícones e padrões desenhados num canvas com as cores do tema (o setStyle apaga as imagens).
  function imagem(desenhar, t = 28) {
    const s = 2;
    const cv = document.createElement("canvas");
    cv.width = cv.height = t * s;
    const g = cv.getContext("2d");
    g.scale(s, s);
    desenhar(g, t);
    return { data: g.getImageData(0, 0, t * s, t * s), opts: { pixelRatio: s } };
  }

  function addImagens() {
    const fundo = css("--superficie"), tinta = css("--texto"), garg = css("--uso-gargalo");
    // Subestação: torre de transmissão num selo redondo.
    const torre = (g, cor) => {
      g.beginPath(); g.arc(16, 16, 14, 0, Math.PI * 2); g.fillStyle = fundo; g.fill(); g.lineWidth = 2; g.strokeStyle = cor; g.stroke();
      g.lineWidth = 1.6; g.lineJoin = "round"; g.lineCap = "round"; g.beginPath();
      g.moveTo(11.5, 26); g.lineTo(16, 6); g.lineTo(20.5, 26);   // pernas
      g.moveTo(9, 11); g.lineTo(23, 11);                         // braço de cima
      g.moveTo(10.5, 16); g.lineTo(21.5, 16);                    // braço de baixo
      g.moveTo(9, 11); g.lineTo(9, 13); g.moveTo(23, 11); g.lineTo(23, 13);       // isoladores
      g.moveTo(10.5, 16); g.lineTo(10.5, 18); g.moveTo(21.5, 16); g.lineTo(21.5, 18);
      g.moveTo(13.75, 16); g.lineTo(20.5, 26); g.moveTo(18.25, 16); g.lineTo(11.5, 26); // treliça
      g.stroke();
    };
    // Chave de manobra: símbolo de chave dos diagramas elétricos; aberta = lâmina levantada.
    const chave = (g, aberta, corLamina) => {
      g.beginPath(); g.roundRect(3, 3, 22, 22, 5); g.fillStyle = fundo; g.fill(); g.lineWidth = 1.6; g.strokeStyle = tinta; g.stroke();
      g.lineCap = "round"; g.beginPath(); g.moveTo(6, 18); g.lineTo(10, 18); g.moveTo(18, 18); g.lineTo(22, 18); g.stroke();
      g.fillStyle = tinta; for (const x of [10, 18]) { g.beginPath(); g.arc(x, 18, 1.7, 0, Math.PI * 2); g.fill(); }
      g.lineWidth = 2.4; g.strokeStyle = corLamina; g.beginPath(); g.moveTo(10, 18); if (aberta) g.lineTo(17, 10.5); else g.lineTo(18, 18); g.stroke();
    };
    const imgs = {
      sub: [(g) => torre(g, tinta), 32],
      "sub-morta": [(g) => torre(g, css("--apagado")), 32],
      "chave-aberta": [(g) => chave(g, true, tinta)],
      "chave-fechada": [(g) => chave(g, false, css("--energia"))],
      alerta: [(g) => { g.beginPath(); g.moveTo(14, 3); g.lineTo(26, 24); g.lineTo(2, 24); g.closePath(); g.fillStyle = garg; g.fill(); g.lineWidth = 2; g.strokeStyle = fundo; g.stroke(); g.fillStyle = fundo; g.fillRect(12.5, 10, 3, 7); g.fillRect(12.5, 19, 3, 3); }],
      xis: [(g) => { g.beginPath(); g.arc(14, 14, 11, 0, Math.PI * 2); g.fillStyle = fundo; g.fill(); g.lineWidth = 2.5; g.strokeStyle = tinta; g.stroke(); g.beginPath(); g.moveTo(9, 9); g.lineTo(19, 19); g.moveTo(19, 9); g.lineTo(9, 19); g.lineWidth = 3; g.stroke(); }],
    };
    for (const [nome, [d, t]] of Object.entries(imgs)) {
      if (mapa.hasImage(nome)) mapa.removeImage(nome);
      const { data, opts } = imagem(d, t);
      mapa.addImage(nome, data, opts);
    }
  }

  function aplicarCamadas() {
    const cor = { normal: css("--uso-normal"), alerta: css("--uso-alerta"), gargalo: css("--uso-gargalo") };
    const porClasse = ["match", ["get", "classe"], "alerta", cor.alerta, "gargalo", cor.gargalo, cor.normal];
    const W = { at: px("--larg-at"), tronco: px("--larg-tronco"), ramal: px("--larg-ramal"), chave: px("--larg-chave") };
    const larg = (extra) => ["match", ["get", "tipo"], "at", W.at + extra, "tronco", W.tronco + extra, "ramal", W.ramal + extra, W.chave + extra];
    const escuro = estado.tema === "escuro";
    const rotulos = (mapa.getStyle().layers.find((l) => l.type === "symbol") || {}).id;

    addImagens();
    if (!mapa.getSource("dem")) mapa.addSource("dem", { type: "raster-dem", tiles: [TERRENO], tileSize: 256, encoding: "terrarium", maxzoom: 14, attribution: "Relevo: AWS Terrain Tiles" });
    if (!mapa.getSource("dem-relevo")) mapa.addSource("dem-relevo", { type: "raster-dem", tiles: [TERRENO], tileSize: 256, encoding: "terrarium", maxzoom: 14 });
    for (const s of ["linhas", "subs", "icones", "alvos", "fios", "faiscas", "zonas", "contornos", "nomes"]) {
      if (!mapa.getSource(s)) mapa.addSource(s, { type: "geojson", data: fc([]) });
    }

    // Abaixo dos rótulos do mapa base: relevo e prédios.
    const base = [
      { id: "relevo", type: "hillshade", source: "dem-relevo",
        paint: { "hillshade-shadow-color": css("--relevo-sombra"), "hillshade-highlight-color": css("--relevo-luz"), "hillshade-exaggeration": escuro ? 0.5 : 0.35 } },
      { id: "predios", type: "fill-extrusion", source: "openmaptiles", "source-layer": "building", minzoom: 13,
        paint: {
          "fill-extrusion-color": css("--predio"),
          "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 13, 0, 14.5, ["coalesce", ["get", "render_height"], 6]],
          "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
          "fill-extrusion-opacity": 0.92 } },
    ];
    for (const c of base) {
      if (mapa.getLayer(c.id)) mapa.removeLayer(c.id);
      if (mapa.getSource(c.source)) mapa.addLayer(c, rotulos);
    }

    const camadas = [
      // Com uma aresta em destaque, um véu escurece o mapa base e o resto esmaece (FOCO).
      { id: "escurecer", type: "background", layout: { visibility: estado.sel ? "visible" : "none" },
        paint: { "background-color": css("--superficie"), "background-opacity": escuro ? 0.6 : 0.55 } },
      { id: "zona-off", type: "fill", source: "zonas", filter: ["==", ["get", "tipo"], "off"],
        paint: { "fill-color": css("--zona-off"), "fill-opacity": escuro ? 0.45 : 0.25, "fill-antialias": false } },
      { id: "zona-luz", type: "fill", source: "zonas", filter: ["==", ["get", "tipo"], "luz"],
        paint: { "fill-color": css("--zona"), "fill-opacity": escuro ? 0.09 : 0.12, "fill-antialias": false } },
      { id: "zona-borda-brilho", type: "line", source: "contornos", filter: ["==", ["get", "tipo"], "luz"], layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": css("--zona"), "line-width": 6, "line-blur": 4, "line-opacity": escuro ? 0.45 : 0.35 } },
      { id: "zona-borda", type: "line", source: "contornos", filter: ["==", ["get", "tipo"], "luz"], layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": css("--zona-borda"), "line-width": 2 } },
      { id: "zona-off-borda", type: "line", source: "contornos", filter: ["==", ["get", "tipo"], "off"],
        paint: { "line-color": css("--zona-off-borda"), "line-width": 1.8, "line-dasharray": [2, 2] } },
      { id: "casing", type: "line", source: "linhas", filter: ["in", ["get", "sit"], ["literal", ["viva", "morta", "caida"]]], layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": css("--casing"), "line-width": larg(3), "line-opacity": 0.85 } },
      { id: "halo", type: "line", source: "linhas", filter: ["==", ["get", "gargalo"], true], layout: { "line-cap": "round" },
        paint: { "line-color": css("--halo-gargalo"), "line-width": larg(7) } },
      { id: "brilho", type: "line", source: "linhas", filter: [">", ["get", "int"], 0], layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": porClasse, "line-width": ["+", larg(0), ["match", ["get", "int"], 1, 4, 2, 9, 16]],
          "line-blur": ["match", ["get", "int"], 1, 3, 2, 6, 10], "line-opacity": ["match", ["get", "int"], 1, escuro ? 0.42 : 0.26, 2, escuro ? 0.55 : 0.34, escuro ? 0.65 : 0.42] } },
      { id: "abertas", type: "line", source: "linhas", filter: ["==", ["get", "sit"], "aberta"],
        paint: { "line-color": css("--texto-fraco"), "line-width": W.chave, "line-dasharray": [1, 2] } },
      { id: "base", type: "line", source: "linhas", filter: ["==", ["get", "sit"], "viva"], layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": porClasse, "line-width": larg(0) } },
      { id: "mortas", type: "line", source: "linhas", filter: ["==", ["get", "sit"], "morta"], layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": css("--apagado"), "line-width": larg(0) } },
      { id: "caida", type: "line", source: "linhas", filter: ["==", ["get", "sit"], "caida"],
        paint: { "line-color": css("--caiu"), "line-width": larg(1), "line-dasharray": [1.5, 1.2] } },
      { id: "fios-brilho", type: "line", source: "fios", layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": porClasse, "line-width": 6, "line-blur": 4, "line-opacity": escuro ? 0.6 : 0.45 } },
      { id: "fios", type: "line", source: "fios", layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": ["match", ["get", "classe"], "alerta", css("--fio-alerta"), "gargalo", css("--fio-gargalo"), css("--fio-normal")],
          "line-width": ["match", ["get", "int"], 3, 2, 2, 1.8, 1.6], "line-opacity": 1 } },
      { id: "faiscas", type: "line", source: "faiscas", layout: { "line-cap": "round" },
        paint: { "line-color": ["match", ["get", "classe"], "alerta", css("--fio-alerta"), "gargalo", css("--faisca"), css("--fio-normal")], "line-width": 1.8 } },
      { id: "alvos", type: "circle", source: "alvos",
        paint: { "circle-radius": 16, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": css("--texto"), "circle-stroke-width": 2.5, "circle-stroke-opacity": 0.9 } },
      { id: "subs", type: "symbol", source: "subs",
        layout: { "icon-image": ["case", ["get", "morta"], "sub-morta", "sub"], "icon-size": 0.9, "icon-allow-overlap": true, "icon-ignore-placement": true } },
      { id: "chaves", type: "symbol", source: "icones", minzoom: 13, filter: ["all", ["==", ["get", "icone"], "chave"], ["!", ["get", "naRota"]]],
        layout: { "icon-image": "chave-aberta", "icon-size": 0.75, "icon-allow-overlap": true } },
      { id: "chaves-rota", type: "symbol", source: "icones", filter: ["all", ["==", ["get", "icone"], "chave"], ["get", "naRota"]],
        layout: { "icon-image": ["case", ["get", "fechada"], "chave-fechada", "chave-aberta"], "icon-size": 0.9, "icon-allow-overlap": true } },
      { id: "nomes", type: "symbol", source: "nomes",
        layout: { "text-field": ["get", "nome"], "text-font": ["Noto Sans Bold"], "text-size": 13, "text-offset": [0, 1.6], "text-anchor": "top", "text-allow-overlap": false },
        paint: { "text-color": css("--zona-nome"), "text-halo-color": css("--superficie"), "text-halo-width": 1.6, "text-opacity": 0.9 } },
      { id: "selecao", type: "line", source: "linhas", filter: ["==", ["get", "sel"], true], layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": css("--energia"), "line-width": larg(12), "line-blur": 6, "line-opacity": 0.55 } },
      { id: "marcas", type: "symbol", source: "icones", filter: ["in", ["get", "icone"], ["literal", ["alerta", "xis"]]],
        layout: { "icon-image": ["get", "icone"], "icon-size": 0.8, "icon-allow-overlap": true } },
    ];
    for (const c of camadas) {
      if (mapa.getLayer(c.id)) mapa.removeLayer(c.id);
      mapa.addLayer(c);
    }
    // Esmaecimento: cada opacidade é multiplicada por FOCO (1 no foco, 0,06 fora dele).
    for (const c of camadas) {
      for (const prop of OPACIDADES[c.type] || []) {
        if (c.id === "escurecer" || c.id === "selecao") continue;
        mapa.setPaintProperty(c.id, prop, ["*", mapa.getPaintProperty(c.id, prop) ?? 1, FOCO]);
      }
    }
    aplicar3D(false);
    renderMapa();
  }


  // ---------- animação ----------
  // O efeito elétrico é a animação principal: os fios correm no sentido do fluxo,
  // mais rápido quanto maior o uso da linha.
  const FOCO = ["case", ["get", "foco"], 1, 0.06];
  const OPACIDADES = { line: ["line-opacity"], fill: ["fill-opacity"], circle: ["circle-opacity", "circle-stroke-opacity"], symbol: ["icon-opacity", "text-opacity"] };
  const AMP_PX = [0, 3.5, 5, 7];
  const FIOS = [0, 2, 3, 4]; // fios por intensidade
  const FAISCA = [0, 0.08, 0.2, 0.4]; // chance de faísca a cada quadro

  function grausPorPx() { return 360 / (512 * 2 ** mapa.getZoom()); }

  function naTela(coords, b) {
    let w = Infinity, e = -Infinity, s = Infinity, n = -Infinity;
    for (const [x, y] of coords) { w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y); }
    return !(e < b.getWest() || w > b.getEast() || n < b.getSouth() || s > b.getNorth());
  }

  function atualizarFios(t) {
    if (!mapa.getSource("fios")) return;
    const g = grausPorPx();
    const b = mapa.getBounds();
    const fios = [];
    const faiscas = [];
    for (const v of vivas) {
      if (!naTela(v.coords, b)) continue;
      const desloc = (t / 1000) * v.vel;
      for (let s = 0; s < FIOS[v.int]; s++) {
        fios.push({ type: "Feature", properties: { classe: v.classe, int: v.int, foco: v.foco },
          geometry: { type: "LineString", coordinates: E.tremer(v.coords, AMP_PX[v.int] * g, E.passoDoFio(v.coords, g), Math.floor(t / 90) + s * 3.1 + v.semente, desloc + s * 5) } });
      }
      if (Math.random() < FAISCA[v.int]) {
        const i = Math.floor(Math.random() * (v.coords.length - 1));
        const [a, c] = [v.coords[i], v.coords[i + 1]];
        const r = Math.random();
        const o = [a[0] + (c[0] - a[0]) * r, a[1] + (c[1] - a[1]) * r];
        const z = [o];
        for (let k = 1; k <= 3; k++) z.push([o[0] + (Math.random() - 0.5) * 14 * g, o[1] + (Math.random() - 0.5) * 14 * g]);
        faiscas.push({ type: "Feature", properties: { classe: v.classe, foco: v.foco }, geometry: { type: "LineString", coordinates: z } });
      }
    }
    mapa.getSource("fios").setData(fc(fios));
    mapa.getSource("faiscas").setData(fc(faiscas));
  }

  let ultimoFio = 0, ultimaOnda = 0;
  function animar(t) {
    if (mapa && mapa.getLayer("fios") && !reduzir) {
      if (t - ultimoFio > 60) { ultimoFio = t; atualizarFios(t); }
      if (estado.passo === 2 && mapa.getLayer("alvos")) mapa.setPaintProperty("alvos", "circle-radius", 15 + 3 * Math.sin(t / 250));
      if (mapa.getLayer("chaves-rota")) mapa.setPaintProperty("chaves-rota", "icon-opacity", ["*", estado.procurando && Math.floor(t / 250) % 2 === 0 ? 0.15 : 1, FOCO]);
      const o = estado.onda;
      if (o && t - ultimaOnda > 100) {
        ultimaOnda = t;
        o.progresso = Math.min(1, (performance.now() - o.inicio) / o.dur);
        renderLuz();
        if (o.progresso >= 1) { estado.onda = null; renderLuz(); }
      }
    }
    requestAnimationFrame(animar);
  }

  // A rosa dos ventos gira com o mapa e deita com a inclinação.
  function atualizarBussola() {
    $("#rosa").style.transform = `rotateX(${mapa.getPitch()}deg) rotateZ(${-mapa.getBearing()}deg)`;
  }

  // ---------- popups e cliques ----------
  function fecharPopup() { if (popup) { popup.remove(); popup = null; } }
  function abrirPopup(lngLat, html) {
    fecharPopup();
    popup = new maplibregl.Popup({ closeButton: true, maxWidth: "280px" }).setLngLat(lngLat).setHTML(html).addTo(mapa);
  }

  function aoClicar(e) {
    const r = 8;
    const caixa = [[e.point.x - r, e.point.y - r], [e.point.x + r, e.point.y + r]];
    const achados = mapa.queryRenderedFeatures(caixa, { layers: ["alvos", "subs", "base", "mortas", "caida", "abertas"] });
    const alvo = achados.find((f) => f.layer.id === "alvos");
    if (estado.passo === 2) {
      if (alvo) return derrubar(alvo.properties.cenario);
      const id = achados[0] && achados[0].properties.id;
      const c = Object.entries(L.cenarios).find(([, c]) => c.falha.id === id);
      if (c) return derrubar(c[0]);
      if (achados.length) abrirPopup(e.lngLat, "<p>Neste protótipo, experimente as linhas marcadas.</p>");
      return;
    }
    const f = achados.find((f) => f.layer.id !== "alvos");
    if (!f) { if (estado.sel) selecionar(estado.sel); return fecharPopup(); }
    if (f.layer.id === "subs") return abrirPopup(e.lngLat, `<p><strong>${f.properties.nome}</strong></p>`);
    selecionar(f.properties.id);
  }

  function avisoSemMapa() { $("#sem-mapa").hidden = false; }

  function iniciarMapa() {
    if (!globalThis.maplibregl) return avisoSemMapa();
    try {
      mapa = new maplibregl.Map({
        container: "mapa", style: ESTILO[estado.tema], attributionControl: { compact: true },
        bounds: TUDO, fitBoundsOptions: { padding: margens() }, maxPitch: 75,
      });
    } catch (err) {
      return avisoSemMapa();
    }
    mapa.on("style.load", () => { carregou = true; jaCarregou = true; $("#sem-mapa").hidden = true; aplicarCamadas(); });
    // O MapLibre abre a atribuição sozinho e fecha no primeiro arrasto; começa fechada para não pular.
    mapa.once("load", () => {
      const d = document.querySelector(".maplibregl-ctrl-attrib");
      if (d) { d.removeAttribute("open"); d.classList.remove("maplibregl-compact-show"); }
    });
    // Depois de carregado, um tile perdido não é "sem internet": o mapa segue funcionando.
    mapa.on("error", () => { if (!jaCarregou) avisoSemMapa(); });
    setTimeout(() => { if (!carregou) avisoSemMapa(); }, 10000);
    mapa.on("click", aoClicar);
    for (const id of ["base", "mortas", "subs", "alvos"]) {
      mapa.on("mouseenter", id, () => { mapa.getCanvas().style.cursor = "pointer"; });
      mapa.on("mouseleave", id, () => { mapa.getCanvas().style.cursor = ""; });
    }
    mapa.on("move", atualizarBussola);
  }

  renderUI();
  iniciarMapa();
  requestAnimationFrame(animar); // anima os fios das linhas quando o mapa carregar
})();
