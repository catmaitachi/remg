"""Dijkstra com várias fontes sobre a HeapBinaria (spec 04, "Gerar a rede" e "Rota alternativa").

Big-O: O((V + E) log V). Cada arco relaxado põe no máximo um item na heap, então a heap
chega a O(E) itens e cada push/pop custa O(log E) = O(log V). Memória O(V + E).
"""

import math
from dataclasses import dataclass

from core.grafo.heap_binaria import HeapBinaria

INFINITO = math.inf


@dataclass
class ResultadoCaminhos:
    dist: list[float]    # menor distância de qualquer fonte até v; INFINITO se não alcança
    pai: list[int]       # vértice anterior no caminho; -1 em fonte ou inalcançável
    arco_pai: list[int]  # arco pai[v] → v; a rota alternativa lê dele quais chaves fechar
    fonte: list[int]     # qual fonte chegou primeiro em v; -1 se inalcançável


class Dijkstra:
    @staticmethod
    def caminhos(g, fontes: list[int], peso: list[float]) -> ResultadoCaminhos:
        """g é um Grafo em forward-star (usa só V, head, prox e para).

        peso[e] = custo do arco e (um por arco), porque quem chama decide a regra: comprimento da
        rua na geração da rede, comprimento + penalidade nas chaves na rota alternativa.
        A capacidade é ignorada: a rota alternativa precisa atravessar chave aberta (capacidade 0).
        Peso INFINITO bloqueia o arco. Peso negativo, NaN ou tamanho errado lança ValueError.
        Empate de distância: fica com a fonte que sai primeiro da heap (menor vértice).
        """
        if len(peso) != len(g.para):
            raise ValueError("Dijkstra: precisa de um peso por arco")
        if any(not p >= 0 for p in peso):
            raise ValueError("Dijkstra: peso negativo ou NaN")

        dist = [INFINITO] * g.V
        pai = [-1] * g.V
        arco_pai = [-1] * g.V
        fonte = [-1] * g.V

        heap = HeapBinaria()
        for s in fontes:
            if not 0 <= s < g.V:
                raise IndexError("Dijkstra: fonte fora do grafo")
            if dist[s] == 0:
                continue  # fonte repetida
            dist[s] = 0
            fonte[s] = s
            heap.push(0, s)

        fechado = [False] * g.V
        head, prox, para = g.head, g.prox, g.para
        while not heap.vazia():
            _, u = heap.pop()
            # A heap não tem "diminuir chave": quando a distância melhora, entra uma cópia nova
            # e a antiga, já superada, é descartada aqui.
            if fechado[u]:
                continue
            fechado[u] = True
            e = head[u]
            while e != -1:
                if peso[e] != INFINITO:
                    v = para[e]
                    nova = dist[u] + peso[e]
                    if nova < dist[v]:
                        dist[v] = nova
                        pai[v] = u
                        arco_pai[v] = e
                        fonte[v] = fonte[u]
                        heap.push(nova, v)
                e = prox[e]

        return ResultadoCaminhos(dist, pai, arco_pai, fonte)
