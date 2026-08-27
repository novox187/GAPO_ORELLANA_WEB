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
| `search/chunks.json` | colección | Contenido troceado, listo para generar embeddings (fase 3) |

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
| `POST /api/v1/busqueda/semantica` | Búsqueda semántica sobre `search/chunks.json` (requiere embeddings) |
| `POST /api/v1/asistente/consulta` | Chatbot RAG — responde solo citando trámites/noticias reales |
