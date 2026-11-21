"""📊 Benchmark: núcleo × NetworkX (T22). Spec 04, "Como provar que está certo".

Roda cada algoritmo do núcleo pela CLI (adapters/cli/main.py, com --json) e o equivalente do
NetworkX nos mesmos grafos, confere se as respostas são iguais e mede o tempo dos dois.

  python tools/benchmark/benchmark.py              grafos aleatórios + BH (alguns minutos)
  python tools/benchmark/benchmark.py --rapido     só grafos pequenos (segundos), para conferir

O tempo do núcleo é o "tempoMs" que a CLI mede em volta do algoritmo, sem ler o arquivo nem subir o
Python. O do NetworkX é medido do mesmo jeito, só em volta da chamada. Cada medida é a mediana de
--repeticoes rodadas. Saída: resultados.csv e resultados.md na pasta --saida.
"""

import argparse
import csv
import json
import platform
import random
import statistics
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path

import networkx as nx

RAIZ = Path(__file__).resolve().parents[2]
CLI = RAIZ / "adapters" / "cli" / "main.py"
TOLERANCIA = 1e-6


@dataclass
class Caso:
    nome: str
    V: int
    arestas: list[tuple[int, int, int, float]]  # (u, v, capacidade, peso), na ordem do arquivo
    s: int = 0
    t: int = 0
    comandos: tuple[str, ...] = ()
    G: nx.MultiGraph = field(init=False, repr=False)

    def __post_init__(self):
        # MultiGraph porque BH tem ruas paralelas entre os mesmos pontos: num Graph, a segunda
        # apagaria a primeira e o NetworkX responderia sobre outro grafo.
        self.G = nx.MultiGraph()
        self.G.add_nodes_from(range(self.V))
        for k, (u, v, cap, peso) in enumerate(self.arestas):
            self.G.add_edge(u, v, key=k, capacity=cap, weight=peso)

    def grafo_simples(self):
        """O fluxo do NetworkX não aceita multigrafo: arestas paralelas viram uma com a soma das capacidades."""
        H = nx.Graph()
        H.add_nodes_from(range(self.V))
        for u, v, cap, _ in self.arestas:
            if H.has_edge(u, v):
                H[u][v]["capacity"] += cap
            else:
                H.add_edge(u, v, capacity=cap)
        return H


# ---------- grafos ----------

def aleatorio(n, grau_medio=3.0, semente=2026):
    """Esparso como uma malha de ruas: sem laço nem aresta repetida, capacidade e peso aleatórios."""
    r = random.Random(semente)
    vistas, arestas = set(), []
    while len(arestas) < int(n * grau_medio / 2):
        u, v = r.randrange(n), r.randrange(n)
        if u != v and (min(u, v), max(u, v)) not in vistas:
            vistas.add((min(u, v), max(u, v)))
            arestas.append((u, v, r.randint(1, 100), round(r.uniform(1, 500), 2)))
    return Caso(f"aleatório {n:,}".replace(",", "."), n, arestas, 0, n - 1, TODOS)


def bh_ruas():
    """Malha de ruas de BH (data/bh): peso = comprimento em metros, capacidade 1 em todas."""
    sys.path.insert(0, str(RAIZ))
    from adapters.dados.leitor_csv import LeitorCSV
    dados = LeitorCSV(RAIZ / "data" / "bh").carregar()
    indice = {p.id_osm: i for i, p in enumerate(dados.pontos)}
    arestas = [(indice[t.de], indice[t.para], 1, t.comprimento_m) for t in dados.trechos]
    return Caso("BH · ruas", len(dados.pontos), arestas, 0, 0, SEM_FLUXO)


