"""T16: o adaptador HTTP (api.py) com um serviço falso, num servidor de verdade numa porta livre."""

import http.client
import json
import socket
import threading
import time
import unittest
import urllib.error
import urllib.request

from api import calcular_na_vez, cliente_desistiu, criar_servidor
from core.portas.servico_de_analise import (DesenhoDaRede, ResultadoAnalise, ResultadoCriticos,
                                            ResultadoRota, Saude, ServicoDeAnalise)

DESENHO = DesenhoDaRede(
    "Teste",
    [("s:A", "A", -19.9, -43.9, 100.0)],
    [("p:1", -19.9, -43.9, 0.0), ("p:2", -19.91, -43.91, 20.0)],
    [("t:1", "p:1", "p:2", "trecho", 60.0)],
    {"at:1": [(-19.9, -43.9), (-19.95, -43.9)]},
)
VAZIA = ResultadoAnalise(20.0, 20.0, [("t:1", -20.0, 0.33)], [], [], 0.0)
COM_FALHA = ResultadoAnalise(0.0, 20.0, [], [], ["p:2"], 20.0)


class ServicoFalso(ServicoDeAnalise):
    def __init__(self):
        self.chamadas = []   # (arestas, subestacoes, chaves) de cada analisar
        self.erro = None     # exceção que o próximo analisar lança

    def rede(self):
        return DESENHO

    def analisar(self, arestas_caidas, subestacoes_caidas, chaves_fechadas):
        self.chamadas.append((arestas_caidas, subestacoes_caidas, chaves_fechadas))
        if self.erro:
            erro, self.erro = self.erro, None
            raise erro
        return COM_FALHA if arestas_caidas or subestacoes_caidas or chaves_fechadas else VAZIA

    def rota_alternativa(self, arestas_caidas, subestacoes_caidas, chaves_fechadas):
        return ResultadoRota(["c:1"], ["t:1", "c:1"], 1, 20.0, False, ["p:9"])

    def criticos(self):
        return ResultadoCriticos(["t:1"], ["p:1"])

    def saude(self):
        return Saude(5, 7)


def pedir(base, caminho, corpo=None, metodo=None, cabecalhos=None):
    """(status, cabeçalhos, json) — erro HTTP também volta, sem exceção."""
    dados = corpo.encode() if isinstance(corpo, str) else corpo
    req = urllib.request.Request(base + caminho, data=dados, method=metodo, headers=cabecalhos or {})
    try:
        with urllib.request.urlopen(req) as r:
            texto = r.read()
            return r.status, r.headers, json.loads(texto) if texto else None
    except urllib.error.HTTPError as e:
        texto = e.read()
        return e.code, e.headers, json.loads(texto) if texto else None


