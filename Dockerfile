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
# queda sin fotografías. Eso se resuelve en producción con un volumen
# persistente montado en /app/build/client/media (ver docs/arquitectura.md
# y el aviso que imprime este mismo Dockerfile en el stage de runtime).

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

# Solo dependencias de producción en la imagen final: svelte-check,
# TypeScript y el resto de devDependencies no viajan al contenedor.
COPY app/package.json app/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /repo/app/build ./build

# Aviso visible en los logs de arranque si el volumen de medios no está
# montado: preferible a un 404 silencioso en cada foto de la portada.
COPY <<'SH' /app/comprobar-medios.sh
#!/bin/sh
if [ ! -d /app/build/client/media/originales ]; then
	echo "AVISO: /app/build/client/media/originales no existe."
	echo "       Monta el volumen persistente de medios en esa ruta"
	echo "       (ver docs/arquitectura.md) o las fotografías del sitio"
	echo "       se verán rotas."
fi
exec node build/index.js
SH
RUN chmod +x /app/comprobar-medios.sh

# adapter-node lee PORT y ORIGIN de variables de entorno; Coolify las
# inyecta según la configuración de la aplicación.
ENV PORT=3000
EXPOSE 3000

CMD ["/app/comprobar-medios.sh"]
