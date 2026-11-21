"""T23: Tarjan iterativo e PontosCriticos. O gabarito dos grafos aleatórios é a força bruta: tirar
cada aresta (ou vértice) e contar as componentes com BFS.
"""

import unittest
from collections import deque
from random import Random

from core.casos_de_uso.pontos_criticos import PontosCriticos
from core.dominio.elementos import Chave, Ponto, Subestacao, Trecho
from core.dominio.rede_eletrica import RedeEletrica
from core.grafo.grafo import Grafo
from core.grafo.tarjan import Tarjan


def grafo(V, arestas):
    """arestas: (u, v) com capacidade 1, ou (u, v, capacidade)."""
    g = Grafo(V)
    for u, v, *cap in arestas:
        g.add_aresta(u, v, cap[0] if cap else 1)
    return g


def arestas_ponte(g):
    return [e >> 1 for e in Tarjan.pontes(g)]


def componentes(V, arestas, sem_aresta=-1, sem_vertice=-1):
    vistos, n = [False] * V, 0
    viz = [[] for _ in range(V)]
    for k, (u, v) in enumerate(arestas):
        if k != sem_aresta and sem_vertice not in (u, v):
            viz[u].append(v)
            viz[v].append(u)
    for r in range(V):
        if r == sem_vertice or vistos[r]:
            continue
        n += 1
        vistos[r] = True
        fila = deque([r])
        while fila:
            for w in viz[fila.popleft()]:
                if not vistos[w]:
                    vistos[w] = True
                    fila.append(w)
    return n


class TestTarjan(unittest.TestCase):
    def test_ciclo_nao_tem_ponte_nem_articulacao(self):
        g = grafo(5, [(0, 1), (1, 2), (2, 3), (3, 4), (4, 0)])
        self.assertEqual(Tarjan.pontes(g), [])
        self.assertEqual(Tarjan.articulacoes(g), [])

    def test_arvore_toda_aresta_e_ponte(self):
        #     0
        #    / \
        #   1   2
        #  / \
        # 3   4
        g = grafo(5, [(0, 1), (0, 2), (1, 3), (1, 4)])
        self.assertEqual(sorted(arestas_ponte(g)), [0, 1, 2, 3])
        self.assertEqual(Tarjan.articulacoes(g), [0, 1])

    def test_dois_ciclos_ligados_por_ponte(self):
        # 0─1─2─0  (triângulo)  2 ══ 3  (ponte)  3─4─5─3 (triângulo)
        g = grafo(6, [(0, 1), (1, 2), (2, 0), (2, 3), (3, 4), (4, 5), (5, 3)])
        self.assertEqual(arestas_ponte(g), [3])
        self.assertEqual(Tarjan.articulacoes(g), [2, 3])

    def test_aresta_paralela_nao_e_ponte(self):
        g = grafo(3, [(0, 1), (0, 1), (1, 2)])
        self.assertEqual(arestas_ponte(g), [2])

    def test_capacidade_zero_conta_como_ausente(self):
        # O ciclo 0─1─2─0 com a aresta 2─0 aberta vira caminho: as outras duas viram ponte.
        g = grafo(3, [(0, 1, 5), (1, 2, 5), (2, 0, 0)])
        self.assertEqual(arestas_ponte(g), [0, 1])
        self.assertEqual(Tarjan.articulacoes(g), [1])

    def test_vertice_ignorado(self):
        # 1 e 2 só formam ciclo passando pelo 0; sem ele, 1─2 é ponte.
        g = grafo(3, [(0, 1), (0, 2), (1, 2)])
        self.assertEqual(arestas_ponte(g), [])
        self.assertEqual([e >> 1 for e in Tarjan.pontes(g, ignorar=(0,))], [2])

    def test_caminho_longo_nao_estoura_a_pilha(self):
        n = 50_000
        g = grafo(n, [(i, i + 1) for i in range(n - 1)])
        self.assertEqual(len(Tarjan.pontes(g)), n - 1)
        self.assertEqual(len(Tarjan.articulacoes(g)), n - 2)

    def test_grafos_aleatorios_contra_forca_bruta(self):
        sorteio = Random(23)
        for rodada in range(200):
            V = sorteio.randint(1, 12)
            arestas = [(sorteio.randrange(V), sorteio.randrange(V)) for _ in range(sorteio.randint(0, 2 * V))]
            arestas = [(u, v) for u, v in arestas if u != v]
            g = grafo(V, arestas)
            base = componentes(V, arestas)
            pontes = sorted(k for k in range(len(arestas)) if componentes(V, arestas, sem_aresta=k) > base)
            artic = [v for v in range(V) if componentes(V, arestas, sem_vertice=v) > base]
            with self.subTest(rodada=rodada, V=V, arestas=arestas):
                self.assertEqual(sorted(arestas_ponte(g)), pontes)
                self.assertEqual(Tarjan.articulacoes(g), artic)


def rede():
    """
        S ── s:A ──(transformação)── p:1 [demanda] ──t:1── p:2 ──t:2── p:3 [demanda] ── T
                                                          └c:1┐       │t:3
                                                              p:4 ────┘ [demanda] ── T
    """
    demanda = {"p:1": 5, "p:2": 0, "p:3": 5, "p:4": 5}
    return RedeEletrica(
        subestacoes=[Subestacao("s:A", "A", 0, 0, 100, ponto_raiz="p:1")],
        pontos=[Ponto(p, 0, 0, d) for p, d in demanda.items()],
        trechos=[Trecho("t:1", "p:1", "p:2", 50), Trecho("t:2", "p:2", "p:3", 50), Trecho("t:3", "p:3", "p:4", 50)],
        chaves=[Chave("c:1", "p:4", "p:2", 50)],
    )


class TestPontosCriticos(unittest.TestCase):
    def test_chave_fechada_salva_o_ciclo_e_o_tronco_continua_critico(self):
        r = PontosCriticos(rede()).executar()
        # p:1 e p:3 têm demanda: sem ignorar o T, p:1─T─p:3 fecharia um ciclo e t:1 sumiria da lista.
        self.assertEqual(r.pontes, ["t:1"])
        self.assertEqual(r.articulacoes, ["p:1", "p:2"])


if __name__ == "__main__":
    unittest.main()