def bh_rede():
    """Rede de distribuição sintética de BH (T12) com S e T: é o grafo do fluxo que o servidor roda."""
    sys.path.insert(0, str(RAIZ))
    from adapters.dados.leitor_csv import LeitorCSV
    from core.casos_de_uso.gerar_rede_sintetica import GerarRedeSintetica
    rede = GerarRedeSintetica().executar(LeitorCSV(RAIZ / "data" / "bh").carregar()).montar_rede()
    g = rede.montar_grafo()
    arestas = [(g.para[2 * k + 1], g.para[2 * k], g.cap[2 * k], 1.0) for k in range(len(g.para) // 2)]
    return Caso("BH · rede elétrica", g.V, arestas, rede.s, rede.t, ("fluxo", "fluxo-ek"))


# ---------- comparações (cada uma: argumentos da CLI, função do NetworkX, conferência) ----------

def _nx_componentes(caso):
    comp = [0] * caso.V
    # O BFS do núcleo numera os componentes na ordem do menor vértice de cada um.
    for i, c in enumerate(sorted(nx.connected_components(caso.G), key=min)):
        for v in c:
            comp[v] = i
    return comp


def _nx_pontes(caso):
    # Em multigrafo, ponte nunca é aresta repetida, então (u, v) aponta uma aresta só.
    k = {}
    for u, v, chave in caso.G.edges(keys=True):
        k[(u, v)] = k[(v, u)] = chave
    return sorted(k[(u, v)] for u, v in nx.bridges(caso.G))


def _nx_caminhos(caso):
    d = nx.single_source_dijkstra_path_length(caso.G, 0, weight="weight")
    return [d.get(v) for v in range(caso.V)]


def _mesmas_distancias(nucleo, networkx_):
    return len(nucleo) == len(networkx_) and all(
        (a is None and b is None) or (a is not None and b is not None and abs(a - b) <= TOLERANCIA * max(1, b))
        for a, b in zip(nucleo, networkx_))


def _nx_arvore(caso):
    T = nx.minimum_spanning_tree(caso.G, weight="weight")
    return {"custo": T.size(weight="weight"), "componentes": nx.number_connected_components(caso.G)}


def _mesma_arvore(nucleo, networkx_):
    return (abs(nucleo["custo"] - networkx_["custo"]) <= TOLERANCIA * max(1, networkx_["custo"])
            and nucleo["componentes"] == networkx_["componentes"])


COMPARACOES = {
    # nome: (rótulo, argumentos da CLI, NetworkX, confere)
    "fluxo": ("fluxo máximo · Dinic", lambda c: ["fluxo", str(c.s), str(c.t)],
              lambda c, H: nx.maximum_flow_value(H, c.s, c.t, capacity="capacity"), lambda a, b: a == b),
    "fluxo-ek": ("fluxo máximo · Edmonds-Karp", lambda c: ["fluxo", str(c.s), str(c.t), "--algoritmo", "ek"],
                 lambda c, H: nx.maximum_flow_value(H, c.s, c.t, capacity="capacity"), lambda a, b: a == b),
    "caminhos": ("Dijkstra (fonte 0)", lambda c: ["caminhos", "0"],
                 lambda c, H: _nx_caminhos(c), _mesmas_distancias),
    "componentes": ("componentes · BFS", lambda c: ["componentes"],
                    lambda c, H: _nx_componentes(c), lambda a, b: a == b),
    "pontes": ("pontes · Tarjan", lambda c: ["pontes"], lambda c, H: _nx_pontes(c), lambda a, b: a == b),
    "articulacoes": ("articulações · Tarjan", lambda c: ["articulacoes"],
                     lambda c, H: sorted(nx.articulation_points(c.G)), lambda a, b: a == b),
    "arvore": ("árvore mínima · Kruskal", lambda c: ["arvore"], lambda c, H: _nx_arvore(c), _mesma_arvore),
}
TODOS = tuple(COMPARACOES)
SEM_FLUXO = tuple(n for n in TODOS if not n.startswith("fluxo"))


# ---------- execução ----------

def escrever(caso, pasta):
    arquivo = Path(pasta) / "grafo.txt"
    with open(arquivo, "w", encoding="utf-8") as f:
        f.write(f"{caso.V}\n")
        f.writelines(f"{u} {v} {cap} {peso}\n" for u, v, cap, peso in caso.arestas)
    return arquivo


def rodar_cli(args, arquivo, limite_s):
    """(resultado, tempo em ms) do núcleo, ou None se passou do limite."""
    try:
        p = subprocess.run([sys.executable, str(CLI), args[0], str(arquivo), *args[1:], "--json"],
                           capture_output=True, text=True, encoding="utf-8", timeout=limite_s)
    except subprocess.TimeoutExpired:
        return None
    if p.returncode:
        raise RuntimeError(f"a CLI falhou em `{' '.join(args)}`: {p.stderr.strip()}")
    saida = json.loads(p.stdout)
    return saida["resultado"], saida["tempoMs"]


def medir(caso, nome, arquivo, repeticoes, limite_s):
    rotulo, args, chamar_nx, confere = COMPARACOES[nome]
    H = caso.grafo_simples() if nome.startswith("fluxo") else None
    linha = {"grafo": caso.nome, "V": caso.V, "E": len(caso.arestas), "algoritmo": rotulo}

    tempos_nucleo, resposta_nucleo = [], None
    for _ in range(repeticoes):
        r = rodar_cli(args(caso), arquivo, limite_s)
        if r is None:
            return {**linha, "nucleo_ms": None, "networkx_ms": None, "razao": None,
                    "confere": f"não terminou em {limite_s} s"}
        resposta_nucleo, ms = r
        tempos_nucleo.append(ms)

    tempos_nx, resposta_nx = [], None
    for _ in range(repeticoes):
        inicio = time.perf_counter()
        resposta_nx = chamar_nx(caso, H)
        tempos_nx.append((time.perf_counter() - inicio) * 1000)

    nucleo_ms, nx_ms = statistics.median(tempos_nucleo), statistics.median(tempos_nx)
    return {**linha, "nucleo_ms": round(nucleo_ms, 2), "networkx_ms": round(nx_ms, 2),
            "razao": round(nucleo_ms / nx_ms, 2) if nx_ms > 0 else None,
            "confere": "sim" if confere(resposta_nucleo, resposta_nx) else "NÃO"}


def gravar(linhas, pasta, repeticoes):
    pasta.mkdir(parents=True, exist_ok=True)
    colunas = ["grafo", "V", "E", "algoritmo", "nucleo_ms", "networkx_ms", "razao", "confere"]
    with open(pasta / "resultados.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, colunas, lineterminator="\n")
        w.writeheader()
        w.writerows(linhas)

    def num(x):
        return "—" if x is None else f"{x:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    md = ["# 📊 Benchmark: núcleo × NetworkX", "",
          f"Gerado por `tools/benchmark/benchmark.py` em {time.strftime('%d/%m/%Y %H:%M')} · "
          f"Python {platform.python_version()} · NetworkX {nx.__version__} · {platform.system()} {platform.machine()} · "
          f"mediana de {repeticoes} rodada(s).", "",
          "Tempo só do algoritmo, em milissegundos. **Razão** = núcleo ÷ NetworkX (abaixo de 1, o núcleo foi mais rápido).", "",
          "| Grafo | V | E | Algoritmo | Núcleo (ms) | NetworkX (ms) | Razão | Mesma resposta? |",
          "|---|---:|---:|---|---:|---:|---:|---|"]
    def inteiro(x):
        return f"{x:,}".replace(",", ".")

    for l in linhas:
        md.append(f"| {l['grafo']} | {inteiro(l['V'])} | {inteiro(l['E'])} | {l['algoritmo']} | {num(l['nucleo_ms'])} | "
                  f"{num(l['networkx_ms'])} | {num(l['razao'])} | {l['confere']} |")
    (pasta / "resultados.md").write_text("\n".join(md) + "\n", encoding="utf-8", newline="\n")


def main(argv=None):
    sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--rapido", action="store_true", help="só grafos pequenos, para conferir em segundos")
    p.add_argument("--repeticoes", type=int, default=3, help="rodadas por medida (mediana); padrão 3")
    p.add_argument("--limite", type=int, default=120, help="segundos por rodada do núcleo antes de desistir")
    p.add_argument("--saida", type=Path, default=Path(__file__).parent / "resultados")
    a = p.parse_args(argv)

    if a.rapido:
        casos = [aleatorio(200, semente=1), aleatorio(1_000, semente=2)]
    else:
        casos = [aleatorio(1_000), aleatorio(10_000), aleatorio(50_000), bh_ruas(), bh_rede()]

    linhas = []
    with tempfile.TemporaryDirectory() as pasta:
        for caso in casos:
            arquivo = escrever(caso, pasta)
            for nome in caso.comandos:
                linha = medir(caso, nome, arquivo, a.repeticoes, a.limite)
                print(f"{linha['grafo']:<20} {linha['algoritmo']:<28} núcleo {linha['nucleo_ms']} ms · "
                      f"NetworkX {linha['networkx_ms']} ms · confere: {linha['confere']}", flush=True)
                linhas.append(linha)
    gravar(linhas, a.saida, a.repeticoes)
    print(f"📄 {a.saida / 'resultados.md'}")
    return 0 if all(l["confere"] in ("sim",) or l["confere"].startswith("não terminou") for l in linhas) else 1


if __name__ == "__main__":
    sys.exit(main())
