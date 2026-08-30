# Posicionamiento e identidad del sitio

Cómo se presenta este sitio ante los buscadores y ante quien comparte un
enlace. El punto de partida está en `docs/deuda-heredada.md`: el sitio en
producción no tiene `sitemap.xml` (404), publica `og:title`, `og:description`
y `og:image` vacíos en la portada, y ocho de sus rutas no declaran título
propio. Un ciudadano que busca "patente municipal El Coca" no encuentra el
trámite; encuentra la portada, si acaso.

Todo lo que sigue vive en dos archivos y un componente:

| Archivo | Qué hace |
|---|---|
| `src/lib/seo.ts` | Constantes de marca, canónicas, recortes y constructores de JSON-LD |
| `src/lib/components/Seo.svelte` | Emite la cabecera completa de una página |
| `src/lib/components/Migas.svelte` | Emite el `BreadcrumbList` a partir del rastro que ya pinta |

## La regla

**Ninguna página escribe etiquetas de cabecera a mano.** Pone `<Seo …/>` y
recibe título, descripción, canónica, `robots`, Open Graph, Twitter Card y
datos estructurados; o no pone nada y se nota al revisar. Esto no es
ceremonia: la versión anterior tenía tres formatos de título distintos
(`— Alcaldía de Francisco de Orellana`, `— Francisco de Orellana`,
`· GAD Municipal Francisco de Orellana`) porque cada ruta lo escribía por su
cuenta.

```svelte
<Seo
  titulo="Trámites municipales"
  descripcion="Los 60 trámites del GAD Municipal…"
  imagen="/img/og/tramites.jpg"
  datos={[catalogo]}
/>
```

Por defecto la canónica es la ruta actual **sin la query**. Importa: los
filtros de `/tramites` y `/noticias` viven en la URL pero no cambian lo que
sirve el servidor, así que `?categoria=negocios` y `?anio=2025` son la misma
página. Sin canónica, cada combinación era una URL duplicada compitiendo
contra la buena.

## Qué se declara y por qué

### Identidad de la institución (`+layout.svelte`, todas las páginas)

`GovernmentOrganization` — el tipo correcto para un GAD municipal, no
`LocalBusiness`, que describe un comercio — junto con `WebSite` y su
`SearchAction`, que es lo que permite a Google ofrecer una caja de búsqueda
del sitio dentro del propio resultado.

**Lo que no se declara.** La ficha no lleva `telephone` ni `streetAddress`:
`data/api/v1/contacto.json` los tiene en `null` porque el sitio original no
los publica y Comunicación Social todavía no los ha confirmado. Rellenar el
schema con un dato inventado pondría un teléfono falso en la ficha de un
gobierno local. Sí van la localidad, la provincia, el país y las coordenadas
del mapa que el propio municipio embebe en `/contactos/`, que son hechos
verificables.

Cuando Comunicación Social confirme dirección y central telefónica, el único
cambio es añadir los campos en `organizacion()` dentro de `src/lib/seo.ts`.

### Por tipo de página

| Página | Datos estructurados |
|---|---|
| Trámite | `GovernmentService` + `HowTo` con los pasos y los requisitos |
| Noticia | `NewsArticle` con fecha, imagen y la institución como autora |
| Índices de sección | `CollectionPage` con la lista completa en `ItemList` |
| Contacto | `ContactPage` |
| Cualquiera con migas | `BreadcrumbList` |

El `ItemList` de los índices no es adorno. `/noticias` carga por tandas de
nueve con scroll infinito: un rastreador ve nueve de 280 en el HTML. La lista
completa se declara ahí.

`HowTo` ya no pinta resultado enriquecido en Google (lo retiraron en 2023). Se
mantiene porque sigue siendo la única forma estándar de decir "este trámite se
hace en estos pasos y pide estos documentos", y los buscadores
conversacionales sí leen esa estructura.

## Rutas generadas

