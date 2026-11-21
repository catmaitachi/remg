"""🌐 Adaptador HTTP: as rotas do 06 em cima da porta ServicoDeAnalise (T16).

Só importa core.portas (V16): quem cria o serviço é o ponto de montagem (servidor.py). Aqui ficam
a leitura do pedido, a conversão para os arrays posicionais do 06, o tempoMs, os erros em
português e o CORS para o front em localhost.
"""

import json
import re
import select
import socket
import sys
import threading
import time
from collections.abc import Callable
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import TypeVar

from core.portas.servico_de_analise import (DesenhoDaRede, ResultadoAnalise, ResultadoCriticos,
                                            ResultadoRota, ServicoDeAnalise)

MAX_CORPO = 1_000_000  # bytes
# Só o front rodando nesta máquina (Vite dev em 5173, preview em 4173…) pode chamar a API.
ORIGEM_LOCAL = re.compile(r"http://(localhost|127\.0\.0\.1)(:\d+)?")
T = TypeVar("T")


# ---------- pedido ----------

def ler_pedido(corpo: bytes) -> tuple[list[str], list[str], list[str]]:
    """(arestas caídas, subestações caídas, chaves fechadas). Pedido mal formado lança ValueError."""
    if not corpo.strip():
        return [], [], []
    try:
        pedido = json.loads(corpo)
    except (ValueError, RecursionError):  # JSONDecodeError, UnicodeDecodeError e [[[…]]] fundo demais
        raise ValueError("o corpo do pedido não é JSON válido") from None
    if not isinstance(pedido, dict):
        raise ValueError("o pedido precisa ser um objeto JSON, como {\"falhas\": {...}}")
    falhas = pedido.get("falhas", {})
    if not isinstance(falhas, dict):
        raise ValueError("\"falhas\" precisa ser um objeto com \"arestas\" e \"subestacoes\"")
    return (_lista(falhas, "arestas", "falhas.arestas"), _lista(falhas, "subestacoes", "falhas.subestacoes"),
            _lista(pedido, "chavesFechadas", "chavesFechadas"))


def _lista(obj: dict, chave: str, nome: str) -> list[str]:
    valor = obj.get(chave, [])
    if not isinstance(valor, list) or not all(isinstance(x, str) for x in valor):
        raise ValueError(f"\"{nome}\" precisa ser uma lista de ids (texto)")
    return valor


# ---------- resposta no formato do 06 ----------

def rede_json(d: DesenhoDaRede) -> dict:
    return {"area": d.area, "subestacoes": d.subestacoes, "pontos": d.pontos, "arestas": d.arestas,
            "geometriaAT": d.geometria_at}


def analise_json(r: ResultadoAnalise, tempo_ms: int) -> dict:
    return {"fluxoTotal": r.fluxo_total, "demandaTotal": r.demanda_total, "fluxo": r.fluxo,
            "gargalos": r.gargalos, "semEnergia": {"pontos": r.sem_energia, "demanda": r.demanda_sem_energia},
            "tempoMs": tempo_ms}


def rota_json(r: ResultadoRota, tempo_ms: int) -> dict:
    return {"chavesParaFechar": r.chaves_para_fechar, "caminho": r.caminho,
            "religado": {"pontos": r.religado_pontos, "demanda": r.religado_demanda},
            "parcial": r.parcial, "tempoMs": tempo_ms}


def criticos_json(r: ResultadoCriticos, tempo_ms: int) -> dict:
    return {"pontes": r.pontes, "articulacoes": r.articulacoes, "tempoMs": tempo_ms}


def medir(chamada):
    """(resultado, tempoMs): o tempo do núcleo, sem a conversão para JSON."""
    inicio = time.perf_counter()
    resultado = chamada()
    return resultado, round((time.perf_counter() - inicio) * 1000)


def em_bytes(corpo: dict) -> bytes:
    return json.dumps(corpo, ensure_ascii=False).encode()


# ---------- fila de um ----------

def cliente_desistiu(sock: socket.socket) -> bool:
    """O navegador já fechou a conexão (o fetch foi cancelado por um clique novo)?

    O corpo do pedido já foi lido; se o socket fica legível e o peek devolve b"", o outro lado fechou.
    """
    try:
        legivel, _, _ = select.select([sock], [], [], 0)
        return bool(legivel) and sock.recv(1, socket.MSG_PEEK) == b""
    except OSError:  # ConnectionResetError e afins: também desistiu
        return True


