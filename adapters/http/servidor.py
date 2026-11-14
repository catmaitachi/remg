"""🐍 Servidor HTTP do Cintilante. Por enquanto só GET /api/saude (T03); a API inteira vem na T16."""

import json
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

# A raiz do repo entra no caminho para o `core` ser achado rodando de qualquer lugar.
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from core.casos_de_uso.saude import saude  # noqa: E402

PORTA = 8080


class Pedido(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/api/saude":
            self._responder(200, {"ok": saude()})
        else:
            self._responder(404, {"erro": f"caminho desconhecido: {self.path}"})

    def _responder(self, status, corpo):
        dados = json.dumps(corpo).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(dados)))
        self.end_headers()
        self.wfile.write(dados)


class Servidor(ThreadingHTTPServer):
    # No Windows, SO_REUSEADDR deixa dois processos abrirem a mesma porta sem erro.
    allow_reuse_address = sys.platform != "win32"


def criar_servidor(porta):
    return Servidor(("127.0.0.1", porta), Pedido)


if __name__ == "__main__":
    try:
        servidor = criar_servidor(PORTA)
    except OSError as erro:
        sys.exit(f"não deu para abrir a porta {PORTA} (outro programa usando?): {erro}")
    print(f"🟢 http://localhost:{PORTA}/api/saude")
    servidor.serve_forever()
