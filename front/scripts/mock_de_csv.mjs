// Gera src/mocks/rede.bh.json a partir de data/bh/*.csv (T06), no formato do 06-api.
// Só a geometria é real. Capacidade e demanda são valores fixos e obviamente falsos (design da T05, opção A):
// quem calcula de verdade é o núcleo.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const CAPACIDADE_KVA = 1000;
const DEMANDA_KVA = 1;
const AREA = "Belo Horizonte (dados de exemplo)";
const seis = (x) => Number(Number(x).toFixed(6));

/** CSV com cabeçalho → lista de objetos. Aceita campo entre aspas com vírgula e "" escapado. */
export function lerCsv(texto) {
  const linhas = [];
  let campo = "", linha = [], aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ",") { linha.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      linha.push(campo); campo = "";
      if (linha.some((x) => x !== "")) linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  if (campo !== "" || linha.length) { linha.push(campo); linhas.push(linha); }
  const [cabecalho, ...resto] = linhas;
  return resto.map((l) => Object.fromEntries(cabecalho.map((nome, i) => [nome, l[i] ?? ""])));
}

/** Textos dos 4 CSV → Rede do contrato. */
export function gerarRede({ pontos, trechos, subestacoes, linhas }) {
  return {
    area: AREA,
    subestacoes: lerCsv(subestacoes).map((s) => [`s:${s.id_osm}`, s.nome, seis(s.lat), seis(s.lon), CAPACIDADE_KVA]),
    pontos: lerCsv(pontos).map((p) => [`p:${p.id_osm}`, seis(p.lat), seis(p.lon), DEMANDA_KVA]),
    arestas: lerCsv(trechos).map((t) => [`t:${t.id}`, `p:${t.de}`, `p:${t.para}`, "trecho", CAPACIDADE_KVA]),
    // Linha AT só como desenho: ligá-la às subestações é decisão do núcleo (03-modelagem).
    geometriaAT: Object.fromEntries(lerCsv(linhas).map((l) => [
      `at:${l.id_osm}`, l.coords.split(";").map((par) => par.split(" ").map(seis)),
    ])),
  };
}

/**
 * Análise sintética de "fluxo coerente" (design da T18, abordagem B): cada subestação liga ao ponto mais
 * próximo, uma BFS com várias fontes monta a árvore sobre os trechos e o fluxo de cada aresta é a demanda
 * a jusante. Não limita pela capacidade (isso é o Dinic do núcleo): passou dela, vira gargalo com uso 1.
 */
export function gerarAnalise(rede, agora = () => performance.now()) {
  const inicio = agora();
  const pos = new Map(rede.pontos.map(([id, lat, lon]) => [id, [lat, lon]]));
  const demanda = new Map(rede.pontos.map(([id, , , d]) => [id, d]));
  const vizinhos = new Map(rede.pontos.map(([id]) => [id, []]));
  const capacidade = new Map();
  for (const [id, de, para, tipo, cap] of rede.arestas) {
    if (tipo !== "trecho") continue; // chaves abertas no pedido vazio; linha AT não liga pontos
    capacidade.set(id, cap);
    vizinhos.get(de)?.push([para, id]);
    vizinhos.get(para)?.push([de, id]);
  }

  // pai: ponto → [ponto de cima, aresta], ou null na raiz ligada à subestação
  const pai = new Map();
  const fila = [];
  for (const [, , lat, lon] of rede.subestacoes) {
    const cosLat = Math.cos((lat * Math.PI) / 180);
    let melhor = null, menor = Infinity;
    for (const [id, [plat, plon]] of pos) {
      const d = (plat - lat) ** 2 + ((plon - lon) * cosLat) ** 2;
      if (d < menor) { menor = d; melhor = id; }
    }
    if (melhor !== null && !pai.has(melhor)) { pai.set(melhor, null); fila.push(melhor); }
  }
  for (let i = 0; i < fila.length; i++) { // índice em vez de shift(): BH tem 35 mil pontos
    for (const [v, aresta] of vizinhos.get(fila[i])) {
      if (!pai.has(v)) { pai.set(v, [fila[i], aresta]); fila.push(v); }
    }
  }

  const abaixo = new Map(fila.map((id) => [id, demanda.get(id)]));
  const fluxo = [];
  for (let i = fila.length - 1; i >= 0; i--) {
    const de = pai.get(fila[i]);
    if (!de) continue;
    const f = abaixo.get(fila[i]);
    abaixo.set(de[0], abaixo.get(de[0]) + f);
    if (f > 0) fluxo.push([de[1], f, Math.round(Math.min(1, f / capacidade.get(de[1])) * 1000) / 1000]);
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ler = (nome) => readFileSync(new URL(`../../data/bh/${nome}.csv`, import.meta.url), "utf-8");
  const rede = gerarRede({ pontos: ler("pontos"), trechos: ler("trechos_rua"), subestacoes: ler("subestacoes"), linhas: ler("linhas_at") });
  const destino = new URL("../src/mocks/rede.bh.json", import.meta.url);
  writeFileSync(destino, JSON.stringify(rede) + "\n");
  console.log(`🟢 ${fileURLToPath(destino)}: ${rede.pontos.length} pontos, ${rede.arestas.length} trechos, ` +
    `${rede.subestacoes.length} subestações, ${Object.keys(rede.geometriaAT).length} linhas AT`);

  const analise = gerarAnalise(rede);
  const destinoAnalise = new URL("../src/mocks/analise.bh.json", import.meta.url);
  writeFileSync(destinoAnalise, JSON.stringify(analise) + "\n");
  console.log(`🟢 ${fileURLToPath(destinoAnalise)}: ${rede.pontos.length - analise.semEnergia.pontos.length} pontos alcançados, ` +
    `${analise.semEnergia.pontos.length} sem alcance, ${analise.fluxo.length} trechos com fluxo, ${analise.gargalos.length} gargalos`);
}
