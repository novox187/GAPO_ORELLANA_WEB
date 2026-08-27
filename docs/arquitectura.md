# Arquitectura técnica

El frontend en SvelteKit ya está construido (ver `app/`). Este documento
recoge las decisiones que lo sostienen y el rumbo pendiente: el backend en
Laravel y la capa de IA.

## Frontend — SvelteKit

- **SvelteKit 2** (runas de Svelte 5) + TypeScript + Tailwind v4, usando
  los tokens definidos en `app/src/app.css`.
- **`adapter-node`**, empaquetado en un `Dockerfile` multi-stage (build →
  runtime con solo `node_modules` de producción), pensado para desplegarse
  como aplicación Node en **Coolify**: variable `ORIGIN` configurada,
  puerto expuesto vía `PORT`, y un endpoint `GET /api/health` para el
  healthcheck de Coolify.
- Las rutas `/api/v1/*` de esta entrega se sirven primero como archivos
  estáticos (estos JSON) y, cuando exista Laravel, SvelteKit las consume
  vía `fetch` a `API_BASE` — sin cambiar cómo los componentes leen los
  datos, porque el envelope es idéntico.
- Islas de interactividad mínimas: la mayoría de páginas son contenido
  estático renderizado en servidor; el buscador y el checklist de
  requisitos de un trámite son las piezas que necesitan JS en cliente.

### Desplegar en Coolify — dos cosas que hay que configurar a mano

El `Dockerfile` (raíz del repo) y `.dockerignore` ya están listos y
probados (`docker build` + `docker run` locales, las 10 rutas principales
responden 200). Dos variables de entorno no son opcionales:

1. **`ORIGIN` debe apuntar al puerto interno del contenedor
   (`http://localhost:3000`), NO al dominio público.** Contraintuitivo,
   pero necesario: `data/api/v1/*.json` se sirven como archivos
   estáticos, no como rutas de SvelteKit, así que cuando un `load()`
   hace `fetch('/api/v1/…')` durante el renderizado en servidor, adapter-node
   tiene que resolver esa URL relativa a una absoluta y hacer una petición
   HTTP real *a sí mismo* — no hay atajo interno para archivos estáticos
   como sí lo hay para rutas `+server.ts`. Esa URL absoluta la construye
   con `ORIGIN`. Si `ORIGIN` fuera el dominio público, el contenedor
   intentaría salir a internet y volver a entrar por Traefik para
   pedirse una página a sí mismo — y sin ese *hairpin* bien enrutado el
   resultado es `TypeError: fetch failed` y la portada cae con 500.
   Verificado: con `ORIGIN=http://localhost:3000` las 10 rutas
   principales responden 200; con el dominio público, todas caen.
   Poner el dominio público en `ORIGIN` no rompe nada más porque el sitio
   no tiene formularios `POST`, ni cookies, ni `redirect()`, ni ningún
   código que dependa de conocer su origen real — se comprobó con
   `grep` sobre todo `src/`. Si en el futuro se añade autenticación,
   pagos o cualquier cosa con estado, este punto hay que revisitarlo.
2. **El volumen de medios ya no hace falta — las fotos salen de
   Cloudinary.** `media/originales/` y `media/derivados/` (2 GB) no están
   en git por peso (ver `.gitignore` y el README); un `git clone` fresco
   —que es lo que hace Coolify— no los trae, y el build de Docker no
   fallaba por su ausencia: Vite simplemente no copiaba lo que no
   encontraba, y la imagen quedaba servible pero sin fotografías. En vez
   de resolver esto con un volumen persistente (la opción obvia, y la que
   se documentaba aquí antes), las 357 imágenes del catálogo se subieron
   a Cloudinary una sola vez con `tools/cloudinary/` — ver esa sección más
   abajo. El contenedor sigue imprimiendo un aviso en sus logs de arranque
   si detecta `media/originales` vacío, por si en el futuro se añade
   contenido que no pase por Cloudinary.

### Imágenes en Cloudinary (`tools/cloudinary/`)

Las 357 fotografías y logos del catálogo (`media/manifest.json`) viven en
Cloudinary, no en el servidor. `rutaOriginal` y `rutaDerivados` en
`data/api/v1/**/*.json` son URLs absolutas de Cloudinary — mismos nombres
de campo que antes, así que `img()` en `api.ts` y todos los componentes
`.svelte` no cambiaron ni una línea. Cada objeto de medio también lleva
`cloudinaryPublicId`, sin consumidor todavía; queda para administrar o
volver a transformar el activo sin recuperar el id a mano.

