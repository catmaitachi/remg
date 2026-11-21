// Gera src/mocks/rede.bh.json a partir de data/bh/*.csv (T06), no formato do 06-api.
// Só a geometria é real. Capacidade e demanda são valores fixos e obviamente falsos (design da T05, opção A):
// quem calcula de verdade é o núcleo.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { gerarAnalise } from "./analise_sintetica.mjs";

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
