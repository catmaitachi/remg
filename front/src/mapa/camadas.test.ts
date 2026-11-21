import { expect, test } from "vitest";
import analiseMock from "../mocks/analise.json";
import pequena from "../mocks/rede.pequena.json";
import type { Analise, Rede } from "../api/tipos";
import { PALETA, rgb } from "./cores";
import { VISIVEIS_INICIAL, estiloDoMapa, montarCamadas, prepararDados, type Visiveis } from "./camadas";

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

test("sete camadas, com o halo por baixo dos trechos", () => {
  expect(montarCamadas(dados, VISIVEIS_INICIAL, "claro").map((c) => c.id)).toEqual([
    "halo-gargalos", "trechos", "linhas-at", "chaves", "subestacoes", "gargalos-alerta", "gargalos-alerta-texto",
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
  for (const id of ["trechos", "halo-gargalos", "gargalos-alerta", "gargalos-alerta-texto"]) {
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
