# Dockerfile multi-stage para desplegar en Coolify como aplicación Node
# (adapter-node). El contexto de build es la RAÍZ del repositorio, no
# app/: `app/static/media` y `app/static/api` son symlinks a `../../media`
# y `../../data/api`, y Vite los resuelve copiando su contenido dentro de
# `build/client` durante el build — así que ese contenido tiene que existir
# dentro del contexto que llega a Docker.
#
# `data/api/` sí está versionado (400 archivos JSON, ~4 MB) y se copia tal
# cual. `media/originales/` y `media/derivados/` (2 GB) NO están en git por
# peso — ver .gitignore y README. Si no existen en el contexto, el build
# no falla: Vite simplemente no copia lo que no encuentra, y la imagen
# queda sin esas carpetas locales — pero eso ya no importa para las fotos:
# el catálogo entero vive en Cloudinary (tools/cloudinary/, ver
# docs/arquitectura.md) y los JSON de data/api/v1 apuntan ahí con URLs
# absolutas. `media/originales`/`derivados` sólo son la caché local del
# extractor.
#
# ─── Por qué `slim` y no `alpine` ────────────────────────────────────────
# El asistente ciudadano (`/asistente`) ejecuta un modelo de embeddings
# dentro de este contenedor, vía @huggingface/transformers. Esa librería
# importa `onnxruntime-node` incondicionalmente al cargarse, y
# onnxruntime-node no publica binarios para musl: en Alpine el proceso
# revienta en el primer `import`, no en la primera consulta. `node:22-slim`
# es glibc y funciona. El coste son ~30 MB más de imagen base.

FROM node:22-slim AS build
WORKDIR /repo

# Capa de dependencias por separado para aprovechar la caché de Docker:
# cambiar código no debería forzar un npm ci completo otra vez.
COPY app/package.json app/package-lock.json ./app/
RUN cd app && npm ci

# Los pesos del modelo (~135 MB) en su propia capa, ANTES de copiar el
# código: si fueran parte del paso siguiente, tocar un componente los
# volvería a descargar en cada compilación.
COPY app/scripts/modelo.ts app/scripts/descargar-modelo.ts ./app/scripts/
RUN cd app && node scripts/descargar-modelo.ts

COPY app ./app
COPY data/api ./data/api
COPY media/manifest.json ./media/manifest.json

# `npm run build` dispara `prebuild`, que vectoriza los 524 fragmentos del
# corpus contra el modelo que acabamos de dejar en app/modelos/. Son unos
# 35 s de CPU y es la única vez que se calculan: en ejecución sólo se
# embebe la consulta del ciudadano.
RUN cd app && npm run build


FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# `curl`: la imagen slim no lo trae (comprobado). Coolify healthchequea el
# contenedor ejecutando curl *dentro* de él, no desde fuera. El primer
# despliegue con el healthcheck activado falló por esto exacto ("curl: not
# found", WARNING de Coolify) y forzó un rollback automático a la versión
# anterior. Sin esta línea, activar el healthcheck en Coolify rompe el
# despliegue en vez de vigilarlo.
RUN apt-get update \
	&& apt-get install -y --no-install-recommends curl \
	&& rm -rf /var/lib/apt/lists/*

# Solo dependencias de producción en la imagen final: svelte-check,
# TypeScript y el resto de devDependencies no viajan al contenedor.
# @huggingface/transformers y onnxruntime-node SÍ, porque están en
# `dependencies`: el servidor los carga en ejecución para embeber la
# consulta.
COPY app/package.json app/package-lock.json ./
# El `npm ci` y la poda van en el MISMO `RUN` a propósito: borrar archivos
# en una capa posterior no reduce la imagen, porque la capa anterior sigue
# conteniéndolos. Medido: separados, la imagen se quedaba en 1,63 GB aunque
# el contenedor sólo viera 94 MB de node_modules.
#
# onnxruntime-node se instala con 513 MB de binarios precompilados para
# todas las plataformas y todos los aceleradores. En un contenedor Linux
# sin GPU sobra casi todo:
#
#   316 MB  libonnxruntime_providers_cuda.so   — GPU NVIDIA
#   124 MB  bin/napi-v6/win32                  — Windows
#    35 MB  bin/napi-v6/darwin                 — macOS
#   130 MB  onnxruntime-web                    — backend WASM del navegador
#
# Se van 605 MB de la imagen. Los binarios de Linux (`libonnxruntime.so.1`,
# `onnxruntime_binding.node` y el proveedor compartido) se conservan para
# todas las arquitecturas, así que la imagen sigue construyéndose igual en
# x64 y en arm64.
#
# Si algún día esto rompe algo, el síntoma sería un error al cargar el
# modelo en el arranque. Se comprueba levantando el contenedor y lanzando
# una consulta a POST /api/asistente: si devuelve una ficha, la poda está
# bien. Verificado así antes de añadirla.
RUN npm ci --omit=dev \
	&& npm cache clean --force \
	&& rm -rf node_modules/onnxruntime-node/bin/napi-v*/win32 \
		node_modules/onnxruntime-node/bin/napi-v*/darwin \
		node_modules/onnxruntime-web \
	&& find node_modules/onnxruntime-node/bin \
		\( -name 'libonnxruntime_providers_cuda.so' \
		-o -name 'libonnxruntime_providers_tensorrt.so' \) -delete

COPY --from=build /repo/app/build ./build

# El modelo viaja en la imagen. En ejecución, `src/lib/server/recuperacion.ts`
# arranca con las descargas remotas deshabilitadas: un servidor municipal no
# debe salir a internet a buscar pesos en la primera consulta de un
# ciudadano. Si esta carpeta faltara, el error es inmediato y explícito.
COPY --from=build /repo/app/modelos ./modelos

# adapter-node lee PORT y ORIGIN de variables de entorno; Coolify las
# inyecta según la configuración de la aplicación.
ENV PORT=3000
EXPOSE 3000

CMD ["node", "build/index.js"]
