"""📥 prep_osm: baixa uma área do OpenStreetMap e gera os CSV de data/<nome>/ (T06, spec 02-dados).

Só EXTRAI listas. Montar grafo e rodar algoritmo é tarefa do núcleo (regra 3).
"""

import argparse
import csv
import json
import math
import re
import sys
import time
from collections import Counter
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
OVERPASS = "https://overpass-api.de/api/interpreter"
TENTATIVAS = 3
# Pelo código IBGE: só pelo nome, a Overpass também traz um "Belo Horizonte" de Moçambique.
AREA_PADRAO = 'area["boundary"="administrative"]["admin_level"="8"]["IBGE:GEOCODIGO"="3106200"]'
RAIO_TERRA_M = 6371008.8
VIAS = re.compile(r"^(trunk|primary|secondary|tertiary|unclassified|residential)(_link)?$")


def haversine_m(lat1, lon1, lat2, lon2):
    f1, f2 = math.radians(lat1), math.radians(lat2)
    a = (math.sin((f2 - f1) / 2) ** 2
         + math.cos(f1) * math.cos(f2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2)
    return 2 * RAIO_TERRA_M * math.asin(math.sqrt(a))


def _nos(elementos):
    return {e["id"]: (e["lat"], e["lon"]) for e in elementos if e["type"] == "node"}


def extrair_ruas(elementos):
    """Devolve (pontos, trechos, pontos_de_curva). Ponto = nó em 2+ ocorrências ou ponta de via."""
    nos = _nos(elementos)
    vias = sorted(
        (e for e in elementos
         if e["type"] == "way" and VIAS.match(e.get("tags", {}).get("highway", ""))
         and all(n in nos for n in e["nodes"])),
        key=lambda e: e["id"])

    uso = Counter(n for v in vias for n in v["nodes"])
    pontos_ids = {n for n, c in uso.items() if c >= 2}
    pontos_ids.update(n for v in vias for n in (v["nodes"][0], v["nodes"][-1]))

    trechos, curva = [], 0
    for v in vias:
        tipo = v["tags"]["highway"]
        inicio, comprimento, internos = v["nodes"][0], 0.0, 0
        for a, b in zip(v["nodes"], v["nodes"][1:]):
            comprimento += haversine_m(*nos[a], *nos[b])
            if b not in pontos_ids:
                internos += 1
                continue
            if b != inicio:  # descarta laço (rotatória sem cruzamento)
                trechos.append((len(trechos) + 1, inicio, b, comprimento, tipo))
                curva += internos
            inicio, comprimento, internos = b, 0.0, 0

    usados = {t[1] for t in trechos} | {t[2] for t in trechos}
    pontos = [(n, *nos[n]) for n in sorted(usados)]
    return pontos, trechos, curva


def _coords(pares):
    return ";".join(f"{lat:.7f} {lon:.7f}" for lat, lon in pares)


def extrair_subestacoes(elementos):
    nos = _nos(elementos)
    vias = {e["id"]: e["nodes"] for e in elementos if e["type"] == "way"}
    saida = []
    for e in elementos:
        tags = e.get("tags", {})
        if tags.get("power") != "substation":
            continue
        if e["type"] == "node":
            lat, lon = e["lat"], e["lon"]
        else:
            ids = e["nodes"] if e["type"] == "way" else [
                n for m in e.get("members", []) if m["type"] == "way" for n in vias.get(m["ref"], [])]
            ids = list(dict.fromkeys(ids))  # área fechada repete o 1º nó no fim
            if not ids or not all(n in nos for n in ids):
                continue
            lat = sum(nos[n][0] for n in ids) / len(ids)
            lon = sum(nos[n][1] for n in ids) / len(ids)
        saida.append((e["id"], tags.get("name", ""), lat, lon, tags.get("voltage", ""), tags.get("substation", "")))
    return sorted(saida)


def extrair_linhas_at(elementos):
    nos = _nos(elementos)
    return sorted(
        (e["id"], e["tags"].get("voltage", ""), _coords(nos[n] for n in e["nodes"]))
        for e in elementos
        if e["type"] == "way" and e.get("tags", {}).get("power") == "line" and all(n in nos for n in e["nodes"]))


def _aneis(vias):
    """Junta vias pelas pontas (invertendo quando preciso) até fechar cada anel."""
    soltas, aneis = [list(v) for v in vias], []
    while soltas:
        anel = soltas.pop(0)
        while anel[0] != anel[-1]:
            for v in soltas:
                if v[0] == anel[-1] or v[-1] == anel[-1]:
                    soltas.remove(v)
                    anel += (v if v[0] == anel[-1] else v[::-1])[1:]
                    break
            else:
                anel.append(anel[0])  # anel incompleto no OSM: fecha reto
        aneis.append(anel)
    return aneis


def extrair_regionais(elementos):
    nos = _nos(elementos)
    vias = {e["id"]: e["nodes"] for e in elementos if e["type"] == "way"}
    saida = []
    for e in elementos:
        tags = e.get("tags", {})
        if e["type"] != "relation" or tags.get("admin_level") != "9":
            continue
        externas = [vias[m["ref"]] for m in e["members"]
                    if m["type"] == "way" and m.get("role") == "outer" and m["ref"] in vias]
        if not externas or not all(n in nos for v in externas for n in v):
            continue
        poligono = "|".join(_coords(nos[n] for n in anel) for anel in _aneis(externas))
        saida.append((tags.get("name", str(e["id"])), poligono))
    return sorted(saida)


def montar_consulta(area):
    return f"""[out:json][timeout:180];
{area}->.a;
(
  way["highway"~"^(trunk|primary|secondary|tertiary|unclassified|residential)(_link)?$"](area.a);
  nwr["power"="substation"](area.a);
  way["power"="line"](area.a);
  rel["boundary"="administrative"]["admin_level"="9"](area.a);
);
(._;>;);
out body;"""


def baixar(area, destino, post=None, esperar=time.sleep):
    """Baixa da Overpass e grava o bruto em `destino`, com até TENTATIVAS em caso de falha."""
    if post is None:
        import requests  # só o baixar precisa; o processar roda sem
        post = requests.post
    consulta, motivo = montar_consulta(area), ""
    for tentativa in range(1, TENTATIVAS + 1):
        try:
            r = post(OVERPASS, data={"data": consulta}, headers={"User-Agent": "cintilante-tp-grafos"}, timeout=200)
            if r.status_code not in (200, 429, 502, 504):  # ex.: 400 = consulta ou --area errados
                sys.exit(f"a Overpass recusou a consulta (HTTP {r.status_code}): {r.text[:300]}")
            if r.status_code == 200:
                bruto = json.loads(r.text)
                # remark com "error" = resposta cortada no meio, mesmo trazendo elementos
                if bruto.get("elements") and "error" not in bruto.get("remark", ""):
                    bruto["area"] = area
                    destino = Path(destino)
                    destino.parent.mkdir(parents=True, exist_ok=True)
                    destino.write_text(json.dumps(bruto), encoding="utf-8")
                    return
                motivo = bruto.get("remark", "resposta sem elementos")
            else:
                motivo = f"HTTP {r.status_code}"
        except (OSError, ValueError) as erro:  # rede caiu ou corpo não é JSON
            motivo = str(erro) or type(erro).__name__
        print(f"⚠️ tentativa {tentativa}/{TENTATIVAS} falhou: {motivo}", file=sys.stderr)
        if tentativa < TENTATIVAS:
            esperar(30 * tentativa)
    sys.exit(f"a Overpass falhou {TENTATIVAS} vezes ({motivo}). Tente fora do horário de pico "
             "ou use o plano B do README (Geofabrik + osmium).")


def _gravar(caminho, cabecalho, linhas):
    with open(caminho, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(cabecalho)
        w.writerows(linhas)


def processar(bruto, pasta, area):
    """Grava os 5 CSV e o fonte.json em `pasta`; devolve o conteúdo do fonte.json."""
    elementos = bruto["elements"]
    pontos, trechos, curva = extrair_ruas(elementos)
    subestacoes = extrair_subestacoes(elementos)
    linhas_at = extrair_linhas_at(elementos)
    regionais = extrair_regionais(elementos)

    pasta = Path(pasta)
    pasta.mkdir(parents=True, exist_ok=True)
    _gravar(pasta / "pontos.csv", ["id_osm", "lat", "lon"],
            ((i, f"{lat:.7f}", f"{lon:.7f}") for i, lat, lon in pontos))
    _gravar(pasta / "trechos_rua.csv", ["id", "de", "para", "comprimento_m", "tipo_via"],
            ((i, de, para, f"{m:.2f}", tipo) for i, de, para, m, tipo in trechos))
    _gravar(pasta / "subestacoes.csv", ["id_osm", "nome", "lat", "lon", "tensoes", "tipo"],
            ((i, nome, f"{lat:.7f}", f"{lon:.7f}", tensoes, tipo) for i, nome, lat, lon, tensoes, tipo in subestacoes))
    _gravar(pasta / "linhas_at.csv", ["id_osm", "tensao", "coords"], linhas_at)
    _gravar(pasta / "regionais.csv", ["nome", "poligono"], regionais)

    fonte = {
        "data_osm": bruto.get("osm3s", {}).get("timestamp_osm_base", ""),
        "area": area,
        "consulta": montar_consulta(area),
        "contagens": {"pontos": len(pontos), "trechos_rua": len(trechos), "subestacoes": len(subestacoes),
                      "linhas_at": len(linhas_at), "regionais": len(regionais)},
        # Custo da opção B (cabo seguindo a curva da rua), para o grupo decidir com dado real.
        "opcao_b": {"pontos_curva": curva, "media_por_trecho": round(curva / len(trechos), 2) if trechos else 0.0},
    }
    (pasta / "fonte.json").write_text(json.dumps(fonte, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
                                      newline="\n")
    return fonte


def main(argv=None):
    p = argparse.ArgumentParser(description="Baixa uma área do OSM e gera os CSV (spec 02-dados).")
    sub = p.add_subparsers(dest="comando", required=True)
    baix = sub.add_parser("baixar", help="Overpass → data/raw/<nome>.osm.json")
    baix.add_argument("--area", default=AREA_PADRAO, help="seletor de área da Overpass")
    baix.add_argument("--nome", default="bh")
    proc = sub.add_parser("processar", help="data/raw/<nome>.osm.json → data/<nome>/*.csv")
    proc.add_argument("--nome", default="bh")
    args = p.parse_args(argv)

    if args.comando == "baixar":
        destino = RAIZ / "data" / "raw" / f"{args.nome}.osm.json"
        baixar(args.area, destino)
        print(f"🟢 {destino}")
    else:
        origem = RAIZ / "data" / "raw" / f"{args.nome}.osm.json"
        if not origem.exists():
            sys.exit(f"não achei {origem}: rode antes `prep_osm.py baixar --nome {args.nome}`")
        bruto = json.loads(origem.read_text(encoding="utf-8"))
        fonte = processar(bruto, RAIZ / "data" / args.nome, bruto.get("area", AREA_PADRAO))
        print(json.dumps(fonte["contagens"], ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
