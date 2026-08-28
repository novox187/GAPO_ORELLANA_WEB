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

## Capa de IA — el asistente ciudadano

Implementada. Vive en `/asistente` y responde en `POST /api/asistente`.

**Todo corre en infraestructura propia.** No se llama a ninguna API de IA de
terceros, ni en tiempo de ejecución ni en el build más allá de descargar los
pesos del modelo una vez. Ninguna pregunta de un ciudadano, ni ningún dato
del municipio, sale del contenedor. No es una preferencia técnica: en un
proyecto de gobierno, mandar consultas ciudadanas a un servicio externo es
una decisión sobre datos públicos que no corresponde tomar por omisión.

### Fase 1 — funciona sin GPU (implementada)

- **Modelo de embeddings dentro del contenedor**: `multilingual-e5-small`
  en ONNX cuantizado a 8 bits, servido por `@huggingface/transformers`.
  118 M parámetros, 135 MB en la imagen. Se descarga en el build
  (`scripts/descargar-modelo.ts`); en ejecución las descargas remotas van
  deshabilitadas.
- **Corpus vectorizado en el build** (`scripts/construir-corpus.ts`): los
  524 fragmentos de `search/chunks.json` con sus vectores, más el catálogo
  de rutas públicas y el directorio telefónico, a
  `src/lib/server/corpus.generado.json` (1,8 MB).
- **Recuperación híbrida** (`src/lib/server/recuperacion.ts`): coseno sobre
  los vectores y BM25 sobre el texto, fusionados con Reciprocal Rank
  Fusion. Las dos hacen falta: el vector entiende "quiero poner un local"
  → patente municipal; BM25 encuentra "OM-020-2021", que el vector diluye.
- **La ficha** (`src/lib/server/ficha.ts`): se arma copiando campo a campo
  de `data/api/v1/`. No hay generación de texto en ningún punto, así que es
  estructuralmente imposible que invente un requisito.

**Por qué vectores en memoria y no Postgres + pgvector**, como decía el
plan original: son 524 fragmentos. Comparar la consulta contra todos son
200 000 multiplicaciones, medio milisegundo. Montar un Postgres para eso es
infraestructura que hay que operar, respaldar y actualizar a cambio de
nada. Si el corpus creciera un orden de magnitud, el cambio es sustituir un
módulo — el resto no se entera.

### Dos decisiones que salieron de medir, no de suponer

Las dos están en `scripts/evaluar-recuperacion.ts`, que se puede volver a
ejecutar cuando cambie el contenido.

1. **Las noticias se recuperan aparte de lo oficial.** Son 280 de los 524
   fragmentos y están escritas en español narrativo, así que se parecen a
   una pregunta conversacional mucho más que el texto burocrático de un
   trámite. Mezcladas, "quiero poner un local" devolvía un operativo de
   control de patentes en vez del trámite, y "no me llega el agua" una
   noticia sobre entrega de agua gratuita. Separadas, las 17 consultas del
   banco de pruebas aciertan la ficha correcta.

2. **La confianza tiene tres tramos, y el intermedio dice que no está
   seguro.** El coseno de E5 vive comprimido entre 0,80 y 0,92: no tiene
   rango para distinguir "el municipio no hace esto" de "lo hace con otro
   nombre". Medido, las preguntas con respuesta y las que no se solapan.
   En vez de fingir un umbral que separe, se calibraron dos: por encima de
   `alta` no entró ninguna pregunta sin respuesta, por debajo de `baja` no
   cayó ninguna con respuesta, y en medio la interfaz dice "esto es lo más
   parecido que encontré" y deja el contacto humano a la vista.

### Fase 2 — el párrafo redactado (especificada, apagada)

`src/lib/server/redactor.ts` añade una frase que conecta la pregunta con la
ficha. Se enciende con `REDACTOR_URL` apuntando a un Ollama en la red
interna del mismo Coolify; vacío, el asistente funciona en fase 1 pura.

Necesita GPU para ser usable: un modelo de 3-4 B cuantizado en CPU tarda
entre 30 y 60 s por respuesta contando el procesado del contexto. Con una
GPU de 12 GB, un Qwen3 4B responde en 3-6 s.

Tres reglas la mantienen acotada:

1. **La tarea es diminuta**: recibe la ficha ya recuperada y escribe una
   frase, con tope de 80 tokens. No se le pide enumerar requisitos ni citar
   importes — para eso está la ficha. Un modelo al que no se le pide un
   dato no puede equivocarse en ese dato.
2. **Control numérico**: si el párrafo contiene una cifra que no aparece en
   la ficha, se descarta entero. Las alucinaciones peligrosas aquí son casi
   siempre números — un costo, un plazo, el número de una ordenanza.
3. **Timeout de 4 s y caída silenciosa**: servicio apagado, lento o roto
   producen exactamente lo mismo que la fase 1. El ciudadano ve su ficha y
   no se entera de que había un modelo.

### Lo que cambió en el despliegue

- **La imagen base pasó de `node:22-alpine` a `node:22-slim`.**
  `onnxruntime-node` no publica binarios para musl y
  `@huggingface/transformers` lo importa al cargarse: en Alpine el proceso
  revienta en el primer `import`, no en la primera consulta. Como slim
  tampoco trae `curl`, el `Dockerfile` lo instala — el healthcheck de
  Coolify lo ejecuta *dentro* del contenedor y su ausencia ya provocó un
  rollback una vez.
- **La imagen pesa 718 MB.** `onnxruntime-node` se instala con 513 MB de
  binarios para todas las plataformas y aceleradores, incluidos 316 MB de
  proveedor CUDA que en CPU no se usan. La poda va en el mismo `RUN` que
  el `npm ci`: en una capa posterior no habría reducido nada.
- **Lo único que hay que tocar en Coolify es opcional**
  (`ASISTENTE_ACTIVO`, y `REDACTOR_URL` cuando llegue la fase 2). Sin
  configurar nada, el asistente funciona.

### Medido en el contenedor de producción

| | |
|---|---|
| Consulta (embebido + recuperación + ficha) | 12-25 ms |
| Primera consulta tras arrancar | 25 ms — el modelo se precarga en `hooks.server.ts` |
| Carga del modelo al arrancar | ~700 ms, fuera del camino del ciudadano |
| Vectorización del corpus (sólo en el build) | ~35 s |
| Acierto en el banco de pruebas | 17/17 |
| Preguntas sin respuesta declaradas "alta" | 0 de 9 |

## Por qué esta combinación

SvelteKit compila a muy poco JavaScript de cliente, lo que importa en un
sitio municipal donde buena parte de los visitantes entra desde datos
móviles limitados. Laravel da un panel de administración maduro y rápido
de construir para un equipo de comunicación no técnico. Ambos corren como
contenedores Docker simples en Coolify, sin atarse a un proveedor cloud
específico — relevante para contratación pública, donde depender de un solo
proveedor extranjero puede ser un problema administrativo en sí mismo.