def calcular_na_vez(fila: threading.Lock, sock: socket.socket, calcular: Callable[[], T]) -> T | None:
    """Um cálculo por vez (~2,5 s em BH, e o GIL não deixa dois andarem juntos). Quem desistiu
    enquanto esperava a vez é pulado: None, sem chamar o núcleo."""
    with fila:
        if cliente_desistiu(sock):
            return None
        return calcular()


# ---------- servidor ----------

class Servidor(ThreadingHTTPServer):
    # No Windows, SO_REUSEADDR deixa dois processos abrirem a mesma porta sem erro.
    allow_reuse_address = sys.platform != "win32"
    daemon_threads = True

    def __init__(self, endereco, servico: ServicoDeAnalise) -> None:
        self.servico = servico
        self.fila = threading.Lock()
        # A rede não muda e a análise vazia é a primeira tela: as duas ficam prontas ao ligar (D26).
        self.rede = em_bytes(rede_json(servico.rede()))
        vazia, ms = medir(lambda: servico.analisar([], [], []))
        self.analise_vazia = em_bytes(analise_json(vazia, ms))
        self.tempo_analise_inicial_ms = ms
        super().__init__(endereco, Pedido)


def criar_servidor(porta: int, servico: ServicoDeAnalise) -> Servidor:
    return Servidor(("127.0.0.1", porta), servico)


class Pedido(BaseHTTPRequestHandler):
    server: Servidor

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        servico = self.server.servico
        self._atender({
            "/api/rede": lambda: self.server.rede,
            "/api/saude": lambda: em_bytes({"ok": True, **vars(servico.saude())}),
            "/api/criticos": lambda: em_bytes(criticos_json(*medir(servico.criticos))),
        }.get(self.path))

    def do_POST(self):
        self._atender({"/api/analise": self._analise, "/api/rota-alternativa": self._rota}.get(self.path))

    def _analise(self) -> bytes | None:
        pedido = self._ler_pedido()
        if not any(pedido):
            return self.server.analise_vazia
        return self._na_vez(lambda: analise_json(*medir(lambda: self.server.servico.analisar(*pedido))))

    def _rota(self) -> bytes | None:
        pedido = self._ler_pedido()
        return self._na_vez(lambda: rota_json(*medir(lambda: self.server.servico.rota_alternativa(*pedido))))

    def _na_vez(self, calcular: Callable[[], dict]) -> bytes | None:
        # medir fica dentro de calcular: o tempoMs não conta a espera na fila
        resposta = calcular_na_vez(self.server.fila, self.connection, calcular)
        return None if resposta is None else em_bytes(resposta)

    def _ler_pedido(self) -> tuple[list[str], list[str], list[str]]:
        try:
            tamanho = int(self.headers.get("Content-Length", 0))
        except ValueError:
            tamanho = -1
        if tamanho < 0:
            self.close_connection = True  # sem tamanho confiável, o resto da conexão não dá para ler
            raise ValueError("Content-Length inválido")
        if tamanho > MAX_CORPO:
            self.close_connection = True  # o corpo não vai ser lido
            raise ValueError(f"pedido grande demais (máximo {MAX_CORPO // 1_000_000} MB)")
        return ler_pedido(self.rfile.read(tamanho) if tamanho > 0 else b"")

    def _atender(self, rota):
        if rota is None:
            return self._responder(404, em_bytes({"erro": f"caminho desconhecido: {self.path}"}))
        try:
            corpo = rota()
        except ValueError as erro:
            return self._responder(400, em_bytes({"erro": str(erro)}))
        except Exception as erro:  # o servidor não pode cair por um pedido
            self.log_error("erro interno: %r", erro)
            return self._responder(500, em_bytes({"erro": f"erro interno no servidor: {type(erro).__name__}"}))
        if corpo is None:  # o navegador desistiu na fila: não há a quem responder
            self.close_connection = True
            return
        self._responder(200, corpo)

    def _responder(self, status: int, corpo: bytes) -> None:
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(corpo)))
        try:
            self.end_headers()
            self.wfile.write(corpo)
        except ConnectionError:  # o navegador desistiu enquanto o núcleo calculava: não é erro
            self.close_connection = True

    def _cors(self) -> None:
        origem = self.headers.get("Origin", "")
        if ORIGEM_LOCAL.fullmatch(origem):
            self.send_header("Access-Control-Allow-Origin", origem)
            self.send_header("Vary", "Origin")
