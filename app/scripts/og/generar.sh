#!/usr/bin/env bash
#
# Genera las tarjetas de previsualización (Open Graph, 1200×630) que se ven
# al compartir el sitio en WhatsApp, Facebook o X.
#
#   ./scripts/og/generar.sh
#
# Rasteriza `tarjeta.html` con el Chromium del sistema y optimiza el JPEG
# con ImageMagick. No añade ninguna dependencia al proyecto: se ejecuta a
# mano cuando cambie la marca o el texto de una tarjeta, y el resultado se
# versiona en `static/img/og/`.
#
# Requisitos: chromium (o google-chrome-stable) e ImageMagick.
set -euo pipefail

cd "$(dirname "$0")/../.."
AQUI="scripts/og"
DESTINO="static/img/og"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

NAVEGADOR="$(command -v chromium || command -v chromium-browser || command -v google-chrome-stable)"

# `--allow-file-access-from-files` es imprescindible: la plantilla carga el
# logotipo, los pictogramas y la tipografía desde el propio repositorio con
# fetch() sobre file://, y Chromium lo bloquea por defecto.
render() {
	local nombre="$1" consulta="$2"
	"$NAVEGADOR" \
		--headless \
		--disable-gpu \
		--hide-scrollbars \
		--force-device-scale-factor=2 \
		--allow-file-access-from-files \
		--virtual-time-budget=4000 \
		--window-size=1200,630 \
		--screenshot="$TMP/$nombre.png" \
		"file://$PWD/$AQUI/tarjeta.html?$consulta" >/dev/null 2>&1

	# Se rasteriza al doble y se reduce: el texto sale sin dientes de sierra.
	# JPEG y no WebP porque algunos rastreadores de vistas previas (X entre
	# ellos) todavía descartan WebP y dejan la tarjeta sin imagen.
	magick "$TMP/$nombre.png" -resize 1200x630 -strip -quality 86 \
		-sampling-factor 4:2:0 -interlace JPEG "$DESTINO/$nombre.jpg"
	printf '  %-16s %s\n' "$nombre.jpg" "$(du -h "$DESTINO/$nombre.jpg" | cut -f1)"
}

u() { printf '%s' "$1" | sed 's/ /%20/g; s/,/%2C/g; s/á/%C3%A1/g; s/é/%C3%A9/g; s/í/%C3%AD/g; s/ó/%C3%B3/g; s/ú/%C3%BA/g; s/ñ/%C3%B1/g; s/·/%C2%B7/g; s/—/%E2%80%94/g'; }

mkdir -p "$DESTINO"
echo "Generando tarjetas Open Graph en $DESTINO/"

render portada "foto=puente-napo&antetitulo=$(u 'Amazonía ecuatoriana')&titular=$(u 'El Coca, entrada al Yasuní')&bajada=$(u 'Trámites, obras, noticias y transparencia del cantón Francisco de Orellana.')"

render canton "foto=mirador-anangu&antetitulo=$(u 'El cantón')&titular=$(u 'Tres ríos, siete mil kilómetros de selva')&bajada=$(u 'Historia, símbolos, territorio y lugares por visitar del cantón.')"

render tramites "fondo=%230c843a&antetitulo=$(u 'Atención ciudadana')&titular=$(u 'Trámites municipales')&bajada=$(u 'Requisitos, costos y a dónde acudir, en una sola ficha por trámite.')&picto=tramitesciudadanos"

render transparencia "fondo=%231e1f1d&antetitulo=$(u 'Rendición de cuentas')&titular=$(u 'Transparencia')&bajada=$(u 'LOTAIP, ordenanzas, rendición de cuentas y contratación pública.')&picto=normativa"

render asistente "fondo=%23074d22&antetitulo=$(u 'Asistente ciudadano')&titular=$(u '¿Qué necesita hacer en el municipio?')&bajada=$(u 'Pregunte con sus palabras y reciba la ficha oficial del trámite.')&picto=cultura"

render noticias "foto=laguna-anangu&antetitulo=$(u 'Al día')&titular=$(u 'Actualidad del cantón')&bajada=$(u 'Obras, servicios y decisiones del gobierno municipal.')"

echo "Listo."