Cómo se hizo, para repetirlo si hace falta (nueva sección del sitio,
recuperación de un fallo, etc.):

1. `tools/cloudinary/subir.py` sube `media/originales/` a Cloudinary y
   deja el mapa id → URL en `media/cloudinary.json`. Reanudable: escribe
   el mapa después de cada subida, así que interrumpirlo no pierde
   progreso.
2. `tools/cloudinary/reescribir.py` recorre `data/api/v1/**/*.json`,
   `media/manifest.json` y los seis literales de `secciones.ts`,
   sustituyendo cada ruta local por su URL de Cloudinary. Las variantes de
   400/800/1600 px no se suben aparte: se piden por URL con
   `w_<ancho>,f_auto,q_auto` insertado antes del `public_id`, y Cloudinary
   las genera al vuelo.
3. Credenciales en `tools/cloudinary/.env` (no versionado), nunca en el
   código ni en el chat.

**Límite de 10 MB del plan gratuito.** 64 de las 357 fotos —capturas de
cámara de hasta 7000 px de lado— superaban el límite de subida del plan
gratuito de Cloudinary (10.485.760 bytes exactos; el error de la propia
API lo confirma byte a byte). `subir.py` las reescala antes de subir
(lado máximo 2400 px, re-encoded a JPEG calidad 90, bajando si hiciera
falta) — no es un recorte forzado por el límite: el sitio nunca sirve
nada a más de 1600 px, así que subir el original de 20 megapíxeles sin
tocar habría sido peso muerto de todos modos. El reescalado sólo afecta
al archivo que se sube; `media/originales/` (el máster) no se toca.

## Backend — Laravel

- **Laravel 12** como segundo servicio en el mismo Coolify.
- Modelos que reflejan 1:1 los recursos de `data/api/v1/`: `Tramite`,
  `Direccion`, `Noticia`, `PaginaInstitucional`, con `JsonResource` /
  `ResourceCollection` configurados para producir exactamente el mismo
  envelope que ya está en los archivos JSON de esta entrega — la migración
  de datos es un `Seeder` que lee esos JSON.
- Panel de administración simple (Laravel + Filament, o un CRUD propio)
  para que Comunicación Social publique noticias y actualice trámites sin
  tocar código — el problema de fondo que hace que hoy el sitio dependa de
  quien sepa editar las plantillas Django.
- **Postgres** como base de datos, con la extensión **pgvector** ya
  incluida desde el inicio para no migrar de motor cuando llegue la
  búsqueda semántica.

## Capa de IA (fase 3)

No se implementa en esta entrega; queda diseñada para no romper nada al
añadirla después.

- **Embeddings:** `multilingual-e5-small` (384 dimensiones, multilingüe,
  ~120 MB) — corre en el navegador vía `transformers.js` o como sidecar
  Python liviano. Suficientemente pequeño para el presupuesto de
  infraestructura de un municipio.
- **Almacenamiento vectorial:** Postgres + `pgvector`, en el mismo Coolify
  — sin depender de un servicio externo de pago.
- **Búsqueda semántica** (`POST /api/v1/busqueda/semantica`): sobre
  `search/chunks.json`, que ya viene troceado y con `perfiles[]` asociado
  por chunk.
- **Chatbot de atención ciudadana** (`POST /api/v1/asistente/consulta`):
  **RAG estricto**. El modelo solo responde con base en los chunks
  recuperados y **siempre cita la ficha oficial** de la que salió la
  respuesta. Si no hay un chunk suficientemente relevante, deriva a
  contacto humano en vez de inventar una respuesta. Un chatbot municipal
  que inventa un requisito de trámite es un problema legal, no un bug de
  UX — por eso esto no es negociable en el diseño.
- **Recomendación de trámites por perfil:** ya funciona hoy sin ningún
  modelo, con reglas simples sobre `perfiles[]` (`GET
  /api/v1/recomendaciones?perfil=emprendedor`). La fase 3 puede
  sofisticarla con historial de navegación, pero el mínimo útil no
  necesita IA.

## Por qué esta combinación

SvelteKit compila a muy poco JavaScript de cliente, lo que importa en un
sitio municipal donde buena parte de los visitantes entra desde datos
móviles limitados. Laravel da un panel de administración maduro y rápido
de construir para un equipo de comunicación no técnico. Ambos corren como
contenedores Docker simples en Coolify, sin atarse a un proveedor cloud
específico — relevante para contratación pública, donde depender de un solo
proveedor extranjero puede ser un problema administrativo en sí mismo.
