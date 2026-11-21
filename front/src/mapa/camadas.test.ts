import { expect, test } from "vitest";
import analiseMock from "../mocks/analise.json";
import pequena from "../mocks/rede.pequena.json";
import type { Analise, Rede } from "../api/tipos";
import { PALETA, rgb } from "./cores";
import { VISIVEIS_INICIAL, estiloDoMapa, montarCamadas, prepararDados, type Quadro, type Visiveis } from "./camadas";

const rede = pequena as unknown as Rede;
// Cópia local: o mock não tem nenhum trecho na faixa de alerta.
const analise: Analise = {
  ...(analiseMock as unknown as Analise),
  fluxo: (analiseMock as unknown as Analise).fluxo.map(([id, f, u]) => [id, f, id === "t:1" ? 0.8 : u]),
};
const dados = prepararDados(rede, analise);
// any: o teste lê props específicas de cada tipo de camada.
const porId = (d = dados, visiveis: Visiveis = VISIVEIS_INICIAL, tema: "claro" | "escuro" = "claro"): Record<string, any> =>
  Object.fromEntries(montarCamadas(d, visiveis, tema).map((c) => [c.id, c]));
const corDoTrecho = (c: Record<string, any>, id: string) =>
  c.trechos.props.getColor(c.trechos.props.data.find((t: { id: string }) => t.id === id));

test("estilo do mapa segue o tema", () => {
  expect(estiloDoMapa(true)).toMatch(/\/dark$/);
  expect(estiloDoMapa(false)).toMatch(/\/positron$/);
});

test("oito camadas, com brilho e halo por baixo dos trechos", () => {
  expect(montarCamadas(dados, VISIVEIS_INICIAL, "claro").map((c) => c.id)).toEqual([
    "brilho", "halo-gargalos", "trechos", "linhas-at", "chaves", "subestacoes", "gargalos-alerta", "gargalos-alerta-texto",
  ]);
  const c = porId();
  expect(c.trechos.props.data).toHaveLength(rede.arestas.filter((a) => a[3] !== "linha_at").length);
  expect(c["linhas-at"].props.data).toHaveLength(Object.keys(rede.geometriaAT).length);
  expect(c.subestacoes.props.data).toHaveLength(rede.subestacoes.length);
  expect(c.chaves.props.data).toHaveLength(rede.arestas.filter((a) => a[3] === "chave").length);
});

test("cada trecho tem a cor da faixa do seu uso", () => {
  const c = porId();
  expect(corDoTrecho(c, "t:1")).toEqual(rgb(PALETA.claro.alerta));
  expect(corDoTrecho(c, "t:3")).toEqual(rgb(PALETA.claro.gargalo));
  expect(corDoTrecho(c, "t:2")).toEqual(rgb(PALETA.claro.normal));
  expect(corDoTrecho(c, "t:4")).toEqual(rgb(PALETA.claro.semFluxo));
});

test("gargalos ganham halo e alerta", () => {
  const c = porId();
  expect(c["halo-gargalos"].props.data).toHaveLength(analise.gargalos.length);
  expect(c["gargalos-alerta"].props.data).toHaveLength(analise.gargalos.length);
  expect(c["gargalos-alerta-texto"].props.data).toHaveLength(analise.gargalos.length);
});

test("sem análise: tudo sem fluxo e nenhum gargalo", () => {
  const c = porId(prepararDados(rede, null));
  for (const t of c.trechos.props.data) expect(c.trechos.props.getColor(t)).toEqual(rgb(PALETA.claro.semFluxo));
  expect(c["halo-gargalos"].props.data).toHaveLength(0);
  expect(c["gargalos-alerta"].props.data).toHaveLength(0);
});

test("id da análise que não está na rede é ignorado", () => {
  const estranha: Analise = { ...analise, fluxo: [...analise.fluxo, ["t:nao-existe", 5, 0.95]], gargalos: ["t:nao-existe", "t:3"] };
  const c = porId(prepararDados(rede, estranha));
  expect(c["halo-gargalos"].props.data).toHaveLength(1);
  expect(c.trechos.props.data).toHaveLength(rede.arestas.filter((a) => a[3] !== "linha_at").length);
});

test("desligar distribuição só esconde, sem remontar os dados", () => {
  const ligado = porId();
  const desligado = porId(dados, { ...VISIVEIS_INICIAL, distribuicao: false });
  for (const id of ["brilho", "trechos", "halo-gargalos", "gargalos-alerta", "gargalos-alerta-texto"]) {
    expect(desligado[id].props.visible, id).toBe(false);
    expect(desligado[id].props.data, id).toBe(ligado[id].props.data);
  }
  expect(desligado["linhas-at"].props.visible).toBe(true);
});

