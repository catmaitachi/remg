import { LayerExtension, type Accessor, type Layer, type UpdateParameters } from "@deck.gl/core";
import type { Faixa } from "./cores";

// Ondas do fluxo (T19). Índices dos arrays: 0 normal · 1 alerta · 2 gargalo.
// A fase é o tempo de chegada desde a origem: com a fase pela distância, a onda se partia na troca de faixa.
export const ONDA = { VEL: [450, 750, 1100], FORCA: [0.35, 0.7, 1], PERIODO: 3, LARG: 0.1 } as const;
export const INDICE_DA_FAIXA = { normal: 0, alerta: 1, gargalo: 2 } as const;

/** Brilho de 0 a FORCA num ponto aonde a onda chega `chegada` segundos depois de sair da origem. */
export function brilhoDaOnda(chegada: number, faixa: Faixa, t: number): number {
  const x = (chegada - t) / ONDA.PERIODO;
  const p = x - Math.floor(x);
  return p < ONDA.LARG ? Math.sin((Math.PI * p) / ONDA.LARG) * ONDA.FORCA[INDICE_DA_FAIXA[faixa]] : 0;
}

const f = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(n));
/** A mesma conta em GLSL, gerada das constantes acima para não divergir. */
export const GLSL_ONDA = `
const float ONDA_VEL[3] = float[3](${ONDA.VEL.map(f).join(", ")});
const float ONDA_FORCA[3] = float[3](${ONDA.FORCA.map(f).join(", ")});
float brilhoDaOnda(float chegada, int faixa, float t, float ganho) {
  float p = fract((chegada - t) / ${f(ONDA.PERIODO)});
  return p < ${f(ONDA.LARG)} ? min(1.0, sin(3.14159265 * p / ${f(ONDA.LARG)}) * ONDA_FORCA[faixa] * ganho) : 0.0;
}
`;

export interface OndaProps<D = unknown> {
  tempo: number;
  /** multiplica o brilho da onda (intensidade escolhida no painel); o resultado é limitado a 1 */
  ganho: number;
  /** escuro: a camada soma luz (blend one/one), então a cor sai pré-multiplicada pelo brilho */
  aditivo: boolean;
  /**
   * [tempoInicio (s), comprimento (m), sentido (1 = de → para · −1 = para → de), faixa (0 normal · 1 alerta · 2 gargalo)].
   * Um vec4 só: o PathLayer já usa quase todos os 16 atributos de vértice do WebGL2.
   */
  getOnda: Accessor<D, [number, number, number, number]>;
}

const inject = {
  "vs:#decl": `
in vec4 instanceOnda;
out float vTempoInicio;
out float vComprimento;
out float vSentido;
out float vFaixa;
`,
  "vs:#main-end": `
vTempoInicio = instanceOnda.x;
vComprimento = instanceOnda.y;
vSentido = instanceOnda.z;
vFaixa = instanceOnda.w;
`,
  "fs:#decl": `
uniform ondaUniforms {
  float tempo;
  float aditivo;
  float ganho;
} onda;
in float vTempoInicio;
in float vComprimento;
in float vSentido;
in float vFaixa;
float ondaQ; // fração do trecho; o hook do filtro é montado antes da declaração de vPathLength
${GLSL_ONDA}
`,
  "fs:#main-start": `
  ondaQ = vPathLength > 0.0 ? clamp(vPathPosition.y / vPathLength, 0.0, 1.0) : 0.0;
`,
  "fs:DECKGL_FILTER_COLOR": `
  float q = vSentido < 0.0 ? 1.0 - ondaQ : ondaQ;
  int faixa = int(vFaixa + 0.5);
  float b = brilhoDaOnda(vTempoInicio + vComprimento * q / ONDA_VEL[faixa], faixa, onda.tempo, onda.ganho);
  color = onda.aditivo > 0.5 ? vec4(color.rgb * b, b) : vec4(color.rgb, color.a * b);
`,
};

/** Extensão do PathLayer: cada trecho (um segmento só) acende onde a onda está passando. */
export class ExtensaoOnda extends LayerExtension {
  static extensionName = "ExtensaoOnda";
  static defaultProps = {
    tempo: 0,
    aditivo: false,
    ganho: 1,
    getOnda: { type: "accessor", value: [0, 0, 1, 0] },
  };

  getShaders() {
    return { modules: [{ name: "onda", inject, uniformTypes: { tempo: "f32", aditivo: "f32", ganho: "f32" } }] };
  }

  initializeState(this: Layer<OndaProps>) {
    this.getAttributeManager()?.addInstanced({
      instanceOnda: { size: 4, accessor: "getOnda" },
    });
  }

  updateState(this: Layer<OndaProps>, _params: UpdateParameters<Layer<OndaProps>>) {
    this.setShaderModuleProps({ onda: { tempo: this.props.tempo, aditivo: this.props.aditivo ? 1 : 0, ganho: this.props.ganho } });
  }
}
