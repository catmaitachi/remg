// Cores do mapa (design da T18). Paleta de uso híbrida: ciano do gov.br no claro, Okabe no resto.
// O teste confere contraste e distinção com daltonismo; a cor de UI (vidro, texto) fica nos tokens CSS.

export type Tema = "claro" | "escuro";
export type Faixa = "normal" | "alerta" | "gargalo";

export const PALETA: Record<Tema, {
  normal: string; alerta: string; gargalo: string; semFluxo: string;
  at: string; subestacao: string; contorno: string; primario: string; fundo: string;
}> = {
  claro: {
    normal: "#0081a1", alerta: "#c26a00", gargalo: "#c4004f", semFluxo: "#7f7f7f",
    at: "#34466b", subestacao: "#c97700", contorno: "#ffffff", primario: "#1351b4", fundo: "#f2f3f0",
  },
  escuro: {
    normal: "#3db2ff", alerta: "#ffb000", gargalo: "#ff4f8b", semFluxo: "#9ba7b5",
    at: "#7f9bd1", subestacao: "#ffd27a", contorno: "#0c0c0c", primario: "#c5d4eb", fundo: "#0c0c0c",
  },
};

export function faixaDoUso(uso: number): Faixa {
  return uso < 0.6 ? "normal" : uso < 0.9 ? "alerta" : "gargalo";
}

export function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}
