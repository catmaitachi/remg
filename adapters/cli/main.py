"""💻 CLI do Cintilante: lê um grafo de arquivo, roda um algoritmo e imprime o resultado e o tempo (T17).

Uso (da raiz do repo):
    python adapters/cli/main.py caminhos     grafo.txt 0 [3 ...]   Dijkstra com várias fontes
    python adapters/cli/main.py fluxo        grafo.txt S T         Dinic (fluxo máximo)
    python adapters/cli/main.py componentes  grafo.txt             BFS (componentes conexas)
    python adapters/cli/main.py pontes       grafo.txt             Tarjan (pontes)               ⏳ T23
    python adapters/cli/main.py articulacoes grafo.txt             Tarjan (pontos de articulação) ⏳ T23
Com --json, imprime {"resultado": ..., "tempoMs": ...} numa linha, para o benchmark (T22) ler.

Arquivo do grafo (não direcionado, vértices 0..V-1; linha com # é comentário):
    V
    u v capacidade [peso]      peso opcional, padrão 1 (o Dijkstra usa o peso, o resto usa a capacidade)

Os 5 subcomandos são as 5 respostas que o benchmark confere com o NetworkX (spec 04, "Como provar").
É ponto de montagem (D22), por isso pode importar o core direto. Quando a peça de um subcomando
ainda não está no remg, ele avisa qual task falta e sai com código 3.
"""

import argparse
import json
import math
import sys
import time
from pathlib import Path

# A raiz do repo entra no caminho para o `core` ser achado rodando de qualquer lugar.
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from core.grafo.bfs import BFS  # noqa: E402
from core.grafo.dijkstra import Dijkstra  # noqa: E402
from core.grafo.dinic import Dinic  # noqa: E402
from core.grafo.grafo import Grafo  # noqa: E402

FALTA_PECA = 3


class PecaFaltando(Exception):
    pass


def ler_grafo(texto):
    """Devolve (grafo, peso por arco). Erro de formato vira ValueError com o número da linha."""
    linhas = [(n, l.split("#")[0].split()) for n, l in enumerate(texto.splitlines(), 1)]
    linhas = [(n, campos) for n, campos in linhas if campos]
    if not linhas:
        raise ValueError("arquivo vazio: a primeira linha é o número de vértices")
    n, campos = linhas[0]
    if len(campos) != 1 or not campos[0].isdigit():
        raise ValueError(f"linha {n}: esperava só o número de vértices")
    g, peso = Grafo(int(campos[0])), []
    for n, campos in linhas[1:]:
        if len(campos) not in (3, 4):
            raise ValueError(f"linha {n}: esperava `u v capacidade [peso]`")
        try:
            u, v, cap = int(campos[0]), int(campos[1]), int(campos[2])
            p = float(campos[3]) if len(campos) == 4 else 1.0
            g.add_aresta(u, v, cap)
        except (ValueError, IndexError) as erro:
            raise ValueError(f"linha {n}: {erro}") from None
        peso += [p, p]
    return g, peso


def _importar(modulo, classe, task):
    try:
        return getattr(__import__(modulo, fromlist=[classe]), classe)
    except (ImportError, AttributeError):
        raise PecaFaltando(f"{classe} ainda não está no remg: chega com a {task}") from None


# Cada função devolve um valor que vira JSON. Os nomes dos métodos seguem o UML do spec 03.

def cmd_caminhos(g, peso, args):
    dist = Dijkstra.caminhos(g, args.fontes, peso).dist
    return [d if d != math.inf else None for d in dist]


def cmd_fluxo(g, peso, args):
    return Dinic().fluxo_maximo(g, args.s, args.t).total


def cmd_componentes(g, peso, args):
    return BFS.componentes(g)


def cmd_pontes(g, peso, args):
    # Devolve as arestas (arco // 2, na ordem do arquivo), para comparar com o NetworkX.
    return sorted({e >> 1 for e in _importar("core.grafo.tarjan", "Tarjan", "T23").pontes(g)})


def cmd_articulacoes(g, peso, args):
    return sorted(_importar("core.grafo.tarjan", "Tarjan", "T23").articulacoes(g))


def _parser():
    p = argparse.ArgumentParser(prog="cintilante-cli", description="Roda um algoritmo do núcleo num grafo de arquivo.")
    sub = p.add_subparsers(dest="comando", required=True)

    def novo(nome, funcao, ajuda):
        s = sub.add_parser(nome, help=ajuda)
        s.add_argument("arquivo", type=Path)
        s.add_argument("--json", action="store_true", help="saída numa linha de JSON, para o benchmark")
        s.set_defaults(funcao=funcao)
        return s

    novo("caminhos", cmd_caminhos, "Dijkstra com várias fontes: distância de cada vértice").add_argument(
        "fontes", type=int, nargs="+")
    f = novo("fluxo", cmd_fluxo, "Dinic: valor do fluxo máximo de S a T")
    f.add_argument("s", type=int)
    f.add_argument("t", type=int)
    novo("componentes", cmd_componentes, "BFS: componente de cada vértice")
    novo("pontes", cmd_pontes, "Tarjan: arestas que são pontes")
    novo("articulacoes", cmd_articulacoes, "Tarjan: pontos de articulação")
    return p


def main(argv=None, saida=sys.stdout):
    args = _parser().parse_args(argv)
    try:
        g, peso = ler_grafo(args.arquivo.read_text(encoding="utf-8"))
        inicio = time.perf_counter()
        resultado = args.funcao(g, peso, args)
        tempo_ms = (time.perf_counter() - inicio) * 1000
    except PecaFaltando as erro:
        print(f"⏳ {erro}", file=sys.stderr)
        return FALTA_PECA
    except (OSError, ValueError, IndexError) as erro:
        print(f"❌ {erro}", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps({"resultado": resultado, "tempoMs": round(tempo_ms, 3)}), file=saida)
    else:
        print(resultado if not isinstance(resultado, list) else " ".join(map(str, resultado)), file=saida)
        print(f"⏱️ {tempo_ms:.3f} ms (V={g.V}, arcos={len(g.para)})", file=saida)
    return 0


if __name__ == "__main__":
    sys.exit(main())
