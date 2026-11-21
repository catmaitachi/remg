"""⚡ As peças da rede de energia (spec 03, "Glossário" e "O grafo").

Os ids já chegam no formato da API ("s:45", "p:123", "t:678", "c:90", "at:12"), que é o mesmo
usado nas respostas: assim a tabela de ids fica num lugar só, o RedeEletrica (D23).
Capacidade e demanda em kVA (unidade única, spec 03).
"""
from dataclasses import dataclass, field


@dataclass
class Subestacao:
    id: str
    nome: str
    lat: float
    lon: float
    capacidade_kva: float
    # Ponto de rua onde nasce o alimentador. Quem escolhe é a geração da rede (T12).
    ponto_raiz: str | None = None
    tipo: str = "distribution"
    em_falha: bool = False


@dataclass
class Ponto:
    id: str
    lat: float
    lon: float
    demanda_kva: float = 0.0


@dataclass
class PontoDeSuprimento:
    """Ponta de linha AT sem subestação por perto: é por onde a energia entra em BH."""
    id: str
    lat: float
    lon: float


@dataclass
class Trecho:
    id: str
    de: str
    para: str
    capacidade_kva: float
    comprimento_m: float = 0.0
    em_falha: bool = False


@dataclass
class Chave(Trecho):
    aberta: bool = True


@dataclass
class LinhaAT:
    id: str
    tensao: int
    capacidade_kva: float
    coords: list[tuple[float, float]] = field(default_factory=list)
    em_falha: bool = False
