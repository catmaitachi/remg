import { expect, test } from "vitest";
import { animacaoInicial, criarLaco } from "./animacao";

// requestAnimationFrame falso: guarda os callbacks e deixa o teste disparar
function relogio() {
  const pendentes = new Map<number, (agora: number) => void>();
  const cancelados: number[] = [];
  let proximo = 1;
  return {
    agendar: (cb: (agora: number) => void) => { pendentes.set(proximo, cb); return proximo++; },
    cancelar: (id: number) => { cancelados.push(id); pendentes.delete(id); },
    disparar(agora: number) { const lista = [...pendentes]; pendentes.clear(); for (const [, cb] of lista) cb(agora); },
    pendentes, cancelados,
  };
}

test("reduced-motion começa desligado", () => {
  expect(animacaoInicial(true)).toBe(false);
  expect(animacaoInicial(false)).toBe(true);
});

test("o laço agenda o próximo quadro", () => {
  const r = relogio(), vistos: number[] = [];
  criarLaco(r.agendar, r.cancelar, (agora) => vistos.push(agora));
  r.disparar(10); r.disparar(20); r.disparar(30);
  expect(vistos).toEqual([10, 20, 30]);
  expect(r.pendentes.size).toBe(1);
});

test("parar cancela e ignora o quadro pendente", () => {
  const r = relogio(), vistos: number[] = [];
  const antigo: ((agora: number) => void)[] = [];
  const agendar = (cb: (agora: number) => void) => { antigo.push(cb); return r.agendar(cb); };
  const laco = criarLaco(agendar, r.cancelar, (agora) => vistos.push(agora));
  r.disparar(10);
  laco.parar();
  expect(r.cancelados).toEqual([2]);
  antigo.at(-1)!(99); // callback que escapou do cancelamento
  expect(vistos).toEqual([10]);
  expect(r.pendentes.size).toBe(0);
});
