// Confere se um JSON segue o contrato do 06-api. Devolve a lista de erros (vazia = válido).

const TIPOS = new Set(["trecho", "chave", "linha_at"]);

const ehObjeto = (x: unknown): x is Record<string, any> => typeof x === "object" && x !== null && !Array.isArray(x);
const ehNumero = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const ehTexto = (x: unknown): x is string => typeof x === "string" && x.length > 0;
const listaDeTextos = (x: unknown) => Array.isArray(x) && x.every(ehTexto);

function coordenada(lat: unknown, lon: unknown) {
  return ehNumero(lat) && ehNumero(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

export function validarRede(json: unknown): string[] {
  if (!ehObjeto(json)) return ["a rede não é um objeto JSON"];
  const erros: string[] = [];
  if (!ehTexto(json.area)) erros.push("falta `area`");
  for (const chave of ["subestacoes", "pontos", "arestas"]) {
    if (!Array.isArray(json[chave])) erros.push(`falta a lista \`${chave}\``);
  }
  if (!ehObjeto(json.geometriaAT)) erros.push("falta `geometriaAT`");
  if (erros.length) return erros;

  const vistos = new Set<string>();
  const registrar = (id: unknown, onde: string) => {
    if (!ehTexto(id)) return erros.push(`${onde}: id inválido`);
    if (vistos.has(id)) erros.push(`${onde}: id repetido ${id}`);
    vistos.add(id);
  };

  json.subestacoes.forEach((s: unknown, i: number) => {
    const onde = `subestacoes[${i}]`;
    if (!Array.isArray(s) || s.length !== 5) return erros.push(`${onde}: esperava [id, nome, lat, lon, capacidade]`);
    registrar(s[0], onde);
    if (typeof s[1] !== "string") erros.push(`${onde}: nome inválido`);
    if (!coordenada(s[2], s[3])) erros.push(`${onde}: coordenada inválida`);
    if (!ehNumero(s[4]) || s[4] < 0) erros.push(`${onde}: capacidade inválida`);
  });
  json.pontos.forEach((p: unknown, i: number) => {
    const onde = `pontos[${i}]`;
    if (!Array.isArray(p) || p.length !== 4) return erros.push(`${onde}: esperava [id, lat, lon, demanda]`);
    registrar(p[0], onde);
    if (!coordenada(p[1], p[2])) erros.push(`${onde}: coordenada inválida`);
    if (!ehNumero(p[3]) || p[3] < 0) erros.push(`${onde}: demanda inválida`);
  });

  const vertices = new Set(vistos);
  json.arestas.forEach((a: unknown, i: number) => {
    const onde = `arestas[${i}]`;
    if (!Array.isArray(a) || a.length !== 5) return erros.push(`${onde}: esperava [id, de, para, tipo, capacidade]`);
    registrar(a[0], onde);
    for (const ponta of [a[1], a[2]]) {
      if (!vertices.has(ponta)) erros.push(`${onde}: ponta ${ponta} não existe`);
    }
    if (!TIPOS.has(a[3])) erros.push(`${onde}: tipo ${a[3]} desconhecido`);
    if (!ehNumero(a[4]) || a[4] < 0) erros.push(`${onde}: capacidade inválida`);
  });

  for (const [id, coords] of Object.entries(json.geometriaAT)) {
    if (!Array.isArray(coords) || coords.length < 2 || !coords.every((c) => Array.isArray(c) && coordenada(c[0], c[1]))) {
      erros.push(`geometriaAT ${id}: precisa de 2 ou mais pares [lat, lon]`);
    }
  }
  return erros;
}

export function validarAnalise(json: unknown): string[] {
  if (!ehObjeto(json)) return ["a análise não é um objeto JSON"];
  const erros: string[] = [];
  for (const chave of ["fluxoTotal", "demandaTotal", "tempoMs"]) {
    if (!ehNumero(json[chave])) erros.push(`falta o número \`${chave}\``);
  }
  if (!Array.isArray(json.fluxo)) erros.push("falta a lista `fluxo`");
  else json.fluxo.forEach((f: unknown, i: number) => {
    if (!Array.isArray(f) || f.length !== 3 || !ehTexto(f[0])) return erros.push(`fluxo[${i}]: esperava [id, fluxo, uso]`);
    if (!ehNumero(f[1]) || f[1] === 0) erros.push(`fluxo[${i}]: fluxo precisa ser diferente de 0 (o sinal dá o sentido)`);
    if (!ehNumero(f[2]) || f[2] < 0 || f[2] > 1) erros.push(`fluxo[${i}]: uso fora de 0 a 1`);
  });
  if (!listaDeTextos(json.gargalos)) erros.push("falta a lista `gargalos`");
  if (!ehObjeto(json.semEnergia) || !listaDeTextos(json.semEnergia.pontos) || !ehNumero(json.semEnergia.demanda)) {
    erros.push("`semEnergia` precisa de {pontos, demanda}");
  }
  return erros;
}

export function validarRota(json: unknown): string[] {
  if (!ehObjeto(json)) return ["a rota não é um objeto JSON"];
  const erros: string[] = [];
  if (!listaDeTextos(json.chavesParaFechar)) erros.push("falta a lista `chavesParaFechar`");
  if (!listaDeTextos(json.caminho)) erros.push("falta a lista `caminho`");
  if (!ehObjeto(json.religado) || !ehNumero(json.religado.pontos) || !ehNumero(json.religado.demanda)) {
    erros.push("`religado` precisa de {pontos, demanda}");
  }
  if (typeof json.parcial !== "boolean") erros.push("`parcial` precisa ser true ou false");
  if (!ehNumero(json.tempoMs)) erros.push("falta o número `tempoMs`");
  return erros;
}

export function validarCriticos(json: unknown): string[] {
  if (!ehObjeto(json)) return ["os críticos não são um objeto JSON"];
  const erros: string[] = [];
  if (!listaDeTextos(json.pontes)) erros.push("falta a lista `pontes`");
  if (!listaDeTextos(json.articulacoes)) erros.push("falta a lista `articulacoes`");
  if (!ehNumero(json.tempoMs)) erros.push("falta o número `tempoMs`");
  return erros;
}

export function validarSaude(json: unknown): string[] {
  if (!ehObjeto(json) || typeof json.ok !== "boolean") return ["`saude` precisa de {ok: true|false}"];
  return [];
}
