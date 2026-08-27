# Rediseño del sitio web del GAD Municipal Francisco de Orellana

Sitio municipal nuevo para Puerto Francisco de Orellana (El Coca), en la
Amazonía ecuatoriana. Dos piezas: un extractor que libera todo el contenido
público de `orellana.gob.ec` a JSON con forma de API REST, y una aplicación
SvelteKit que lo consume.

## Qué hay aquí

```
app/             Aplicación SvelteKit 2 + Svelte 5 + Tailwind v4
tools/scraper/   Extractor de contenido (Node + TypeScript)
data/api/v1/     La API REST simulada: un JSON por recurso
data/raw/        Caché del HTML original descargado (no se versiona)
media/           Imágenes y logos descargados (no se versionan; sí el catálogo)
docs/            Arquitectura, contrato de API, accesibilidad, deuda heredada
```

## Levantar la aplicación

```bash
cd app
npm install
npm run dev
```

Abre `http://localhost:5173`. La app lee `data/api/v1/` y `media/` a través
de dos symlinks en `app/static/`, con el mismo envelope `{ data, meta, links }`
que producirá la futura API en Laravel: migrar será apuntar el cliente
(`app/src/lib/api.ts`) a otra URL base.

### Imágenes de la portada

`app/static/img/portada/` guarda los tres fotogramas del héroe, ya
recortados y convertidos a WebP en dos anchos (960 px para móvil, 1920 px
para escritorio). Sí se versionan — pesan 575 KB en total y salen de
`media/originales/`, que no está en el repositorio. Para rehacerlos tras
un `--only=all`:

```bash
O=media/originales; D=app/static/img/portada
# Puente sobre el Napo al anochecer (ya viene limpio, sin rótulo encima)
magick app/static/img/napo-amanecer.jpg -resize 1920x -quality 82 $D/puente-napo.webp
magick app/static/img/napo-amanecer.jpg -resize 960x  -quality 78 $D/puente-napo-960.webp
# Laguna de Añangu — el recorte quita el rótulo "LAGUNA DE AÑANGU" de la campaña
magick $O/d691ce970c4028b2.jpg -crop 781x391+0+110 +repage -filter Lanczos -resize 1920x -quality 82 $D/laguna-anangu.webp
magick $O/d691ce970c4028b2.jpg -crop 781x391+0+110 +repage -resize 960x -quality 78 $D/laguna-anangu-960.webp
# Mirador de Añangu — el recorte quita el pin del pie
magick $O/cd82af8e6d7e3b30.jpg -crop 781x368+0+0 +repage -filter Lanczos -resize 1920x -quality 82 $D/mirador-anangu.webp
magick $O/cd82af8e6d7e3b30.jpg -crop 781x368+0+0 +repage -resize 960x -quality 78 $D/mirador-anangu-960.webp
```

Son fotografías del propio archivo del municipio (la campaña "Quédate en
El Coca" y el reportaje de lugares turísticos), no de banco de imágenes.
El recorte sólo elimina los rótulos que la campaña llevaba incrustados;
no se retoca la fotografía.

> Al crear rutas o componentes nuevos hay que **reiniciar `npm run dev`**:
> Tailwind v4 no re-escanea archivos que no existían cuando arrancó el
> servidor, y sus clases no llegan a generarse. La compilación de
> producción sí los detecta.

### Rutas

| Ruta | Contenido |
|---|---|
| `/` | Portada: apertura fotográfica a pantalla completa + accesos por intención |
| `/tramites`, `/tramites/[slug]` | 60 trámites de 11 direcciones |
| `/noticias`, `/noticias/[slug]` | 280 noticias en feed, con filtro por año |
| `/transparencia`, `/transparencia/[slug]` | LOTAIP, ordenanzas, rendición de cuentas |
| `/canton`, `/canton/[slug]` | Historia, símbolos, alcaldía, turismo |
| `/contacto` | Directorio de 20 direcciones y 104 extensiones |
| `/buscar` | Búsqueda léxica sobre 358 documentos |

## Re-generar los datos

```bash
cd tools/scraper
npm install
node src/index.ts --only=institucional   # institucional + direcciones + contacto + marca
node src/index.ts --only=tramites        # los 60 trámites de las 11 direcciones
node src/index.ts --only=noticias        # 280 noticias, 32 páginas de listado
node src/index.ts --only=turismo
node src/index.ts --only=transparencia
node src/index.ts --only=all             # consolida todo + índice de búsqueda + manifiesto de media
node src/validate.ts                     # valida los JSON contra sus schemas
```

Cada etapa cachea el HTML en `data/raw/` y los binarios en
`media/originales/`, así que repetir una etapa no vuelve a golpear el sitio
origen. El extractor respeta `robots.txt` (que permite indexación general)
con un user-agent identificable y ~1 solicitud/segundo.

**Un clon nuevo no trae las imágenes**: `media/originales/` y
`media/derivados/` están fuera del control de versiones por peso (2 GB y
92 MB). Se reconstruyen con `--only=all`.

## Documentos clave

- [`docs/contrato-api.md`](docs/contrato-api.md) — forma de cada recurso JSON.
- [`docs/arquitectura-informacion.md`](docs/arquitectura-informacion.md) — la regla de 3 clics y la taxonomía de trámites.
- [`docs/accesibilidad.md`](docs/accesibilidad.md) — checklist WCAG 2.1 AA aplicado.
- [`docs/arquitectura.md`](docs/arquitectura.md) — rumbo técnico: despliegue en Coolify, backend Laravel, capa de IA.
- [`docs/deuda-heredada.md`](docs/deuda-heredada.md) — hallazgos del sitio actual para reportar al municipio.

## Principio rector: no fabricar contenido municipal

Donde la fuente original no especifica un dato (un paso de trámite, un
texto alternativo de imagen, un teléfono de contacto), el campo queda vacío
y se marca explícitamente (`requiere_revision_editorial`, `altPendiente`,
notas en `contacto.json`) en vez de inventarse. Es información de un
gobierno local: la precisión importa más que la completitud aparente.

Por lo mismo, la interfaz no muestra controles que no hagan nada — el feed
de noticias no lleva botones de "me gusta" ni de comentarios, sólo
compartir, que sí funciona.

## Pendiente

- Los `alt` del archivo fotográfico y el paso a paso de los trámites que la
  fuente no detalla necesitan redacción humana.
- Las categorías y perfiles de trámites los infirió un clasificador por
  palabras clave: hay que revisarlos editorialmente.
- La compilación arrastra los 2 GB de `media/` por el symlink de
  `app/static/media`; conviene servir los medios aparte antes de desplegar.