class TestApi(unittest.TestCase):
    def setUp(self):
        self.servico = ServicoFalso()
        self.servidor = criar_servidor(0, self.servico)
        self.base = f"http://127.0.0.1:{self.servidor.server_address[1]}"
        threading.Thread(target=self.servidor.serve_forever, daemon=True).start()

    def tearDown(self):
        self.servidor.shutdown()
        self.servidor.server_close()

    # ---------- formato do 06 ----------

    def test_rede_no_formato_do_06(self):
        status, _, r = pedir(self.base, "/api/rede")
        self.assertEqual(status, 200)
        self.assertEqual(r, {
            "area": "Teste",
            "subestacoes": [["s:A", "A", -19.9, -43.9, 100.0]],
            "pontos": [["p:1", -19.9, -43.9, 0.0], ["p:2", -19.91, -43.91, 20.0]],
            "arestas": [["t:1", "p:1", "p:2", "trecho", 60.0]],
            "geometriaAT": {"at:1": [[-19.9, -43.9], [-19.95, -43.9]]},
        })

    def test_analise_no_formato_do_06(self):
        status, h, r = pedir(self.base, "/api/analise", "{}")
        self.assertEqual(status, 200)
        self.assertEqual(h["Content-Type"], "application/json")
        self.assertIsInstance(r.pop("tempoMs"), int)
        self.assertEqual(r, {"fluxoTotal": 20.0, "demandaTotal": 20.0, "fluxo": [["t:1", -20.0, 0.33]],
                             "gargalos": [], "semEnergia": {"pontos": [], "demanda": 0.0}})
        _, _, r = pedir(self.base, "/api/analise", '{"falhas": {"arestas": ["t:1"]}}')
        self.assertEqual(r["semEnergia"], {"pontos": ["p:2"], "demanda": 20.0})

    def test_rota_alternativa_no_formato_do_06(self):
        status, _, r = pedir(self.base, "/api/rota-alternativa", '{"falhas": {"arestas": ["t:1"]}}')
        self.assertEqual(status, 200)
        self.assertIsInstance(r.pop("tempoMs"), int)
        self.assertEqual(r, {"chavesParaFechar": ["c:1"], "caminho": ["t:1", "c:1"],
                             "religado": {"pontos": 1, "demanda": 20.0}, "parcial": False})

    def test_criticos_e_saude(self):
        _, _, r = pedir(self.base, "/api/criticos")
        self.assertIsInstance(r.pop("tempoMs"), int)
        self.assertEqual(r, {"pontes": ["t:1"], "articulacoes": ["p:1"]})
        self.assertEqual(pedir(self.base, "/api/saude")[2], {"ok": True, "vertices": 5, "arestas": 7})

    # ---------- análise guardada ----------

    def test_pedido_vazio_usa_a_analise_guardada(self):
        respostas = [pedir(self.base, "/api/analise", c, metodo="POST")[2]
                     for c in ("", "{}", '{"falhas": {"arestas": []}, "chavesFechadas": []}')]
        self.assertEqual(respostas[0], respostas[1])
        self.assertEqual(respostas[0], respostas[2])
        self.assertEqual(self.servico.chamadas, [([], [], [])])  # só a do criar_servidor

    def test_pedido_repassa_as_listas(self):
        pedir(self.base, "/api/analise",
              '{"falhas": {"arestas": ["t:1"], "subestacoes": ["s:A"]}, "chavesFechadas": ["c:1"]}')
        self.assertEqual(self.servico.chamadas[-1], (["t:1"], ["s:A"], ["c:1"]))

    # ---------- erros ----------

    def test_400_json_invalido(self):
        status, _, r = pedir(self.base, "/api/analise", "{")
        self.assertEqual(status, 400)
        self.assertIn("JSON", r["erro"])

    def test_400_forma_errada(self):
        for corpo in ("[]", '{"falhas": []}', '{"chavesFechadas": "c:1"}', '{"falhas": {"arestas": [1]}}',
                      '{"falhas": {"subestacoes": "s:A"}}', "null"):
            with self.subTest(corpo=corpo):
                status, _, r = pedir(self.base, "/api/analise", corpo)
                self.assertEqual(status, 400)
                self.assertTrue(r["erro"])

    def test_400_value_error_do_servico(self):
        self.servico.erro = ValueError("id desconhecido: t:9")
        status, _, r = pedir(self.base, "/api/analise", '{"falhas": {"arestas": ["t:9"]}}')
        self.assertEqual((status, r), (400, {"erro": "id desconhecido: t:9"}))

    def test_400_pedido_grande(self):
        # Só o cabeçalho: o servidor recusa pelo Content-Length, sem ler o corpo.
        conexao = http.client.HTTPConnection("127.0.0.1", self.servidor.server_address[1], timeout=5)
        conexao.putrequest("POST", "/api/analise")
        conexao.putheader("Content-Length", "1000001")
        conexao.endheaders()
        r = conexao.getresponse()
        self.assertEqual(r.status, 400)
        self.assertIn("grande", json.loads(r.read())["erro"])
        conexao.close()

    def test_500_erro_inesperado(self):
        self.servico.erro = RuntimeError("quebrou")
        status, _, r = pedir(self.base, "/api/analise", '{"falhas": {"arestas": ["t:1"]}}')
        self.assertEqual(status, 500)
        self.assertIn("erro interno", r["erro"])
        self.assertEqual(pedir(self.base, "/api/saude")[0], 200)  # o servidor continua de pé

    def test_404(self):
        for metodo, caminho in (("GET", "/api/nada"), ("POST", "/api/nada"), ("GET", "/analise")):
            with self.subTest(caminho=caminho):
                status, _, r = pedir(self.base, caminho, "{}" if metodo == "POST" else None)
                self.assertEqual(status, 404)
                self.assertIn("erro", r)

    # ---------- CORS ----------

    def test_cors_localhost(self):
        for origem in ("http://localhost:5173", "http://127.0.0.1:4173"):
            with self.subTest(origem=origem):
                _, h, _ = pedir(self.base, "/api/saude", cabecalhos={"Origin": origem})
                self.assertEqual(h["Access-Control-Allow-Origin"], origem)

    def test_cors_outra_origem(self):
        for origem in ("http://evil.example", "http://localhost.evil.example:5173"):
            with self.subTest(origem=origem):
                _, h, _ = pedir(self.base, "/api/saude", cabecalhos={"Origin": origem})
                self.assertIsNone(h["Access-Control-Allow-Origin"])

    def test_preflight(self):
        status, h, _ = pedir(self.base, "/api/analise", metodo="OPTIONS", cabecalhos={
            "Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type"})
        self.assertEqual(status, 204)
        self.assertEqual(h["Access-Control-Allow-Origin"], "http://localhost:5173")
        self.assertEqual(h["Access-Control-Allow-Methods"], "GET, POST, OPTIONS")
        self.assertEqual(h["Access-Control-Allow-Headers"], "Content-Type")


