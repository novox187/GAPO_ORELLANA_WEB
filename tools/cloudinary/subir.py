#!/usr/bin/env python3
"""
Sube el archivo de medios (media/originales/) a Cloudinary y deja un mapa
id -> datos de Cloudinary en media/cloudinary.json.

Por qué existe: media/originales/ y media/derivados/ pesan ~2 GB y no se
versionan (ver .gitignore, README). Un despliegue en Coolify parte de un
`git clone` limpio, así que nunca los trae — el sitio quedaría con todas
las fotografías rotas. Cloudinary sirve como almacenamiento externo: se
sube el original una sola vez y sus variantes (400/800/1600 px) se piden
por URL con transformación, sin tener que volver a generar ni subir cada
tamaño.

Este script SOLO sube y registra. No toca los JSON de data/api/v1/ — de
eso se encarga reescribir.py, una vez que este mapa está completo.

Uso:
    Crea tools/cloudinary/.env (no se versiona — ver .gitignore) con:

        CLOUDINARY_CLOUD_NAME=...
        CLOUDINARY_API_KEY=...
        CLOUDINARY_API_SECRET=...

    y corre:
        python3 tools/cloudinary/subir.py

    También funciona si esas tres variables ya están exportadas en el
    entorno; el archivo .env es el camino recomendado porque una sesión de
    shell nueva no hereda variables exportadas en una sesión anterior.

Es reanudable: media/cloudinary.json se escribe después de cada subida
exitosa, así que interrumpir el proceso a mitad de camino no pierde el
progreso — la siguiente ejecución retoma donde se quedó, sin volver a
subir lo que ya está.
"""

from __future__ import annotations

import hashlib
import io
import json
import os
import sys
import tempfile
import time
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
MANIFIESTO = RAIZ / "media" / "manifest.json"
MAPA = RAIZ / "media" / "cloudinary.json"
ORIGINALES = RAIZ / "media" / "originales"

# Prefijo de public_id en Cloudinary: agrupa todo el archivo del sitio en
# una sola carpeta de su cuenta, fácil de encontrar y de borrar si hiciera
# falta, sin chocar con otros usos que le den a la misma cuenta.
CARPETA = "orellana-web"

# El plan gratuito de Cloudinary rechaza cualquier archivo de más de 10 MB
# (10.485.760 bytes exactos, confirmado contra la API real). 64 de las 357
# fotos superan ese límite — son capturas de cámara de hasta 7000 px de
# lado, y aquí nadie las sirve a más de 1600 px (ver `img()` en api.ts).
# Reescalarlas antes de subir no es un recorte forzado por el límite: es
# quitar peso que ya era inútil.
LIMITE_BYTES = 10 * 1024 * 1024
LADO_MAXIMO = 2400


ARCHIVO_ENV = Path(__file__).resolve().parent / ".env"
CLAVES = ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET")


def cargar_env_local() -> None:
    """Lee tools/cloudinary/.env si existe y completa os.environ con lo que
    falte. No pisa una variable que ya venga puesta desde fuera.

    Existe porque el entorno de shell no sobrevive entre invocaciones
    separadas de este script en una sesión de agente — un archivo en disco
    sí. El archivo nunca se versiona (ver .gitignore de esta carpeta).
    """
    if not ARCHIVO_ENV.exists():
        return
    for linea in ARCHIVO_ENV.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if not linea or linea.startswith("#") or "=" not in linea:
            continue
        clave, _, valor = linea.partition("=")
        os.environ.setdefault(clave.strip(), valor.strip())


def credenciales() -> tuple[str, str, str]:
    cargar_env_local()
    faltan = [v for v in CLAVES if not os.environ.get(v)]
    if faltan:
        print(f"Faltan credenciales: {', '.join(faltan)}", file=sys.stderr)
        print(
            f"Escríbelas en {ARCHIVO_ENV.relative_to(RAIZ)} (una por línea, CLAVE=valor) "
            "y vuelve a correr este script.",
            file=sys.stderr,
        )
        sys.exit(1)
    return tuple(os.environ[v] for v in CLAVES)  # type: ignore[return-value]


def firmar(parametros: dict[str, str], api_secret: str) -> str:
    """Firma según el esquema de Cloudinary: parámetros ordenados alfabéticamente,
    unidos como key=value con '&', más el api_secret al final, en SHA-1."""
    cadena = "&".join(f"{k}={v}" for k, v in sorted(parametros.items()))
    return hashlib.sha1((cadena + api_secret).encode("utf-8")).hexdigest()


