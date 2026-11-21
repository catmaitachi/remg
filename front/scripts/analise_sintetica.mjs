// Análise sintética do mock (design da T18, abordagem B; falhas na T20). Sem node:*: o script mock:bh e o
// front no modo mock usam este mesmo código.

/**
 * Fluxo coerente: cada subestação liga ao ponto mais próximo, uma BFS com várias fontes monta a árvore sobre
 * os trechos e o fluxo de cada aresta é a demanda a jusante. Não limita pela capacidade (isso é o Dinic do
 * núcleo): passou dela, vira gargalo com uso 1.
 *
 * Com falhas, a rede ligada é a árvore do pedido vazio (árvore fixa, design da T20): a distribuição opera
 * radial, então os trechos fora da árvore são como chaves abertas e não religam ninguém por outro caminho.
 */
export function gerarAnalise(rede, pedido = {}, agora = () => performance.now()) {
  const inicio = agora();
  const caidos = new Set(pedido.falhas?.arestas ?? []);
  const subCaidas = new Set(pedido.falhas?.subestacoes ?? []);
  const fechadas = new Set(pedido.chavesFechadas ?? []);

  const pos = new Map(rede.pontos.map(([id, lat, lon]) => [id, [lat, lon]]));
  const demanda = new Map(rede.pontos.map(([id, , , d]) => [id, d]));
  const capacidade = new Map();
  const pontaDe = new Map(); // sinal do fluxo: + quando a energia vai de `de` para `para`
  const ligacoes = []; // [de, para, id, tipo]
  for (const [id, de, para, tipo, cap] of rede.arestas) {
    // linha AT não liga pontos; aresta até a subestação também não: ela entra pela raiz mais próxima
    if ((tipo !== "trecho" && tipo !== "chave") || !pos.has(de) || !pos.has(para)) continue;
    capacidade.set(id, cap);
    pontaDe.set(id, de);
    ligacoes.push([de, para, id, tipo]);
  }

  const raizes = rede.subestacoes.map(([id, , lat, lon]) => {
    const cosLat = Math.cos((lat * Math.PI) / 180);
    let melhor = null, menor = Infinity;
    for (const [pid, [plat, plon]] of pos) {
      const d = (plat - lat) ** 2 + ((plon - lon) * cosLat) ** 2;
      if (d < menor) { menor = d; melhor = pid; }
    }
    return [id, melhor];
  });

  // pai: ponto → [ponto de cima, aresta], ou null na raiz ligada à subestação
  function bfs(raizesDePe, passa) {
    const vizinhos = new Map(rede.pontos.map(([id]) => [id, []]));
    for (const [de, para, id, tipo] of ligacoes) {
      if (!passa(id, tipo)) continue;
      vizinhos.get(de).push([para, id]);
      vizinhos.get(para).push([de, id]);
    }
    const pai = new Map();
    const fila = [];
    for (const r of raizesDePe) if (r !== null && !pai.has(r)) { pai.set(r, null); fila.push(r); }
    for (let i = 0; i < fila.length; i++) { // índice em vez de shift(): BH tem 35 mil pontos
      for (const [v, aresta] of vizinhos.get(fila[i])) {
        if (!pai.has(v)) { pai.set(v, [fila[i], aresta]); fila.push(v); }
      }
    }
    return { pai, fila };
  }

  // 1ª passada: a árvore do pedido vazio (chaves abertas)
  const base = bfs(raizes.map(([, r]) => r), (_, tipo) => tipo === "trecho");
  const arvore = new Set([...base.pai.values()].filter(Boolean).map(([, aresta]) => aresta));
  // 2ª passada: só a árvore de pé, mais as chaves fechadas; com o pedido vazio, visita na mesma ordem
  const { pai, fila } = bfs(
    raizes.filter(([id]) => !subCaidas.has(id)).map(([, r]) => r),
    (id, tipo) => !caidos.has(id) && (tipo === "chave" ? fechadas.has(id) : arvore.has(id)),
  );

  const abaixo = new Map(fila.map((id) => [id, demanda.get(id)]));
  const fluxo = [];
  for (let i = fila.length - 1; i >= 0; i--) {
    const de = pai.get(fila[i]);
    if (!de) continue;
    const f = abaixo.get(fila[i]);
    abaixo.set(de[0], abaixo.get(de[0]) + f);
    if (f > 0) fluxo.push([de[1], pontaDe.get(de[1]) === de[0] ? f : -f, Math.round(Math.min(1, f / capacidade.get(de[1])) * 1000) / 1000]);
  }

  const semAlcance = rede.pontos.filter(([id]) => !pai.has(id)).map(([id]) => id);
  const soma = (ids) => ids.reduce((s, id) => s + demanda.get(id), 0);
  return {
    fluxoTotal: soma(fila),
    demandaTotal: soma(rede.pontos.map(([id]) => id)),
    fluxo,
    gargalos: fluxo.filter(([, , uso]) => uso >= 0.9).map(([id]) => id),
    semEnergia: { pontos: semAlcance, demanda: soma(semAlcance) },
    tempoMs: Math.round(agora() - inicio),
  };
}