class TestFila(unittest.TestCase):
    def test_cliente_desistiu(self):
        a, b = socket.socketpair()
        try:
            self.assertFalse(cliente_desistiu(a))
            b.close()
            self.assertTrue(cliente_desistiu(a))
        finally:
            a.close()

    def test_na_vez_pula_quem_desistiu(self):
        fila, (a, b) = threading.Lock(), socket.socketpair()
        b.close()
        chamou = []
        self.assertIsNone(calcular_na_vez(fila, a, lambda: chamou.append(1)))
        self.assertEqual(chamou, [])
        self.assertTrue(fila.acquire(blocking=False))
        a.close()

    def test_na_vez_calcula_quem_espera(self):
        fila, (a, b) = threading.Lock(), socket.socketpair()
        self.assertEqual(calcular_na_vez(fila, a, lambda: 42), 42)
        self.assertTrue(fila.acquire(blocking=False))
        a.close()
        b.close()

    def test_pedido_abandonado_na_fila_e_pulado(self):
        servico = ServicoLento()
        servidor = criar_servidor(0, servico)
        porta = servidor.server_address[1]
        base = f"http://127.0.0.1:{porta}"
        threading.Thread(target=servidor.serve_forever, daemon=True).start()
        respostas = {}

        def pedir_em_paralelo(nome):
            corpo = json.dumps({"falhas": {"arestas": [nome]}})
            t = threading.Thread(target=lambda: respostas.__setitem__(nome, pedir(base, "/api/analise", corpo)[0]))
            t.start()
            return t

        try:
            a = pedir_em_paralelo("t:A")
            self.assertTrue(servico.a_entrou.wait(5))
            corpo = json.dumps({"falhas": {"arestas": ["t:B"]}}).encode()
            b = socket.create_connection(("127.0.0.1", porta), timeout=5)
            b.sendall(b"POST /api/analise HTTP/1.1\r\nHost: x\r\nContent-Type: application/json\r\n"
                      + f"Content-Length: {len(corpo)}\r\n\r\n".encode() + corpo)
            time.sleep(0.3)  # o servidor lê o B e fica esperando a vez
            b.close()
            c = pedir_em_paralelo("t:C")
            time.sleep(0.3)
        finally:
            servico.solta_a.set()
        a.join(5)
        c.join(5)
        time.sleep(1)  # dá tempo de um B que (errado) fosse calculado aparecer nas chamadas
        servidor.shutdown()
        servidor.server_close()
        self.assertEqual(respostas, {"t:A": 200, "t:C": 200})
        self.assertEqual([ch[0] for ch in servico.chamadas], [[], ["t:A"], ["t:C"]])


class ServicoLento(ServicoFalso):
    """Segura o pedido t:A até o teste soltar: os outros ficam na fila atrás dele."""

    def __init__(self):
        super().__init__()
        self.a_entrou, self.solta_a = threading.Event(), threading.Event()

    def analisar(self, arestas_caidas, subestacoes_caidas, chaves_fechadas):
        if arestas_caidas == ["t:A"]:
            self.a_entrou.set()
            self.solta_a.wait(5)
        return super().analisar(arestas_caidas, subestacoes_caidas, chaves_fechadas)


if __name__ == "__main__":
    unittest.main()
