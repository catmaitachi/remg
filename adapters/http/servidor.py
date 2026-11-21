"""🐍 Servidor HTTP do REMG: ponto de montagem (D22) da API do 06 (T16).

É o único arquivo do adaptador HTTP que importa o núcleo direto: lê os CSV, gera a rede e entrega
a porta ServicoDeAnalise para o api.py, que só conhece core.portas.

Uso (da raiz do repo): python adapters/http/servidor.py
"""

import sys
import time
from pathlib import Path

# A raiz do repo entra no caminho para o `core` ser achado rodando de qualquer lugar.
RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ))

from adapters.dados.leitor_csv import LeitorCSV  # noqa: E402
from api import criar_servidor  # noqa: E402
from core.casos_de_uso.gerar_rede_sintetica import GerarRedeSintetica  # noqa: E402
from core.casos_de_uso.servico import AnaliseDaRede  # noqa: E402
from core.portas.servico_de_analise import ServicoDeAnalise  # noqa: E402

PORTA = 8080
PASTA_BH = RAIZ / "data" / "bh"


def montar(pasta: Path, area: str = "Belo Horizonte", avisar=lambda texto: None) -> ServicoDeAnalise:
    def etapa(nome, chamada):
        inicio = time.perf_counter()
        resultado = chamada()
        avisar(f"   {nome}: {(time.perf_counter() - inicio) * 1000:.0f} ms")
        return resultado

    dados = etapa("ler os CSV", LeitorCSV(pasta).carregar)
    gerada = etapa("gerar a rede", lambda: GerarRedeSintetica().executar(dados))
    rede = etapa("montar a RedeEletrica", gerada.montar_rede)
    return AnaliseDaRede(rede, area)


if __name__ == "__main__":
    print(f"⚡ carregando {PASTA_BH.relative_to(RAIZ)}…")
    try:
        servico = montar(PASTA_BH, avisar=print)
        servidor = criar_servidor(PORTA, servico)
    except OSError as erro:
        sys.exit(f"não deu para ligar o servidor na porta {PORTA} (outro programa usando?) ou ler os dados: {erro}")
    except ValueError as erro:
        sys.exit(f"os CSV de {PASTA_BH} têm um erro: {erro}")
    print(f"   análise inicial: {servidor.tempo_analise_inicial_ms} ms")
    print(f"🟢 http://localhost:{PORTA}/api")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\n🔴 servidor desligado")