def reescalar_si_hace_falta(ruta: Path) -> tuple[Path, bool]:
    """Si el archivo supera el límite del plan gratuito, lo reescala a un
    archivo temporal y devuelve esa ruta. Si no hace falta, devuelve la
    ruta original tal cual. El segundo valor indica si hay que borrar el
    temporal al terminar.

    No toca `media/originales/`: ese directorio es el máster que también
    lee el resto de herramientas (derivados locales, scraper), y reescalar
    en el sitio lo dejaría inconsistente con lo que el municipio publicó.
    """
    if ruta.stat().st_size <= LIMITE_BYTES:
        return ruta, False

    from PIL import Image

    with Image.open(ruta) as im:
        im = im.convert("RGB") if im.mode not in ("RGB", "L") else im
        ancho, alto = im.size
        lado = max(ancho, alto)
        if lado > LADO_MAXIMO:
            factor = LADO_MAXIMO / lado
            im = im.resize((round(ancho * factor), round(alto * factor)), Image.LANCZOS)

        tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
        calidad = 90
        # Baja la calidad en pasos hasta entrar en el límite; con el
        # redimensionado a 2400 px ya casi nunca hace falta pasar de la
        # primera vuelta, pero una foto muy ruidosa podría necesitarlo.
        while True:
            buf = io.BytesIO()
            im.save(buf, format="JPEG", quality=calidad, optimize=True)
            if buf.tell() <= LIMITE_BYTES or calidad <= 60:
                Path(tmp.name).write_bytes(buf.getvalue())
                break
            calidad -= 10

    return Path(tmp.name), True


def subir_uno(ruta: Path, public_id: str, cloud_name: str, api_key: str, api_secret: str) -> dict:
    import requests

    ruta_subida, es_temporal = reescalar_si_hace_falta(ruta)
    try:
        timestamp = str(int(time.time()))
        a_firmar = {"public_id": public_id, "timestamp": timestamp}
        firma = firmar(a_firmar, api_secret)

        with open(ruta_subida, "rb") as f:
            resp = requests.post(
                f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload",
                data={
                    "public_id": public_id,
                    "timestamp": timestamp,
                    "api_key": api_key,
                    "signature": firma,
                },
                files={"file": (ruta.name, f)},
                timeout=120,
            )
        resp.raise_for_status()
        return resp.json()
    finally:
        if es_temporal:
            ruta_subida.unlink(missing_ok=True)


def main() -> None:
    cloud_name, api_key, api_secret = credenciales()

    manifiesto = json.loads(MANIFIESTO.read_text(encoding="utf-8"))["data"]
    mapa: dict[str, dict] = {}
    if MAPA.exists():
        mapa = json.loads(MAPA.read_text(encoding="utf-8"))

    pendientes = [d for d in manifiesto if d["id"] not in mapa]
    print(f"{len(manifiesto)} medios en el catálogo, {len(pendientes)} por subir.")

    fallidos: list[str] = []
    for i, d in enumerate(pendientes, 1):
        ruta_local = RAIZ / d["rutaOriginal"].lstrip("/")
        if not ruta_local.exists():
            print(f"[{i}/{len(pendientes)}] {d['id']}: no existe {ruta_local}, se omite")
            fallidos.append(d["id"])
            continue

        public_id = f"{CARPETA}/{d['id']}"
        print(f"[{i}/{len(pendientes)}] subiendo {d['id']} ({ruta_local.name})…", end=" ", flush=True)
        try:
            resultado = subir_uno(ruta_local, public_id, cloud_name, api_key, api_secret)
        except Exception as e:  # noqa: BLE001 — se quiere seguir con el resto pase lo que pase
            print(f"ERROR: {e}")
            fallidos.append(d["id"])
            continue

        mapa[d["id"]] = {
            "publicId": resultado["public_id"],
            "url": resultado["secure_url"],
            "formato": resultado.get("format"),
            "ancho": resultado.get("width"),
            "alto": resultado.get("height"),
            "bytes": resultado.get("bytes"),
        }
        MAPA.write_text(json.dumps(mapa, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print("ok")

    print(f"\nListo. {len(mapa)} medios en {MAPA.relative_to(RAIZ)}.")
    if fallidos:
        print(f"{len(fallidos)} fallaron o no se encontraron localmente:")
        for f in fallidos:
            print(f"  - {f}")
        sys.exit(1)


if __name__ == "__main__":
    main()
