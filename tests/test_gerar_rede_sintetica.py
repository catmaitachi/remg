"""T12: GerarRedeSintetica com Grafo e elementos falsos (a T07 e a T11 ainda não estão no remg).

Ruas do teste (comprimento em metros). s:A fica em cima de p:1 e s:B em cima de p:7:

    p:1 ─100─ p:2 ─100─ p:3 ─100─ p:4 ─100─ p:5 ─100─ p:6 ─100─ p:7        p:8 ─50─ p:9
               └───────────────────1000──────────────────┘                  (sem subestação)

Feito no papel: as áreas são A = {1, 2, 3, 4} e B = {5, 6, 7} (p:4 empata em 300 m e fica com A,
que sai primeiro da heap). Cabos: r1, r2, r3, r5, r6. Chaves: r4 (4–5) e r7 (2–6), que ligam áreas
diferentes. Sem cabo: r8, que não chega a subestação nenhuma, e p:8 e p:9 ficam fora da rede.
"""

import unittest
from dataclasses import dataclass

from core.casos_de_uso.gerar_rede_sintetica import (FATOR_CABO, FOLGA_SUBESTACAO, KVA_POR_METRO, GeradorAleatorio,
                                                    GerarRedeSintetica)


class GrafoDeTeste:
    """Forward-star igual ao Grafo da T07."""

    def __init__(self, V):
        self.V = V
        self.head = [-1] * V
        self.prox, self.para, self.cap = [], [], []

    def add_aresta(self, u, v, capacidade):
        e = len(self.para)
        for de, ate in ((u, v), (v, u)):
            self.para.append(ate)
            self.cap.append(capacidade)
            self.prox.append(self.head[de])
            self.head[de] = len(self.para) - 1
        return e


class ElementosDeTeste:
    """Mesmos campos do core/dominio/elementos.py da T11 (PR #46 do luzes)."""

    @dataclass
    class Subestacao:
        id: str
        nome: str
        lat: float
        lon: float
        capacidade_kva: float
        ponto_raiz: str | None = None

    @dataclass
    class Ponto:
        id: str
        lat: float
        lon: float
        demanda_kva: float = 0.0

    @dataclass
    class Trecho:
        id: str
        de: str
        para: str
        capacidade_kva: float
        comprimento_m: float = 0.0

    @dataclass
    class Chave(Trecho):
        aberta: bool = True


@dataclass
class P:
    id_osm: str
    lat: float
    lon: float


@dataclass
class R:
    id: str
    de: str
    para: str
    comprimento_m: float


@dataclass
class S:
    id_osm: str
    nome: str
    lat: float
    lon: float
    tipo: str = "distribution"


@dataclass
class Ruas:
    pontos: list
    trechos_rua: list
    subestacoes: list


def ruas():
    pontos = [P(str(i), -19.9, -43.9 + i * 0.001) for i in range(1, 10)]
    trechos = [R(str(i), str(i), str(i + 1), 100) for i in range(1, 7)]
    trechos += [R("7", "2", "6", 1000), R("8", "8", "9", 50)]
    subestacoes = [S("A", "Sub A", -19.9, -43.899), S("B", "Sub B", -19.9, -43.893),
                   S("X", "Transmissão", -19.9, -43.896, tipo="transmission")]
    return Ruas(pontos, trechos, subestacoes)


def gerar(semente=2026, dados=None):
    return GerarRedeSintetica(GrafoDeTeste, ElementosDeTeste, semente).executar(dados or ruas())


def area_de_cada_ponto(rede):
    """Sobe de cada ponto pelos cabos e diz em que raiz de subestação chega (None = mais de uma)."""
    vizinhos = {}
    for t in rede.trechos:
        vizinhos.setdefault(t.de, []).append(t.para)
        vizinhos.setdefault(t.para, []).append(t.de)
    raiz_de = {s.ponto_raiz: s.id for s in rede.subestacoes}
    area = {}
    for inicio in vizinhos:
        vistos, pilha, achadas = {inicio}, [inicio], set()
        while pilha:
            u = pilha.pop()
            if u in raiz_de:
                achadas.add(raiz_de[u])
            for v in vizinhos[u]:
                if v not in vistos:
                    vistos.add(v)
                    pilha.append(v)
        area[inicio] = achadas
    return area


class TestGerarRedeSintetica(unittest.TestCase):
    def test_cabos_chaves_e_ruas_sem_cabo(self):
        rede = gerar()
        self.assertEqual(sorted(t.id for t in rede.trechos), ["t:1", "t:2", "t:3", "t:5", "t:6"])
        self.assertEqual(sorted(c.id for c in rede.chaves), ["c:4", "c:7"])
        self.assertTrue(all(c.aberta for c in rede.chaves))
        self.assertEqual(rede.ruas_sem_cabo, 1)
        self.assertEqual(rede.pontos_isolados, 2)
        self.assertNotIn("p:8", [p.id for p in rede.pontos])

    def test_toda_rua_com_cabo_liga_a_uma_subestacao_so(self):
        for ponto, subestacoes in area_de_cada_ponto(gerar()).items():
            with self.subTest(ponto=ponto):
                self.assertEqual(len(subestacoes), 1)
        self.assertEqual(area_de_cada_ponto(gerar())["p:4"], {"s:A"})

    def test_so_subestacao_de_distribuicao_e_raiz_sem_repetir(self):
        rede = gerar()
        self.assertEqual([(s.id, s.ponto_raiz) for s in rede.subestacoes], [("s:A", "p:1"), ("s:B", "p:7")])

    def test_demanda_e_metade_de_cada_rua_em_volta(self):
        demanda = {p.id: p.demanda_kva for p in gerar().pontos}
        self.assertAlmostEqual(demanda["p:1"], KVA_POR_METRO * 100 / 2)
        self.assertAlmostEqual(demanda["p:2"], KVA_POR_METRO * (100 + 100 + 1000) / 2)

    def test_capacidades(self):
        rede = gerar()
        demanda = {p.id: p.demanda_kva for p in rede.pontos}
        # O cabo r3 (3–4) leva só a demanda de p:4, vezes o fator sorteado.
        t3 = next(t for t in rede.trechos if t.id == "t:3")
        self.assertGreaterEqual(t3.capacidade_kva, demanda["p:4"] * FATOR_CABO[0] - 0.01)
        self.assertLessEqual(t3.capacidade_kva, demanda["p:4"] * FATOR_CABO[1] + 0.01)
        area_a = sum(demanda[p] for p in ("p:1", "p:2", "p:3", "p:4"))
        self.assertAlmostEqual(rede.subestacoes[0].capacidade_kva, area_a * FOLGA_SUBESTACAO, places=1)

    def test_semente_fixa_repete_a_rede(self):
        caps = lambda r: [t.capacidade_kva for t in r.trechos]  # noqa: E731
        self.assertEqual(caps(gerar(7)), caps(gerar(7)))
        self.assertNotEqual(caps(gerar(7)), caps(gerar(8)))

    def test_gerador_aleatorio_no_intervalo(self):
        g = GeradorAleatorio(1)
        valores = [g.uniforme(0.8, 1.5) for _ in range(1000)]
        self.assertTrue(all(0.8 <= x < 1.5 for x in valores))
        self.assertLess(min(valores), 0.85)
        self.assertGreater(max(valores), 1.45)

    def test_subestacao_sem_rua(self):
        with self.assertRaises(ValueError):
            gerar(dados=Ruas([], [], [S("A", "Sub A", 0, 0)]))


if __name__ == "__main__":
    unittest.main()
