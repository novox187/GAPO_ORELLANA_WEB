#!/usr/bin/env python3
"""Extrae el subconjunto de OpenMoji que sirve `static/openmoji/`.

De los 4495 emoji que trae el paquete `openmoji` se descartan dos grupos:

- Las variantes de tono de piel (`skintone != ""`): serían duplicados casi
  idénticos de la misma cara/mano en cinco tonos, y elegir uno multiplicaría
  el catálogo sin añadir conceptos nuevos. Queda el tono por defecto.
- El grupo `component`: piezas de construcción (el propio modificador de
  tono, por ejemplo) que no son un emoji por sí solas.

De 4495 quedan 2456 — el tamaño habitual de un selector de emoji, no una
lista recortada a mano: es la totalidad de OpenMoji menos lo que no es un
concepto independiente.

Se copian sólo los SVG a color (`color/svg/`), no los de contorno
(`black/svg/`) ni los PNG en varios tamaños que también trae el paquete: un
único formato vectorial basta para cualquier tamaño de pantalla.

Uso:
    npm install --no-save openmoji@17.0.0   # si no está ya
    python3 scripts/openmoji/extraer.py
"""
import json
import pathlib
import shutil

RAIZ = pathlib.Path(__file__).resolve().parents[2]
ORIGEN = RAIZ / 'node_modules' / 'openmoji'
DESTINO_SVG = RAIZ / 'static' / 'openmoji'
DESTINO_INDICE = RAIZ / 'static' / 'openmoji-indice.json'


def main() -> None:
    if not ORIGEN.exists():
        raise SystemExit(
            'Falta node_modules/openmoji. Instálalo primero:\n'
            '  npm install --no-save openmoji@17.0.0'
        )

    datos = json.loads((ORIGEN / 'data' / 'openmoji.json').read_text())
    seleccion = [x for x in datos if x['skintone'] == '' and x['group'] != 'component']

    DESTINO_SVG.mkdir(parents=True, exist_ok=True)
    for f in DESTINO_SVG.glob('*.svg'):
        f.unlink()

    copiados = 0
    indice = []

    def orden(e: dict) -> float:
        try:
            return float(e['order'])
        except (TypeError, ValueError):
            # Un puñado de entradas de `extras-openmoji` no traen `order`;
            # van al final, agrupadas, en vez de romper la extracción.
            return float('inf')

    for x in sorted(seleccion, key=orden):
        origen_svg = ORIGEN / 'color' / 'svg' / f"{x['hexcode']}.svg"
        if not origen_svg.exists():
            continue

        shutil.copy2(origen_svg, DESTINO_SVG / origen_svg.name)
        copiados += 1

        indice.append({
            'hex': x['hexcode'],
            'g': x['group'],
            'sg': x['subgroups'],
            'n': x['annotation'],
            't': x['tags'],
        })

    DESTINO_INDICE.write_text(
        json.dumps(indice, ensure_ascii=False, separators=(',', ':')),
        encoding='utf-8',
    )

    peso = sum(f.stat().st_size for f in DESTINO_SVG.glob('*.svg')) / 1024 / 1024
    print(f'SVG copiados: {copiados} ({peso:.1f} MB) -> {DESTINO_SVG}')
    print(f'Índice: {len(indice)} entradas -> {DESTINO_INDICE}')


if __name__ == '__main__':
    main()
