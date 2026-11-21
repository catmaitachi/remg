"""📂 Leitor dos CSV de data/<área>/ (T10): implementa a porta FonteDeRede. Colunas na spec 02.

  python adapters/dados/leitor_csv.py [pasta]   carrega a pasta (padrão: data/bh) e imprime as contagens
"""

import csv
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]

if __name__ == "__main__":
    # Rodando como script, a raiz do repo entra no caminho para o `core` ser achado.
    sys.path.insert(0, str(RAIZ))

from core.portas.fonte_de_rede import (  # noqa: E402
    DadosDaRede, FonteDeRede, LinhaATLida, PontoLido, RegionalLida, SubestacaoLida, TrechoLido,
)


class LeitorCSV(FonteDeRede):
    def __init__(self, pasta):
        self.pasta = Path(pasta)

    def carregar(self) -> DadosDaRede:
        return DadosDaRede(
            pontos=self._ler("pontos.csv", ("id_osm", "lat", "lon"), _ponto),
            trechos=self._ler("trechos_rua.csv", ("id", "de", "para", "comprimento_m", "tipo_via"), _trecho),
            subestacoes=self._ler("subestacoes.csv", ("id_osm", "nome", "lat", "lon", "tensoes", "tipo"),
                                  _subestacao),
            linhas_at=self._ler("linhas_at.csv", ("id_osm", "tensao", "coords"), _linha_at),
            regionais=self._ler("regionais.csv", ("nome", "poligono"), _regional),
        )

    def _ler(self, arquivo, colunas, converter):
        # utf-8-sig: aceita o BOM que editores do Windows põem ao salvar o CSV na mão.
        with open(self.pasta / arquivo, encoding="utf-8-sig", newline="") as f:
            leitor = csv.DictReader(f)
            faltando = [c for c in colunas if c not in (leitor.fieldnames or [])]
            if faltando:
                raise ValueError(f"{arquivo}: falta a coluna {', '.join(faltando)}")
            registros = []
            for linha in leitor:
                try:
                    # DictReader completa linha curta com None e guarda o excesso na chave None.
                    if None in linha or None in linha.values():
                        raise ValueError(f"esperava {len(leitor.fieldnames)} colunas")
                    registros.append(converter(linha))
                except ValueError as e:
                    raise ValueError(f"{arquivo}, linha {leitor.line_num}: {e}") from None
        return registros


def _num(linha, coluna, tipo):
    try:
        return tipo(linha[coluna])
    except ValueError:
        raise ValueError(f'a coluna {coluna} tem "{linha[coluna]}", que não é número') from None


def _coords(linha, coluna):
    """'lat lon;lat lon;…' → ((lat, lon), …)."""
    pares = []
    for par in linha[coluna].split(";"):
        partes = par.split()
        if len(partes) != 2:
            raise ValueError(f'a coluna {coluna} tem "{par}", que não é "lat lon"')
        try:
            pares.append((float(partes[0]), float(partes[1])))
        except ValueError:
            raise ValueError(f'a coluna {coluna} tem "{par}", que não é número') from None
    return tuple(pares)


def _ponto(l):
    return PontoLido(_num(l, "id_osm", int), _num(l, "lat", float), _num(l, "lon", float))


def _trecho(l):
    return TrechoLido(_num(l, "id", int), _num(l, "de", int), _num(l, "para", int),
                      _num(l, "comprimento_m", float), l["tipo_via"])


def _subestacao(l):
    try:
        tensoes = tuple(int(t) for t in l["tensoes"].split(";") if t)
    except ValueError:
        raise ValueError(f'a coluna tensoes tem "{l["tensoes"]}", que não é lista de números') from None
    return SubestacaoLida(_num(l, "id_osm", int), l["nome"], _num(l, "lat", float), _num(l, "lon", float),
                          tensoes, l["tipo"])


def _linha_at(l):
    tensao = _num(l, "tensao", int) if l["tensao"] else None
    return LinhaATLida(_num(l, "id_osm", int), tensao, _coords(l, "coords"))


def _regional(l):
    return RegionalLida(l["nome"], _coords(l, "poligono"))


def main(argv=None):
    sys.stdout.reconfigure(encoding="utf-8")
    argv = sys.argv[1:] if argv is None else argv
    pasta = Path(argv[0]) if argv else RAIZ / "data" / "bh"
    contagens = LeitorCSV(pasta).carregar().contagens()

    fonte = pasta / "fonte.json"
    esperado = json.loads(fonte.read_text(encoding="utf-8")).get("contagens", {}) if fonte.exists() else {}
    print(f"📂 {pasta}")
    for nome, n in contagens.items():
        if nome not in esperado:
            marca = ""
        elif esperado[nome] == n:
            marca = "✅ bate com o fonte.json"
        else:
            marca = f"❌ o fonte.json diz {esperado[nome]}"
        print(f"  {nome:<12}{n:>8}  {marca}")
    return 0 if all(esperado.get(nome, n) == n for nome, n in contagens.items()) else 1


if __name__ == "__main__":
    sys.exit(main())
