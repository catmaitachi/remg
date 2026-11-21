"""🔌 Porta de entrada ServicoDeAnalise: o que os adaptadores pedem ao núcleo (spec 05, D22).

Um método por rota do 06. Os tipos de resposta moram aqui, e não nos casos de uso, porque o
adaptador só pode importar core.portas (V16) e a porta não pode importar os casos de uso (V5).
Nenhum tipo traz o tempoMs: quem mede é o adaptador, em volta da chamada.

Entrada inválida (id desconhecido, id do tipo errado) lança ValueError com a mensagem em
português que vai para o usuário.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass

Coordenada = tuple[float, float]  # (lat, lon) em graus


@dataclass
class ResultadoAnalise:
    """Mesmos campos do POST /analise (06), menos o tempoMs, que o adaptador mede."""
    fluxo_total: float                        # kVA que chegam em T
    demanda_total: float                      # kVA pedidos por todos os pontos
    fluxo: list[tuple[str, float, float]]     # (id, fluxo kVA com sinal, uso 0..1), só arestas com fluxo ≠ 0
    gargalos: list[str]
    sem_energia: list[str]                    # pontos sem energia (a SimularFalha preenche)
    demanda_sem_energia: float


@dataclass
class ResultadoRota:
    """Mesmos campos do POST /rota-alternativa (06), menos o tempoMs, que o adaptador mede."""
    chaves_para_fechar: list[str]  # na ordem em que foram escolhidas
    caminho: list[str]             # ids das arestas de cada caminho achado, rodada por rodada
    religado_pontos: int           # pontos que estavam sem energia e voltaram
    religado_demanda: float        # kVA que o Dinic entrega nesses pontos com as chaves fechadas
    parcial: bool                  # fechou chave, mas sobrou demanda sem atender
    sem_energia: list[str]         # pontos que continuam sem energia mesmo com as chaves fechadas


@dataclass
class ResultadoCriticos:
    pontes: list[str]
    articulacoes: list[str]


@dataclass
class DesenhoDaRede:
    """O GET /rede (06), já com os campos na ordem dos arrays posicionais."""
    area: str
    subestacoes: list[tuple[str, str, float, float, float]]  # id, nome, lat, lon, capacidade kVA
    pontos: list[tuple[str, float, float, float]]            # id, lat, lon, demanda kVA
    arestas: list[tuple[str, str, str, str, float]]          # id, de, para, tipo, capacidade kVA
    geometria_at: dict[str, list[Coordenada]]


@dataclass
class Saude:
    vertices: int
    arestas: int


class ServicoDeAnalise(ABC):
    @abstractmethod
    def rede(self) -> DesenhoDaRede:
        """A rede inteira, para desenhar."""

    @abstractmethod
    def analisar(self, arestas_caidas: list[str], subestacoes_caidas: list[str],
                 chaves_fechadas: list[str]) -> ResultadoAnalise:
        """Fluxo, gargalos e quem fica sem energia no cenário pedido."""

    @abstractmethod
    def rota_alternativa(self, arestas_caidas: list[str], subestacoes_caidas: list[str],
                         chaves_fechadas: list[str]) -> ResultadoRota:
        """Quais chaves fechar para religar quem ficou sem energia."""

    @abstractmethod
    def criticos(self) -> ResultadoCriticos:
        """Pontes e articulações com todas as chaves fechadas."""

    @abstractmethod
    def saude(self) -> Saude:
        """Tamanho do grafo carregado."""
