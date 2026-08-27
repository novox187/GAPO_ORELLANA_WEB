#!/usr/bin/env python3
"""
Cliente mínimo para la API de Coolify (self-hosted, v4). Sin dependencias
más allá de `requests`.

Uso:
    from cliente import Coolify
    c = Coolify()
    c.get("/projects")
    c.post("/applications/dockerfile", json={...})

Credenciales en tools/coolify/.env (no versionado):
    COOLIFY_URL=http://72.61.103.182:8000
    COOLIFY_TOKEN=...

Por qué existe este archivo separado en vez de repetir la lectura de
credenciales en cada script: create_app.py, listar.py, etc. van a
necesitar la misma sesión autenticada, y el token nunca debería tener más
de un punto de entrada al código.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import requests

RAIZ = Path(__file__).resolve().parents[2]
ARCHIVO_ENV = Path(__file__).resolve().parent / ".env"


def _cargar_env_local() -> None:
    if not ARCHIVO_ENV.exists():
        return
    for linea in ARCHIVO_ENV.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if not linea or linea.startswith("#") or "=" not in linea:
            continue
        clave, _, valor = linea.partition("=")
        os.environ.setdefault(clave.strip(), valor.strip())


class Coolify:
    def __init__(self) -> None:
        _cargar_env_local()
        url = os.environ.get("COOLIFY_URL")
        token = os.environ.get("COOLIFY_TOKEN")
        if not url or not token:
            print("Faltan COOLIFY_URL / COOLIFY_TOKEN.", file=sys.stderr)
            print(f"Escríbelas en {ARCHIVO_ENV.relative_to(RAIZ)}.", file=sys.stderr)
            sys.exit(1)

        self.base = url.rstrip("/") + "/api/v1"
        self.sesion = requests.Session()
        self.sesion.headers["Authorization"] = f"Bearer {token}"
        self.sesion.headers["Accept"] = "application/json"

    def get(self, ruta: str, **kw):
        r = self.sesion.get(self.base + ruta, timeout=30, **kw)
        return r

    def post(self, ruta: str, **kw):
        r = self.sesion.post(self.base + ruta, timeout=30, **kw)
        return r

    def patch(self, ruta: str, **kw):
        r = self.sesion.patch(self.base + ruta, timeout=30, **kw)
        return r
