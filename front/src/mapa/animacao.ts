// Lógica do laço de animação, sem navegador no topo do módulo (testável em node).

/** Com `prefers-reduced-motion: reduce`, a animação começa desligada. */
export const animacaoInicial = (reduzir: boolean): boolean => !reduzir;

/** Chama `aoQuadro` a cada quadro até `parar()`; um callback que escapar do cancelamento não faz nada. */
export function criarLaco(
  agendar: (cb: (agora: number) => void) => number,
  cancelar: (id: number) => void,
  aoQuadro: (agora: number) => void,
): { parar(): void } {
  let ativo = true;
  const passo = (agora: number) => {
    if (!ativo) return;
    aoQuadro(agora);
    id = agendar(passo);
  };
  let id = agendar(passo);
  return { parar() { ativo = false; cancelar(id); } };
}
