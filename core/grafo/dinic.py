"""Dinic (fluxo máximo) e corte mínimo (spec 04, "Fluxo máximo" e "Gargalos").

Big-O: O(V²·E) no pior caso. Cada fase é uma BFS de níveis, O(V + E), e um fluxo bloqueante,
O(V·E), e há no máximo V fases. O corte mínimo custa O(V + E) depois do fluxo. Memória O(V + E).
"""

from dataclasses import dataclass, field

from core.grafo.grafo import Grafo


@dataclass
class ResultadoFluxo:
    total: int = 0
    # Por arco: fluxo[e] é o fluxo líquido no sentido do arco e (negativo = sentido contrário),
    # então fluxo[e ^ 1] == -fluxo[e]. É o sentido que a animação desenha.
    fluxo: list[int] = field(default_factory=list)
    # Por arco: |fluxo| ÷ capacidade, de 0 a 1. Arco com capacidade 0 fica com uso 0.
    uso: list[float] = field(default_factory=list)


class Dinic:
    """Um objeto por pedido (spec 05): guarda o grafo residual entre fluxo_maximo() e corte_minimo()."""

    # Capacidade "infinita" para a super-fonte S. O int do Python não estoura, mas um número fixo
    # deixa o resultado igual em qualquer lugar (e igual ao que a RedeEletrica usa).
    INFINITO = 10**18

    def __init__(self) -> None:
        self._g: Grafo | None = None
        self._residual: list[int] = []  # residual[e] = quanto ainda cabe no arco e
        self._nivel: list[int] = []     # distância de S em arcos com residual > 0, ou -1
        self._proximo: list[int] = []   # proximo[v] = próximo arco de v a tentar na fase atual

    def fluxo_maximo(self, g: Grafo, s: int, t: int) -> ResultadoFluxo:
        """Não altera o grafo: trabalha numa cópia das capacidades."""
        if not (0 <= s < g.V and 0 <= t < g.V):
            raise IndexError("Dinic.fluxo_maximo: vértice fora do grafo")
        if s == t:
            raise ValueError("Dinic.fluxo_maximo: S e T são o mesmo vértice")
        self._g = g
        self._residual = list(g.cap)
        r = ResultadoFluxo()
        while self._montar_niveis(s, t):
            self._proximo = list(g.head)
            r.total += self._fluxo_bloqueante(s, t)
        for e in range(len(g.cap)):
            # Os dois arcos do par começam com a mesma capacidade, e o que sai do residual de um entra
            # no do outro. Por isso cap - residual já é o fluxo líquido, com sinal.
            f = g.cap[e] - self._residual[e]
            r.fluxo.append(f)
            r.uso.append(abs(f) / g.cap[e] if g.cap[e] > 0 else 0.0)
        return r

    def corte_minimo(self) -> list[int]:
        """Arcos e (com capacidade > 0) que saem do lado de S e entram no lado de T no grafo residual.

        A soma de g.cap[e] deles é igual ao fluxo máximo. Devolve o corte mais perto de S.
        """
        if self._g is None:
            raise RuntimeError("Dinic.corte_minimo: rode fluxo_maximo antes")
        g, nivel = self._g, self._nivel
        # A última _montar_niveis, a que não achou T, já foi a BFS de S no grafo residual:
        # nivel[v] != -1 quer dizer "v ainda é alcançável a partir de S".
        corte = []
        for u in range(g.V):
            if nivel[u] == -1:
                continue
            e = g.head[u]
            while e != -1:
                if g.cap[e] > 0 and nivel[g.para[e]] == -1:
                    corte.append(e)
                e = g.prox[e]
        return corte

    def _montar_niveis(self, s: int, t: int) -> bool:
        g, residual = self._g, self._residual
        nivel = [-1] * g.V
        # Fila num vetor com dois índices: list.pop(0) custaria O(V) a cada saída.
        fila = [0] * g.V
        inicio, fim = 0, 1
        nivel[s] = 0
        fila[0] = s
        while inicio < fim:
            u = fila[inicio]
            inicio += 1
            e = g.head[u]
            while e != -1:
                v = g.para[e]
                if residual[e] > 0 and nivel[v] == -1:
                    nivel[v] = nivel[u] + 1
                    fila[fim] = v
                    fim += 1
                e = g.prox[e]
        self._nivel = nivel
        return nivel[t] != -1

    def _fluxo_bloqueante(self, s: int, t: int) -> int:
        g, residual, nivel, proximo = self._g, self._residual, self._nivel, self._proximo
        total = 0
        caminho: list[int] = []  # pilha própria: arcos de S até u (recursão estouraria com BH inteira)
        u = s
        while True:
            if u == t:
                gargalo = min(residual[e] for e in caminho)
                primeiro_cheio = len(caminho)
                for i, e in enumerate(caminho):
                    residual[e] -= gargalo
                    residual[e ^ 1] += gargalo
                    if residual[e] == 0 and primeiro_cheio == len(caminho):
                        primeiro_cheio = i
                total += gargalo
                # Volta só até a origem do primeiro arco que encheu: o trecho antes dele ainda tem folga.
                del caminho[primeiro_cheio:]
                u = g.para[caminho[-1]] if caminho else s
                continue
            e = proximo[u]
            while e != -1 and not (residual[e] > 0 and nivel[g.para[e]] == nivel[u] + 1):
                e = g.prox[e]
            proximo[u] = e
            if e != -1:
                caminho.append(e)
                u = g.para[e]
            elif u == s:
                break
            else:
                # Beco sem saída: nesta fase não adianta voltar a u, então descarta o arco que trouxe até ele.
                veio = caminho.pop()
                u = g.para[veio ^ 1]
                proximo[u] = g.prox[proximo[u]]
        return total
