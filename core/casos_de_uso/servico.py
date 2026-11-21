"""🔌 AnaliseDaRede: a porta ServicoDeAnalise em cima de uma RedeEletrica já montada (T16).

Junta os casos de uso que já existem e confere os ids do pedido antes de calcular, para que um id
errado vire ValueError com mensagem em português (400 no servidor), e não KeyError lá dentro.
"""

from core.casos_de_uso.pontos_criticos import PontosCriticos
from core.casos_de_uso.rota_alternativa import RotaAlternativa
from core.casos_de_uso.simular_falha import SimularFalha
from core.dominio.rede_eletrica import RedeEletrica
from core.portas.servico_de_analise import (DesenhoDaRede, ResultadoAnalise, ResultadoCriticos,
                                            ResultadoRota, Saude, ServicoDeAnalise)


class AnaliseDaRede(ServicoDeAnalise):
    def __init__(self, rede: RedeEletrica, area: str) -> None:
        self._rede = rede
        self._area = area
        self._simular = SimularFalha(rede)
        self._rota = RotaAlternativa(rede)
        self._criticos = PontosCriticos(rede)
        self._subestacoes = {s.id for s in rede.subestacoes}
        self._chaves = {c.id for c in rede.chaves}
        # Linha AT que não encosta em subestação fica fora do grafo: só ela não pode cair.
        self._arestas = ({t.id for t in rede.trechos} | self._chaves
                         | {l.id for l in rede.linhas_at if self._no_grafo(l.id)})
        self._conhecidos = self._arestas | self._subestacoes | {p.id for p in rede.pontos}

    def rede(self) -> DesenhoDaRede:
        r = self._rede
        arestas = ([(t.id, t.de, t.para, "trecho", t.capacidade_kva) for t in r.trechos]
                   + [(c.id, c.de, c.para, "chave", c.capacidade_kva) for c in r.chaves])
        return DesenhoDaRede(
            area=self._area,
            subestacoes=[(s.id, s.nome, s.lat, s.lon, s.capacidade_kva) for s in r.subestacoes],
            pontos=[(p.id, p.lat, p.lon, p.demanda_kva) for p in r.pontos],
            arestas=arestas,
            geometria_at={l.id: list(l.coords) for l in r.linhas_at},
        )

    def analisar(self, arestas_caidas: list[str], subestacoes_caidas: list[str],
                 chaves_fechadas: list[str]) -> ResultadoAnalise:
        self._conferir(arestas_caidas, subestacoes_caidas, chaves_fechadas)
        return self._simular.executar(arestas_caidas, subestacoes_caidas, chaves_fechadas)

    def rota_alternativa(self, arestas_caidas: list[str], subestacoes_caidas: list[str],
                         chaves_fechadas: list[str]) -> ResultadoRota:
        self._conferir(arestas_caidas, subestacoes_caidas, chaves_fechadas)
        return self._rota.executar(arestas_caidas, subestacoes_caidas, chaves_fechadas)

    def criticos(self) -> ResultadoCriticos:
        return self._criticos.executar()

    def saude(self) -> Saude:
        return Saude(self._rede.num_vertices, self._rede.num_arestas)

    def _no_grafo(self, id_aresta: str) -> bool:
        try:
            self._rede.arco(id_aresta)
            return True
        except KeyError:
            return False

    def _conferir(self, arestas: list[str], subestacoes: list[str], chaves: list[str]) -> None:
        for ids, validos, erro in ((arestas, self._arestas, "{} não é trecho, chave nem linha AT"),
                                   (subestacoes, self._subestacoes, "{} não é subestação"),
                                   (chaves, self._chaves, "só chave pode ser fechada: {}")):
            for id_ in ids:
                if id_ not in self._conhecidos:
                    raise ValueError(f"id desconhecido: {id_}")
                if id_ not in validos:
                    raise ValueError(erro.format(id_))
