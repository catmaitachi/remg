// Ondas do fluxo (T19). Índices dos arrays: 0 normal · 1 alerta · 2 gargalo.
// A fase é o tempo de chegada desde a origem: com a fase pela distância, a onda se partia na troca de faixa.
export const ONDA = { VEL: [450, 750, 1100], FORCA: [0.35, 0.7, 1], PERIODO: 3, LARG: 0.1 } as const;
