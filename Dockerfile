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

FROM node:22-alpine AS build
WORKDIR /repo

# Capa de dependencias por separado para aprovechar la caché de Docker:
# cambiar código no debería forzar un npm ci completo otra vez.
COPY app/package.json app/package-lock.json ./app/
RUN cd app && npm ci

COPY app ./app
COPY data/api ./data/api
COPY media/manifest.json ./media/manifest.json

RUN cd app && npm run build


FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# `curl`: alpine no lo trae de fábrica. Coolify healthchequea el
# contenedor ejecutando curl/wget *dentro* de él (no desde fuera), y el
# wget de busybox que sí viene incluido no le sirve — el primer despliegue
# con el healthcheck activado falló por esto exacto ("curl: not found",
# WARNING de Coolify) y forzó un rollback automático a la versión
# anterior. Sin esta línea, activar el healthcheck en Coolify rompe el
# despliegue en vez de vigilarlo.
RUN apk add --no-cache curl

# Solo dependencias de producción en la imagen final: svelte-check,
# TypeScript y el resto de devDependencies no viajan al contenedor.
COPY app/package.json app/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /repo/app/build ./build

# adapter-node lee PORT y ORIGIN de variables de entorno; Coolify las
# inyecta según la configuración de la aplicación.
ENV PORT=3000
EXPOSE 3000

CMD ["node", "build/index.js"]
