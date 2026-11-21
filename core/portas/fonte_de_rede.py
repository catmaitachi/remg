"""🔌 Porta de saída FonteDeRede: de onde o núcleo tira os dados de uma cidade (spec 05).

Os registros abaixo espelham as colunas da spec 02, já com os tipos convertidos. Eles ainda não são
o domínio: a RedeEletrica (T11) é montada a partir deles. Ficam aqui, e não em core/dominio, porque o
adaptador só pode importar core.portas (V16).
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass

Coordenada = tuple[float, float]  # (lat, lon) em graus, WGS84


@dataclass(frozen=True)
class PontoLido:
    id_osm: int
    lat: float
    lon: float


@dataclass(frozen=True)
class TrechoLido:
    id: int
    de: int    # id_osm de um PontoLido
    para: int  # id_osm de um PontoLido
    comprimento_m: float
    tipo_via: str


@dataclass(frozen=True)
class SubestacaoLida:
    id_osm: int
    nome: str
    lat: float
    lon: float
    tensoes: tuple[int, ...]  # em volts; vazio quando o OSM não traz a tag
    tipo: str                 # "distribution", "transmission", "industrial" ou "" (sem tag no OSM)


@dataclass(frozen=True)
class LinhaATLida:
    id_osm: int
    tensao: int | None  # em volts; None quando o OSM não traz a tag
    coords: tuple[Coordenada, ...]


@dataclass(frozen=True)
class RegionalLida:
    nome: str
    poligono: tuple[Coordenada, ...]


@dataclass(frozen=True)
class DadosDaRede:
    pontos: list[PontoLido]
    trechos: list[TrechoLido]
    subestacoes: list[SubestacaoLida]
    linhas_at: list[LinhaATLida]
    regionais: list[RegionalLida]

    def contagens(self) -> dict[str, int]:
        # Mesmas chaves do "contagens" de data/<área>/fonte.json, para conferir uma contra a outra.
        return {
            "pontos": len(self.pontos),
            "trechos_rua": len(self.trechos),
            "subestacoes": len(self.subestacoes),
            "linhas_at": len(self.linhas_at),
            "regionais": len(self.regionais),
        }


class FonteDeRede(ABC):
    @abstractmethod
    def carregar(self) -> DadosDaRede:
        """Lê tudo de uma vez. Dado mal formado lança ValueError dizendo onde está o erro."""