| Ruta | Qué es |
|---|---|
| `/sitemap.xml` | Las 365 URLs, desde la misma fuente de datos que las páginas |
| `/robots.txt` | Dinámico, porque la línea `Sitemap:` exige URL absoluta |
| `/noticias/feed.xml` | RSS de las 50 noticias más recientes |

El mapa del sitio se arma en cada petición: cuando entre en producción la API
en Laravel y se publique una noticia, aparece sin que nadie tenga que
acordarse de añadirla. Si la API no responde, sale con las rutas fijas en vez
de con un 500 — media lista es mejor que ninguna para un rastreador.

**`robots.txt` bloquea una sola cosa**: `/api/asistente`, que gasta CPU
embebiendo texto en cada petición y no indexa nada que no esté ya en las
páginas. Los filtros con query **no** se bloquean, aunque sean duplicados:
bloquearlos impediría leer la canónica que los consolida, y una URL bloqueada
puede acabar indexada igual, vacía. Lo mismo con `/buscar`, que lleva
`noindex` — que tampoco se ve si no se rastrea.

## El dominio canónico

`origen()` toma el host del propio pedido. Con `adapter-node` detrás de
Coolify, `ORIGIN` ya fija el host real y eso es correcto. `PUBLIC_SITIO_URL`
lo fuerza cuando el dominio definitivo no coincide con el que sirve.

No hay `https://orellana.gob.ec` codificado como valor por defecto a
propósito: mientras el rediseño no esté en ese dominio, una canónica fija
apuntaría cada página nueva al sitio viejo y le regalaría la indexación.

## Tarjetas de previsualización

`static/img/og/` guarda seis tarjetas de 1200×630 (portada, cantón, trámites,
transparencia, asistente, noticias). Se generan con
`./scripts/og/generar.sh` — Chromium sin interfaz sobre `scripts/og/tarjeta.html`,
sin añadir ninguna dependencia al proyecto.

Son el sistema visual del sitio, no una plantilla: fotografía del archivo
municipal con el mismo velo diagonal de la portada, o tesela de color plano
con el pictograma del cantón de marca de agua; el logotipo oficial en blanco;
la banda de seis colores del logotipo al pie.

Las noticias no usan tarjeta genérica: llevan su propia fotografía, recortada
por Cloudinary a 1200×630 con `c_fill,g_auto` (el encuadre lo decide el
contenido — en una foto de obra, el centro geométrico suele ser cielo) y en
`f_jpg` explícito, porque `f_auto` negocia el formato con la cabecera `Accept`
y los rastreadores de vistas previas no anuncian WebP.

Con la proporción de cámara original (5328×4000), WhatsApp y Facebook degradan
la imagen a miniatura junto al título en vez de pintar la tarjeta grande.
WhatsApp es el canal por el que de verdad circula un enlace municipal aquí.

## Instalación en el teléfono

`static/site.webmanifest` con los iconos, el verde de marca como `theme_color`
y tres accesos directos (Trámites, Asistente, Transparencia). Los PNG salen de
`static/favicon.svg` — la "O" con la hoja del logotipo — con los comandos del
README.

## Lo que ya estaba bien

La auditoría de estructura no encontró nada que arreglar: una sola `h1` por
página en las doce rutas revisadas, ningún salto de nivel de encabezado y
ninguna imagen sin `alt`. Ver `docs/accesibilidad.md`.

## Al publicar

1. Fijar `PUBLIC_SITIO_URL` si el dominio no es el host que sirve.
2. Dar de alta el sitio en Google Search Console y enviar `/sitemap.xml`.
3. Comprobar las tarjetas en el depurador de Facebook y en el validador de
   tarjetas de X, con el dominio real.
4. Validar los datos estructurados en `search.google.com/test/rich-results`.
5. Pedir la retirada del índice de las URLs del sitio antiguo que se
   reemplacen, o redirigirlas con 301 desde el servidor.
