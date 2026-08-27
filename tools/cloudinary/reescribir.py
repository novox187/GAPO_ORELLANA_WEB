#!/usr/bin/env python3
"""
Reescribe rutaOriginal/rutaDerivados en media/manifest.json y en todo
data/api/v1/**/*.json para que apunten a Cloudinary, usando el mapa que
generó subir.py (media/cloudinary.json).

No necesita credenciales: sólo lee las URLs que subir.py ya consiguió.
Corre después de que subir.py haya terminado (o al menos avanzado) — un
id que no esté todavía en el mapa se deja tal cual, con su ruta local, y
queda listado al final como pendiente.

Es idempotente: si un objeto ya tiene `cloudinaryPublicId`, se vuelve a
calcular igual (mismo resultado), así que correrlo dos veces no duplica
nada ni deja rastros del estado anterior.
"""

from __future__ import annotations

import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
MAPA = RAIZ / "media" / "cloudinary.json"
MANIFIESTO = RAIZ / "media" / "manifest.json"
API_V1 = RAIZ / "data" / "api" / "v1"
SECCIONES_TS = RAIZ / "app" / "src" / "lib" / "secciones.ts"

ANCHOS = (400, 800, 1600)
# Ancho de las fotos de portada de sección en secciones.ts: son teselas de
# tarjeta, no imágenes a pantalla completa, así que no hace falta el
# original entero.
ANCHO_PORTADA_SECCION = 1200


def transformar(url: str, ancho: int) -> str:
    """Inserta una transformación de ancho en la URL sin transformar.

    Cloudinary aplica transformaciones metiéndolas en la URL entre
    `/upload/` y el resto de la ruta — no hace falta volver a subir nada
    para tener un ancho distinto.
    """
    marcador = "/upload/"
    i = url.index(marcador) + len(marcador)
    prefijo, sufijo = url[:i], url[i:]
    return f"{prefijo}w_{ancho},f_auto,q_auto/{sufijo}"


def derivados_desde(url: str) -> dict[str, str]:
    """Las tres variantes que usa `img()` en el cliente (400/800/1600 px)."""
    return {f"{a}w": transformar(url, a) for a in ANCHOS}


def es_media(obj) -> bool:
    return isinstance(obj, dict) and "id" in obj and "rutaOriginal" in obj


def reescribir_arbol(nodo, mapa: dict, vistos: set[str], faltantes: set[str]) -> int:
    """Recorre dicts y listas mutando en el sitio. Devuelve cuántos objetos
    de medio se actualizaron en este árbol."""
    cambios = 0

    if es_media(nodo):
        id_ = nodo["id"]
        info = mapa.get(id_)
        if info is None:
            faltantes.add(id_)
        else:
            nodo["rutaOriginal"] = info["url"]
            nodo["rutaDerivados"] = derivados_desde(info["url"])
            nodo["cloudinaryPublicId"] = info["publicId"]
            vistos.add(id_)
            cambios += 1
        # Un objeto-medio no anida otro objeto-medio dentro; no hace falta
        # seguir bajando por sus valores.
        return cambios

    if isinstance(nodo, dict):
        for v in nodo.values():
            cambios += reescribir_arbol(v, mapa, vistos, faltantes)
    elif isinstance(nodo, list):
        for v in nodo:
            cambios += reescribir_arbol(v, mapa, vistos, faltantes)

    return cambios


def procesar_archivo(ruta: Path, mapa: dict, vistos: set[str], faltantes: set[str]) -> int:
    datos = json.loads(ruta.read_text(encoding="utf-8"))
    cambios = reescribir_arbol(datos, mapa, vistos, faltantes)
    if cambios:
        ruta.write_text(json.dumps(datos, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return cambios


def reescribir_secciones_ts(mapa: dict, manifiesto_por_id: dict[str, dict]) -> int:
    """secciones.ts tiene media docena de rutas locales escritas a mano
    (`imagen: '/media/originales/<id>.<ext>'`, las portadas de "Lugares
    por visitar" y compañía en el índice de El cantón) — no son objetos
    JSON, así que no los toca reescribir_arbol. Se sustituyen por
    coincidencia exacta de texto: se conoce el literal exacto porque es
    el mismo `rutaOriginal` que tenía ese id antes de migrar."""
    if not SECCIONES_TS.exists():
        return 0

    contenido = SECCIONES_TS.read_text(encoding="utf-8")
    cambios = 0
    for id_, info in mapa.items():
        entrada = manifiesto_por_id.get(id_)
        if entrada is None:
            continue
        literal_viejo = f"'{entrada['rutaOriginal']}'"
        if literal_viejo not in contenido:
            continue
        nueva_url = transformar(info["url"], ANCHO_PORTADA_SECCION)
        contenido = contenido.replace(literal_viejo, f"'{nueva_url}'")
        cambios += 1

    if cambios:
        SECCIONES_TS.write_text(contenido, encoding="utf-8")
    return cambios


def main() -> None:
    if not MAPA.exists():
        raise SystemExit(
            f"No existe {MAPA.relative_to(RAIZ)} — corre primero tools/cloudinary/subir.py"
        )
    mapa = json.loads(MAPA.read_text(encoding="utf-8"))
    manifiesto_por_id = {
        d["id"]: d for d in json.loads(MANIFIESTO.read_text(encoding="utf-8"))["data"]
    }

    vistos: set[str] = set()
    faltantes: set[str] = set()
    archivos_tocados = 0
    objetos_cambiados = 0

    rutas = [MANIFIESTO, *sorted(API_V1.rglob("*.json"))]
    for ruta in rutas:
        n = procesar_archivo(ruta, mapa, vistos, faltantes)
        if n:
            archivos_tocados += 1
            objetos_cambiados += n

    print(f"{archivos_tocados} archivos reescritos, {objetos_cambiados} referencias de medio actualizadas.")
    print(f"{len(vistos)} ids distintos migrados a Cloudinary.")

    n_secciones = reescribir_secciones_ts(mapa, manifiesto_por_id)
    if n_secciones:
        print(f"{n_secciones} rutas literales actualizadas en {SECCIONES_TS.relative_to(RAIZ)}.")
    if faltantes:
        print(f"\n{len(faltantes)} ids referenciados en los JSON pero AUSENTES en {MAPA.name}")
        print("(no se subieron todavía, o subir.py falló para ellos; siguen con ruta local):")
        for f in sorted(faltantes):
            print(f"  - {f}")


if __name__ == "__main__":
    main()
