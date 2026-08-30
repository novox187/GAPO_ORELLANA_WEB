# Dockerfile multi-stage para desplegar en Coolify como aplicación Node
# (adapter-node). El contexto de build es la RAÍZ del repositorio, no
# app/: `app/static/media` y `app/static/api` son symlinks a `../../media`
# y `../../data/api`, y Vite los resuelve copiando su contenido dentro de
# `build/client` durante el build — así que ese contenido tiene que existir
# dentro del contexto que llega a Docker.
#
# `data/api/` sí está versionado (400 archivos JSON, ~4 MB) y se copia tal
# cual: es el respaldo estático que sirve el sitio si Laravel no responde
# (ver src/lib/api.ts). `media/originales/` y `media/derivados/` (2 GB) NO
# están en git por peso — ver .gitignore y README. Si no existen en el
# contexto, el build no falla: Vite simplemente no copia lo que no
# encuentra, y eso ya no importa para las fotos, porque el catálogo entero
# vive en Cloudinary (tools/cloudinary/, ver docs/arquitectura.md) y los
# JSON de data/api/v1 apuntan ahí con URLs absolutas.
#
# ─── Este contenedor ya no ejecuta ningún modelo ─────────────────────────
# Hasta la migración a Laravel, el asistente ciudadano corría aquí dentro:
# @huggingface/transformers cargaba multilingual-e5-small y la imagen
# llevaba 135 MB de pesos más onnxruntime-node. Todo eso se fue con el
# motor: hoy el asistente vive en el backend (GAPO_ORELLANA_API), con los
# vectores en pgvector y el modelo en su propio microservicio, y este sitio
# se limita a llamar a su API.
#
# Queda `node:22-slim` y no `alpine` por prudencia, no por necesidad: la
# razón para evitar Alpine era que onnxruntime-node no publica binarios
# para musl, y ya no está. Cambiar a alpine ahorraría ~30 MB más y debería
# funcionar, pero es un cambio de imagen base que merece su propia prueba.

FROM node:22-slim AS build
WORKDIR /repo

# Capa de dependencias por separado para aprovechar la caché de Docker:
# cambiar código no debería forzar un npm ci completo otra vez.
COPY app/package.json app/package-lock.json ./app/
RUN cd app && npm ci

COPY app ./app
COPY data/api ./data/api
COPY media/manifest.json ./media/manifest.json

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

# El sitio ya no tiene dependencias de ejecución propias: adapter-node deja
# en `build/` todo lo que necesita para arrancar. Antes hacía falta un
# `npm ci --omit=dev` aquí para traer @huggingface/transformers y podarle a
# onnxruntime 605 MB de binarios de plataformas que este contenedor no usa;
# sin modelo, no hay nada que instalar ni que podar.
COPY --from=build /repo/app/build ./build

# adapter-node lee PORT y ORIGIN de variables de entorno; Coolify las
# inyecta según la configuración de la aplicación.
ENV PORT=3000
EXPOSE 3000

CMD ["node", "build/index.js"]
