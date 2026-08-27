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
