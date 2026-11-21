"""🚧 Regra de gargalo (spec 04, "Gargalos", P4).

O corte mínimo é resultado do algoritmo. O "uso ≥ 90%" é decisão de negócio, por isso mora aqui
e não no Dinic: se o grupo mudar o limite, só este arquivo muda.
"""

LIMITE_USO = 0.9


def eh_gargalo(no_corte_minimo: bool, uso: float) -> bool:
    """Trecho é gargalo se está no corte mínimo ou se passa de LIMITE_USO da capacidade."""
    return no_corte_minimo or uso >= LIMITE_USO
