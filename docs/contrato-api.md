# Contrato de API — v1

Este documento describe la forma de los datos en `data/api/v1/`. Es, a la
vez, la especificación de los archivos JSON de esta entrega **y** el
contrato que deberá implementar la futura API REST en Laravel — para que
migrar de archivos estáticos a un backend real sea cambiar la variable
`API_BASE` en el cliente, no reescribir cómo se consumen los datos.

## Envelope

Todo recurso sigue el formato de `JsonResource` / `ResourceCollection` de
Laravel:

```jsonc
// Recurso único
{ "data": { /* ... */ } }

// Colección simple
{ "data": [ /* ... */ ], "meta": { "total": 12 } }

// Colección paginada
{
  "data": [ /* ... */ ],
  "meta": { "current_page": 1, "last_page": 32, "per_page": 9, "total": 290 },
  "links": { "first": "…", "last": "…", "prev": null, "next": "…" }
}
```

## Recursos

| Ruta relativa a `/api/v1/` | Forma | Descripción |
|---|---|---|
| `meta.json` | objeto | Metadatos de la extracción: fecha, versión, conteos |
| `contacto.json` | recurso único | Redes sociales, mapa, datos pendientes de confirmar |
| `institucional/direcciones.json` | colección | Las direcciones municipales, con directorio telefónico |
| `institucional/{slug}.json` | recurso único | Página institucional (alcaldía, concejo, datos del cantón…) |
| `institucional/marca.json` | recurso único | Logotipos y favicon (rutas a los SVG) |
| `tramites/index.json` | colección | Listado liviano de trámites (sin requisitos/pasos completos) |
| `tramites/categorias.json` | array de strings | Categorías por intención ciudadana |
| `tramites/perfiles.json` | array de strings | Perfiles de usuario |
| `tramites/{slug}.json` | recurso único | Ficha completa de un trámite — ver esquema abajo |
| `noticias/index.json` | colección | Listado liviano de todas las noticias |
| `noticias/page-{n}.json` | colección paginada | Página `n` tal como la pagina el sitio origen (32 páginas) |
| `noticias/{slug}.json` | recurso único | Noticia completa, con cuerpo e imágenes |
| `turismo/{slug}.json` | recurso único | Lugares, rutas, Coca Zoo, Coca antiguo |
| `transparencia/{slug}.json` | recurso único | LOTAIP, PAC, rendición de cuentas, ordenanzas, etc. |
| `search/index.json` | colección | Documentos completos para búsqueda léxica (MiniSearch) |
| `search/chunks.json` | colección | Contenido troceado; de aquí sale el corpus del asistente |

## Endpoints de servidor

Estas dos rutas **no** son archivos JSON estáticos: las sirve SvelteKit. Por
eso viven bajo `/api/` a secas y no bajo `/api/v1/`, que es donde se sirven
los archivos del contrato de arriba. Mezclarlas sería una trampa para quien
lea el árbol de rutas.

| Ruta | Método | Descripción |
|---|---|---|
| `/api/health` | GET | Healthcheck de Coolify. `{ "estado": "ok" }` |
| `/api/asistente` | POST | Asistente ciudadano |

### `POST /api/asistente`

Petición:

```jsonc
{ "mensaje": "quiero poner un local" }   // 2-500 caracteres
```

Respuesta:

```jsonc
{
  "consulta": "quiero poner un local",
  // "alta" | "media" | "baja" — calibrado, no estimado a ojo:
  // ver docs/arquitectura.md y scripts/evaluar-recuperacion.ts
  "confianza": "media",
  // null cuando no hay nada suficientemente relevante
  "ficha": {
    "clase": "tramite",          // tramite | pagina | noticia | direccion
    "titulo": "Patente por primera vez persona jurídica",
    "url": "/tramites/patente-por-primera-vez-persona-juridica-17",
    "entradilla": "Es el Permiso de funcionamiento obligatorio…",
    "datos": [{ "etiqueta": "Dónde se hace", "valor": "DIRECCIÓN FINANCIERA" }],
    "requisitos": ["1. Certificado de no adeudar al municipio…"],
    "pasos": [{ "titulo": "…", "descripcion": "…" }],
    "documentos": [{ "titulo": "…", "url": "…", "tipo": "pdf" }],
    "telefonos": [{ "cargo": "JEFE DE RENTAS", "extension": "1440" }],
    // la fuente municipal reconoce que esta ficha está incompleta
    "requiereRevision": true
  },
  "alternativas": [{ "titulo": "…", "url": "…", "tipo": "tramite" }],
  "noticias": [{ "titulo": "…", "url": "…", "tipo": "noticia" }],
  // frase redactada por el modelo local; null si la fase 2 está apagada
  "parrafo": null,
  "contacto": { "correo": "…", "nota": "…", "redes": [] }
}
```

Todos los campos de `ficha` salen literalmente de `data/api/v1/`. El único
texto que no está copiado de la fuente municipal es `parrafo`, y por eso va
marcado aparte en la interfaz.

Errores: `400` (mensaje vacío o demasiado largo), `429` (más de 30
consultas en 10 minutos desde la misma IP), `503` (`ASISTENTE_ACTIVO=false`).

`media/manifest.json` (fuera de `api/v1/`, es el catálogo de medios) lista
cada imagen/logo descargado: hash, ruta original, derivados WebP, alt y si
el alt está pendiente de redacción humana.

## Esquema de trámite (el recurso central)

Ver `tools/scraper/schemas/tramite.schema.json` para la definición formal.
Campos clave:

- `requisitos[]` y `pasos[]` — nunca se inventan. Si la fuente no describe
  un procedimiento paso a paso (la mayoría solo lista requisitos), `pasos`
  queda `[]`.
- `requiere_revision_editorial: true` marca los trámites donde el
  clasificador automático no encontró una sección de requisitos ni de
  pasos reconocible — señal para que la dirección responsable redacte o
  confirme el contenido antes de publicarlo.
- `contenido_adicional[]` conserva, como HTML, cualquier sección del
  trámite original que no calzó en ningún campo estructurado. Así no se
  pierde información aunque no se haya podido clasificar automáticamente.
- `categorias[]` y `perfiles[]` se infieren por palabras clave del propio
  texto del trámite — son una primera pasada útil para la navegación por
  intención, pero deben revisarse editorialmente antes de darlas por
  definitivas.

## Endpoints reservados (fase 3, sin implementar en esta entrega)

| Endpoint | Función |
|---|---|
| `GET /api/v1/busqueda?q=` | Búsqueda léxica — ya funciona en `/buscar` contra `search/index.json` |
| `GET /api/v1/recomendaciones?perfil=` | Trámites sugeridos por perfil — ya funciona con reglas simples sobre `perfiles[]` |


Los dos endpoints de IA que esta tabla reservaba —búsqueda semántica y
asistente— **ya están implementados**, pero no aquí: viven en
`POST /api/asistente`, documentado más arriba. Cambiaron de sitio porque
`/api/v1/*` se sirve como archivos estáticos desde el symlink
`app/static/api`, y una ruta de servidor ahí dentro conviviría con archivos
JSON reales. Cambiaron también de forma: la respuesta no es un chat, es una
ficha copiada literalmente de la fuente municipal, y el modelo corre en el
propio contenedor en vez de en un servicio externo.
