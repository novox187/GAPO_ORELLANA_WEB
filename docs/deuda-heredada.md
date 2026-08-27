# Deuda heredada del sitio actual (orellana.gob.ec)

Hallazgos verificados durante la extracción de contenido (agosto 2026), para
entregar al equipo municipal. Ninguno de estos problemas se replica en el
rediseño; se documentan aquí porque conviene resolverlos también en el sitio
que está en producción mientras se completa la migración.

## 1. Fuga de infraestructura interna

La portada pública enlaza a `http://192.168.0.40:28080/orellana` (una IP
privada, con el texto "Si estás ingresando desde el GAD haz clic aquí").
Publicar una IP interna en una página pública expone topología de red y es
un hallazgo típico de reconocimiento en una auditoría de seguridad. Se
recomienda quitar el enlace de la portada pública y, si ese acceso interno
debe existir, servirlo solo dentro de la VPN/red municipal.

## 2. Contraste de color insuficiente (falla WCAG 2.1 AA)

- `#09B75C` (verde marca) sobre fondo blanco ≈ **2.6:1**.
- `#E5C505` (amarillo marca) sobre fondo blanco ≈ **1.9:1**.

El mínimo exigido por WCAG 2.1 AA para texto normal es 4.5:1. Ambos colores
se usan hoy como texto y como fondo de botón con texto blanco encima en
varias secciones. El rediseño resuelve esto reservando esos tonos para
superficies/decoración y usando variantes más oscuras (`#006633`, `#00401F`,
`#8A7500`) para cualquier texto — ver `docs/accesibilidad.md`.

## 3. Tipografía sin licencia web acreditada

El sitio sirve `Futura` como archivo `.TTF` crudo desde `/static/fonts/`.
Futura es una fuente comercial; sin evidencia de una licencia de tipo
"webfont", exponerla como descarga directa es un riesgo de licenciamiento.
El rediseño usa **Jost**, una geométrica de licencia libre (SIL Open Font
License) con un carácter visual muy cercano al de Futura.

## 4. Página de contacto sin contenido

`/contactos/` solo contiene un `<iframe>` de Google Maps — no hay dirección,
teléfono ni correo en texto en esa página (se confirmó leyendo el HTML
completo, no solo lo renderizado). El pie de la portada tampoco los
incluye; solo hay enlaces a redes sociales. La ficha `contacto.json` del
rediseño refleja exactamente esto y dejó el campo explícito para que
Comunicación Social lo complete antes de publicar.

## 5. Contenido duplicado en Trámites municipales

En `/tramites_m/`, la Dirección de Turismo tiene **dos pestañas de trámite
distintas con el nombre idéntico** ("Solicitud para renovar la licencia
única anual de funcionamiento para el ejercicio de actividades turísticas",
IDs internos 2 y 3) con contenido HTML diferente entre ambas. Es un error de
carga de contenido en el sitio actual, no un artefacto de la extracción: se
preservaron ambas fichas tal cual, marcadas para que la Dirección de Turismo
determine cuál es la vigente y cuál debe eliminarse o corregirse.

## 6. Sin sitemap, metadatos OG vacíos en portada

No existe `/sitemap.xml` (devuelve 404). En la portada, las etiquetas
`og:title`, `og:description` y `og:image` están vacías — al compartir el
enlace de inicio en redes sociales no se muestra una vista previa útil (sí
funciona correctamente en las páginas de noticias individuales).

## 7. Dependencia de CDNs externos para funcionalidad básica

Bootstrap, Bootstrap Icons, jQuery, Popper, FullCalendar y pdf.js se cargan
desde `cdn.jsdelivr.net`, `code.jquery.com` y `cdnjs.cloudflare.com`. Si
cualquiera de esos CDN falla o es bloqueado por una red institucional (algo
frecuente en redes gubernamentales restrictivas), partes de la interfaz
dejan de funcionar. El rediseño empaqueta sus dependencias.

## 8. `robots.txt`

El `robots.txt` actual permite indexación general (`User-agent: * / Allow:
/`) y solo bloquea explícitamente a bots de entrenamiento de modelos de IA
(GPTBot, ClaudeBot, CCBot, Google-Extended, Bytespider, Amazonbot,
Applebot-Extended, meta-externalagent). Esta extracción de contenido se hizo
respetando esa política: con identificador de user-agent propio
(`GADMFO-Migracion/1.0`) y ~1 solicitud/segundo, como una migración de
contenido autorizada por el propio municipio — no como entrenamiento de IA
de terceros.