test("cada switch controla a sua camada", () => {
  const c = porId(dados, { at: false, distribuicao: true, subestacoes: false, chaves: false });
  expect(c["linhas-at"].props.visible).toBe(false);
  expect(c.subestacoes.props.visible).toBe(false);
  expect(c.chaves.props.visible).toBe(false);
});

test("tema escuro troca as cores e os gatilhos de cor", () => {
  const claro = porId(), escuro = porId(dados, VISIVEIS_INICIAL, "escuro");
  expect(corDoTrecho(escuro, "t:3")).toEqual(rgb(PALETA.escuro.gargalo));
  expect(escuro.trechos.props.updateTriggers.getColor).not.toEqual(claro.trechos.props.updateTriggers.getColor);
});

test("larguras em pixels: 2 no trecho, 6 na alta tensão", () => {
  const c = porId();
  expect(c.trechos.props.widthUnits).toBe("pixels");
  expect(c["linhas-at"].props.widthUnits).toBe("pixels");
  expect(c.trechos.props.getWidth).toBe(2);
  expect(c["linhas-at"].props.getWidth).toBe(6);
});

test("acessores entregam [lon, lat] iguais aos do mock", () => {
  const c = porId();
  const [id, de, para] = rede.arestas[0];
  const ponto = (pid: string) => rede.pontos.find((p) => p[0] === pid) ?? rede.subestacoes.find((s) => s[0] === pid)!;
  const lonLat = (pid: string) => { const p = ponto(pid); return [p[pid.startsWith("s:") ? 3 : 2], p[pid.startsWith("s:") ? 2 : 1]]; };

  const trecho = c.trechos.props.data.find((t: { id: string }) => t.id === id);
  expect(c.trechos.props.getPath(trecho)).toEqual([lonLat(de), lonLat(para)]);
  const at = Object.values(rede.geometriaAT)[0];
  expect(c["linhas-at"].props.getPath(c["linhas-at"].props.data[0])).toEqual(at.map(([lat, lon]) => [lon, lat]));
  const s = rede.subestacoes[0];
  expect(c.subestacoes.props.getPosition(c.subestacoes.props.data[0])).toEqual([s[3], s[2]]);
});

test("brilho suave só nas linhas com fluxo, mais forte e largo conforme o uso", () => {
  for (const tema of ["claro", "escuro"] as const) {
    const c = porId(dados, VISIVEIS_INICIAL, tema);
    const b = c.brilho.props;
    expect(b.data.every((t: { faixa: string | null }) => t.faixa !== null)).toBe(true);
    expect(b.data).toHaveLength(analise.fluxo.filter(([id]) => rede.arestas.some((a) => a[0] === id)).length);
    const de = (id: string) => b.data.find((t: { id: string }) => t.id === id);
    const [normal, alerta, gargalo] = ["t:2", "t:1", "t:3"].map(de);
    // cor da faixa, com transparência; suave: nem o gargalo passa de 40% de opacidade
    expect(b.getColor(gargalo).slice(0, 3)).toEqual(rgb(PALETA[tema].gargalo));
    const alfa = [normal, alerta, gargalo].map((t) => b.getColor(t)[3]);
    expect(alfa[0]).toBeLessThan(alfa[1]);
    expect(alfa[1]).toBeLessThan(alfa[2]);
    expect(alfa[2]).toBeLessThanOrEqual(0.4 * 255);
    const largura = [normal, alerta, gargalo].map((t) => b.getWidth(t));
    expect(largura[0]).toBeLessThan(largura[1]);
    expect(largura[1]).toBeLessThan(largura[2]);
    expect(b.updateTriggers.getColor).toBe(tema);
  }
});

test("comFluxo carrega o sentido", () => {
  expect(dados.comFluxo.every((t) => t.sentido !== undefined)).toBe(true);
  expect(dados.comFluxo.find((t) => t.id === "t:3")!.sentido!.positivo).toBe(false);
});

const Q: Quadro = { tempo: 12.5, zoom: 12, limites: [-44.1, -20.1, -43.8, -19.7] };
const comQuadro = (tema: "claro" | "escuro" = "claro", d = dados): Record<string, any> =>
  Object.fromEntries(montarCamadas(d, VISIVEIS_INICIAL, tema, Q).map((c) => [c.id, c]));

