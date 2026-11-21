"""🎯 PontosCriticos: o que continua sendo ponte mesmo com todas as chaves fechadas (spec 04, T23).

Numa rede radial quase todo trecho é ponte. O dado útil é onde a chave de manobra não salva, por
isso o Tarjan roda com todas as chaves fechadas. Resposta do GET /criticos (06), menos o tempoMs.
"""

from dataclasses import dataclass

from core.dominio.rede_eletrica import RedeEletrica
from core.grafo.tarjan import Tarjan


@dataclass
class ResultadoCriticos:
    pontes: list[str]
    articulacoes: list[str]


class PontosCriticos:
    def __init__(self, rede: RedeEletrica) -> None:
        self._rede = rede

    def executar(self) -> ResultadoCriticos:
        rede = self._rede
        g = rede.montar_grafo((), [c.id for c in rede.chaves])
        # S e T são virtuais: o T liga todos os pontos com demanda e faria tudo parecer ciclo.
        virtuais = (rede.s, rede.t)
        pontes = [rede.id_do_arco(e) for e in Tarjan.pontes(g, ignorar=virtuais)]
        articulacoes = [rede.id_externo(v) for v in Tarjan.articulacoes(g, ignorar=virtuais)]
        # Ponte sem id é a transformação subestação → ponto raiz: não é desenhada no mapa.
        return ResultadoCriticos([p for p in pontes if p is not None], articulacoes)
