import json
import tempfile
import unittest
from pathlib import Path

from prep_osm import (AREA_PADRAO, baixar, extrair_linhas_at, extrair_regionais, extrair_ruas, extrair_subestacoes,
                      haversine_m, montar_consulta, processar)


def no(i, lat, lon):
    return {"type": "node", "id": i, "lat": lat, "lon": lon}


def rua(i, nos, tipo="residential"):
    return {"type": "way", "id": i, "nodes": nos, "tags": {"highway": tipo}}


# Via 10 (1-2-3, horizontal) cruza a via 11 (4-2-5, vertical) no nó 2.
CRUZ = [no(1, 0, 0), no(2, 0, 0.001), no(3, 0, 0.002), no(4, -0.001, 0.001), no(5, 0.001, 0.001),
        rua(10, [1, 2, 3]), rua(11, [4, 2, 5], "primary")]


class TestRuas(unittest.TestCase):
    def test_haversine(self):
        self.assertAlmostEqual(haversine_m(0, 0, 1, 0), 111195, delta=1)

    def test_cruzamento_vira_4_trechos(self):
        pontos, trechos, curva = extrair_ruas(CRUZ)
        self.assertEqual([p[0] for p in pontos], [1, 2, 3, 4, 5])
        self.assertEqual(len(trechos), 4)
        self.assertEqual(curva, 0)
        self.assertEqual([t[0] for t in trechos], [1, 2, 3, 4])
        self.assertEqual({(t[1], t[2], t[4]) for t in trechos},
                         {(1, 2, "residential"), (2, 3, "residential"), (4, 2, "primary"), (2, 5, "primary")})

    def test_curva_vira_1_trecho_com_comprimento_da_curva(self):
        elementos = [no(1, 0, 0), no(2, 0.001, 0.001), no(3, 0, 0.002), rua(10, [1, 2, 3])]
        pontos, trechos, curva = extrair_ruas(elementos)
        self.assertEqual([p[0] for p in pontos], [1, 3])
        self.assertEqual(curva, 1)
        esperado = haversine_m(0, 0, 0.001, 0.001) + haversine_m(0.001, 0.001, 0, 0.002)
        self.assertAlmostEqual(trechos[0][3], esperado, places=2)

    def test_ignora_highway_fora_da_lista(self):
        pontos, trechos, _ = extrair_ruas(CRUZ[:5] + [rua(10, [1, 2, 3], "footway")])
        self.assertEqual((pontos, trechos), ([], []))

    def test_aceita_link(self):
        _, trechos, _ = extrair_ruas(CRUZ[:5] + [rua(10, [1, 2, 3], "primary_link")])
        self.assertEqual(len(trechos), 1)

    def test_rotatoria_isolada_sem_laco(self):
        elementos = [no(1, 0, 0), no(2, 0, 0.001), no(3, 0.001, 0), rua(10, [1, 2, 3, 1])]
        _, trechos, _ = extrair_ruas(elementos)
        self.assertTrue(all(t[1] != t[2] for t in trechos))

    def test_no_repetido_na_mesma_via_vira_ponto(self):
        elementos = [no(1, 0, 0), no(2, 0, 0.001), no(3, 0.001, 0.001), no(4, 0, 0.002),
                     rua(10, [1, 2, 3, 2, 4])]
        pontos, _, _ = extrair_ruas(elementos)
        self.assertIn(2, [p[0] for p in pontos])

    def test_via_com_no_ausente_e_ignorada(self):
        pontos, trechos, _ = extrair_ruas(CRUZ[:5] + [rua(10, [1, 2, 3]), rua(12, [3, 99])])
        self.assertEqual(len(trechos), 1)
        self.assertNotIn(99, [p[0] for p in pontos])


QUADRADO = [no(1, 0, 0), no(2, 0, 0.002), no(3, 0.002, 0.002), no(4, 0.002, 0)]


class TestEnergiaERegionais(unittest.TestCase):
    def test_subestacao_no(self):
        e = no(7, -19.9, -43.9)
        e["tags"] = {"power": "substation", "name": "Centro", "voltage": "138000;13800",
                     "substation": "distribution"}
        self.assertEqual(extrair_subestacoes([e]),
                         [(7, "Centro", -19.9, -43.9, "138000;13800", "distribution")])

    def test_subestacao_area(self):
        area = {"type": "way", "id": 20, "nodes": [1, 2, 3, 4, 1],
                "tags": {"power": "substation", "name": "Sion"}}
        [(i, nome, lat, lon, tensoes, tipo)] = extrair_subestacoes(QUADRADO + [area])
        self.assertEqual((i, nome, tensoes, tipo), (20, "Sion", "", ""))
        self.assertAlmostEqual(lat, 0.001)
        self.assertAlmostEqual(lon, 0.001)

    def test_linha_at(self):
        linha = {"type": "way", "id": 30, "nodes": [1, 2], "tags": {"power": "line", "voltage": "138000"}}
        self.assertEqual(extrair_linhas_at(QUADRADO + [linha]),
                         [(30, "138000", "0.0000000 0.0000000;0.0000000 0.0020000")])

    def test_regional_anel_com_vias_invertidas(self):
        vias = [{"type": "way", "id": 40, "nodes": [1, 2, 3]}, {"type": "way", "id": 41, "nodes": [1, 4, 3]}]
        rel = {"type": "relation", "id": 50, "tags": {"admin_level": "9", "name": "Pampulha"},
               "members": [{"type": "way", "ref": 40, "role": "outer"},
                           {"type": "way", "ref": 41, "role": "outer"}]}
        [(nome, poligono)] = extrair_regionais(QUADRADO + vias + [rel])
        anel = poligono.split(";")
        self.assertEqual(nome, "Pampulha")
        self.assertEqual(anel[0], anel[-1])
        self.assertEqual(len(anel), 5)
        self.assertNotIn("|", poligono)