test("com quadro, ondas logo acima dos trechos", () => {
  const ids = montarCamadas(dados, VISIVEIS_INICIAL, "claro", Q).map((c) => c.id);
  expect(ids[ids.indexOf("trechos") + 1]).toBe("ondas");
  const o = comQuadro().ondas.props;
  expect(o.data).toBe(dados.comFluxo);
  expect(o.tempo).toBe(Q.tempo);
  expect(o.getOnda(dados.comFluxo.find((t) => t.id === "t:3"))[2]).toBe(-1);
});

test("ondas: mistura aditiva só no escuro", () => {
  const escuro = comQuadro("escuro").ondas.props, claro = comQuadro("claro").ondas.props;
  expect(escuro.parameters.blendColorDstFactor).toBe("one");
  expect(escuro.aditivo).toBe(true);
  expect(claro.parameters?.blendColorDstFactor).toBeUndefined();
  expect(claro.aditivo).toBe(false);
  expect(escuro.updateTriggers.getColor).not.toEqual(claro.updateTriggers.getColor);
});

test("sem análise não há ondas", () => {
  expect(comQuadro("claro", prepararDados(rede, null)).ondas.props.data).toHaveLength(0);
});

test("com quadro de perto, raio e faíscas acima das ondas", () => {
  const perto: Quadro = { tempo: 1, zoom: 15, limites: [-180, -85, 180, 85] };
  const ids = montarCamadas(dados, VISIVEIS_INICIAL, "escuro", perto).map((c) => c.id);
  const i = ids.indexOf("trechos");
  expect(ids.slice(i, i + 5)).toEqual(["trechos", "ondas", "raio", "faiscas", "linhas-at"]);
});

test("com animação, trecho com fluxo fica apagado para a onda aparecer", () => {
  const parado = porId().trechos.props, animado = comQuadro().trechos.props;
  const t2 = dados.trechos.find((t) => t.id === "t:2"), t4 = dados.trechos.find((t) => t.id === "t:4");
  expect(parado.getColor(t2)[3] ?? 255).toBe(255);
  expect(animado.getColor(t2)[3]).toBeLessThan(128);
  // sem fluxo também apaga (50%), senão a rede parada chama mais atenção que a que conduz
  expect(animado.getColor(t4)[3]).toBeGreaterThan(animado.getColor(t2)[3]);
  expect(animado.getColor(t4)[3]).toBeLessThan(255);
  expect(animado.updateTriggers.getColor).not.toEqual(parado.updateTriggers.getColor);
});

test("com animação, o brilho parado fica só em alerta e gargalo", () => {
  const animado = comQuadro().brilho.props.data;
  expect(animado.length).toBeGreaterThan(0);
  expect(animado.every((t: { faixa: string }) => t.faixa === "alerta" || t.faixa === "gargalo")).toBe(true);
  expect(comQuadro().brilho.props.data).toBe(animado); // mesma referência: não remonta a cada quadro
  expect(porId().brilho.props.data).toBe(dados.comFluxo);
});

test("intensidade: mais forte = onda com mais ganho, mais larga, raio mais opaco", () => {
  const perto: Quadro = { tempo: 1, zoom: 15, limites: [-180, -85, 180, 85] };
  const em = (intensidade: "suave" | "media" | "forte") =>
    Object.fromEntries(montarCamadas(dados, VISIVEIS_INICIAL, "escuro", perto, { intensidade }).map((c) => [c.id, c])) as Record<string, any>;
  const [s, m, f] = [em("suave"), em("media"), em("forte")];
  expect(s.ondas.props.ganho).toBeLessThan(m.ondas.props.ganho);
  expect(m.ondas.props.ganho).toBeLessThan(f.ondas.props.ganho);
  expect(s.ondas.props.getWidth).toBeLessThan(f.ondas.props.getWidth);
  const alfa = (c: Record<string, any>) => c.raio.props.getColor(c.raio.props.data[0])[3];
  expect(alfa(s)).toBeLessThan(alfa(f));
  // padrão = média
  expect(comQuadro().ondas.props.ganho).toBe(m.ondas.props.ganho);
});

test("marcadores de gargalo podem vir espalhados de fora (zoom atual)", () => {
  const alertas = [{ id: "x", posicao: [-43.9, -19.9] as [number, number] }];
  const c = Object.fromEntries(montarCamadas(dados, VISIVEIS_INICIAL, "claro", null, { alertas }).map((l) => [l.id, l])) as Record<string, any>;
  expect(c["gargalos-alerta"].props.data).toBe(alertas);
  expect(c["gargalos-alerta-texto"].props.data).toBe(alertas);
});