AREA = 'area["name"="X"]'
CABECALHOS = {
    "pontos.csv": "id_osm,lat,lon",
    "trechos_rua.csv": "id,de,para,comprimento_m,tipo_via",
    "subestacoes.csv": "id_osm,nome,lat,lon,tensoes,tipo",
    "linhas_at.csv": "id_osm,tensao,coords",
    "regionais.csv": "nome,poligono",
}


def bruto(elementos):
    return {"osm3s": {"timestamp_osm_base": "2026-07-24T00:00:00Z"}, "elements": elementos}


class TestProcessar(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.pasta = Path(self.tmp.name)

    def test_processar_grava_cabecalhos(self):
        processar(bruto(CRUZ), self.pasta / "a", AREA)
        for nome, cabecalho in CABECALHOS.items():
            primeira = (self.pasta / "a" / nome).read_text(encoding="utf-8").splitlines()[0]
            self.assertEqual(primeira, cabecalho)
        linha = (self.pasta / "a" / "pontos.csv").read_text(encoding="utf-8").splitlines()[1]
        self.assertEqual(linha, "1,0.0000000,0.0000000")

    def test_saida_deterministica(self):
        embaralhado = list(reversed(CRUZ))
        processar(bruto(CRUZ), self.pasta / "a", AREA)
        processar(bruto(embaralhado), self.pasta / "b", AREA)
        for nome in [*CABECALHOS, "fonte.json"]:
            self.assertEqual((self.pasta / "a" / nome).read_bytes(), (self.pasta / "b" / nome).read_bytes(), nome)

    def test_saida_sem_crlf(self):
        processar(bruto(CRUZ), self.pasta, AREA)
        for nome in [*CABECALHOS, "fonte.json"]:
            self.assertNotIn(b"\r", (self.pasta / nome).read_bytes(), nome)

    def test_fonte_json(self):
        elementos = [no(1, 0, 0), no(2, 0.001, 0.001), no(3, 0, 0.002), rua(10, [1, 2, 3])]
        fonte = processar(bruto(elementos), self.pasta, AREA)
        self.assertEqual(json.loads((self.pasta / "fonte.json").read_text(encoding="utf-8")), fonte)
        self.assertEqual(fonte["data_osm"], "2026-07-24T00:00:00Z")
        self.assertEqual(fonte["area"], AREA)
        self.assertIn(AREA, fonte["consulta"])
        self.assertEqual(fonte["contagens"], {"pontos": 2, "trechos_rua": 1, "subestacoes": 0,
                                              "linhas_at": 0, "regionais": 0})
        self.assertEqual(fonte["opcao_b"], {"pontos_curva": 1, "media_por_trecho": 1.0})


class Resposta:
    def __init__(self, status, texto):
        self.status_code, self.text = status, texto


class TestBaixar(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.destino = Path(self.tmp.name) / "raw" / "x.osm.json"
        self.esperas = []

    def baixar_com(self, respostas):
        fila = list(respostas)
        baixar(AREA, self.destino, post=lambda *a, **k: fila.pop(0), esperar=self.esperas.append)

    def test_consulta_usa_area(self):
        self.assertIn(AREA + "->.a;", montar_consulta(AREA))

    def test_tenta_de_novo_em_502(self):
        ok = json.dumps(bruto(CRUZ))
        self.baixar_com([Resposta(502, ""), Resposta(502, ""), Resposta(200, ok)])
        salvo = json.loads(self.destino.read_text(encoding="utf-8"))
        self.assertEqual(salvo["area"], AREA)
        self.assertEqual(len(salvo["elements"]), len(CRUZ))
        self.assertEqual(len(self.esperas), 2)

    def test_desiste_depois_de_3(self):
        with self.assertRaises(SystemExit) as erro:
            self.baixar_com([Resposta(504, "")] * 3)
        self.assertIn("Overpass", str(erro.exception))
        self.assertFalse(self.destino.exists())

    def test_area_padrao_e_so_bh(self):
        # Só pelo nome, a Overpass também traz "Belo Horizonte" de Moçambique.
        self.assertIn('["IBGE:GEOCODIGO"="3106200"]', AREA_PADRAO)

    def test_remark_de_erro_com_elementos_conta_como_falha(self):
        parcial = json.dumps({**bruto(CRUZ), "remark": "runtime error: Query run out of memory"})
        with self.assertRaises(SystemExit):
            self.baixar_com([Resposta(200, parcial)] * 3)
        self.assertFalse(self.destino.exists())

    def test_erro_400_nao_tenta_de_novo(self):
        with self.assertRaises(SystemExit) as erro:
            self.baixar_com([Resposta(400, "parse error: line 2")])
        self.assertIn("parse error", str(erro.exception))
        self.assertEqual(self.esperas, [])

    def test_200_vazio_conta_como_falha(self):
        remark = json.dumps({"elements": [], "remark": "runtime error: Query timed out"})
        with self.assertRaises(SystemExit):
            self.baixar_com([Resposta(200, ""), Resposta(200, remark), Resposta(429, "")])
        self.assertEqual(len(self.esperas), 2)


if __name__ == "__main__":
    unittest.main()
