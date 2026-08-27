# Accesibilidad — WCAG 2.1 nivel AA

## Paleta

Los colores salen del logotipo oficial (`app/src/lib/marca/lockup-color.svg`),
no de una paleta inventada. El problema del sitio actual es que usa sus
verdes y amarillos de marca **como texto**, donde no llegan al mínimo AA de
4.5:1. Aquí esos tonos se reservan para superficie, y el texto usa
variantes derivadas más oscuras.

Contraste medido sobre la superficie clara del sitio (`#FBFAF6`):

| Token | Valor | Uso | Contraste |
|---|---|---|---|
| `--color-carbon-900` | `#1E1F1D` | texto base | 15.9:1 ✅ |
| `--color-selva-900` | `#074D22` | títulos y texto sobre claro | 9.6:1 ✅ |
| `--color-carbon-600` | `#434342` | texto secundario, teselas | 9.5:1 ✅ |
| `--color-achiote-texto` | `#5C4F00` | texto de acento (derivado) | 7.8:1 ✅ |
| `--color-selva-800` | `#0C843A` | enlaces y texto de marca | 4.6:1 ✅ |
| `--color-selva-600` | `#1EA758` | **sólo superficie** | 3.0:1 ❌ como texto |
| `--color-selva-400` | `#53B25F` | **sólo superficie** | 2.5:1 ❌ como texto |
| `--color-achiote-500` | `#F6D907` | **sólo fondo**; su texto va en carbón | 1.4:1 ❌ como texto |

En modo oscuro los papeles se invierten: `--marca` y `--enlace` pasan a
`--color-selva-400`, que sobre el fondo `#12130F` sí supera el mínimo.

### Tinta sobre las teselas de color

Cada tesela de la portada lleva la tinta que le exige su fondo, no la que
quedaría más bonita:

| Fondo de la tesela | Tinta | Contraste |
|---|---|---|
| `--color-selva-800` `#0C843A` | blanco | 4.8:1 ✅ |
| `--color-carbon-600` `#434342` | blanco | 8.9:1 ✅ |
| `--color-achiote-500` `#F6D907` | `--color-carbon-900` | 15.6:1 ✅ |
| `--color-selva-600` `#1EA758` | `--color-carbon-900` | 6.6:1 ✅ |
| `--color-selva-600` `#1EA758` | blanco | 3.1:1 ❌ — no se usa |

`selva-600` con texto blanco es el error que más se repite cuando se toma
un verde de marca como fondo: se queda a mitad de camino del mínimo. En la
portada esa tesela va con tinta carbón, igual que la amarilla.

### Tokens que cambian de bando según el tema

Dos valores no pueden ser el mismo en claro y en oscuro, así que son
tokens semánticos y no colores literales:

| Token | Claro | Oscuro | Para qué |
|---|---|---|---|
| `--acento-texto` | `#5C4F00` (7.8:1) | `--color-achiote-400` (13.4:1) | Antetítulos en amarillo de marca. El derivado oscuro es ilegible sobre fondo oscuro, y el amarillo claro lo es sobre papel. |
| `--indice` | `#8E8F8A` (3.3:1) | `#6A6B62` (3.1:1) | Números de índice del riel de trámites. Son texto grande (41 px, peso 700), así que el mínimo aplicable es 3:1, no 4.5:1 — pero hay que cumplirlo. |

### Texto sobre fotografía

El héroe de la portada y la banda de cierre ponen texto blanco sobre
fotografía, donde el contraste no es un par fijo de colores. Se resuelve
con un velo (`velo-hero` en `app.css`) medido sobre el fotograma más claro
de los tres — la laguna de Añangu, con cielo abierto — de modo que el
blanco supera 4.5:1 en toda la caja de contenido, no sólo de media. Por
debajo de 768 px el velo cambia de diagonal a vertical: en pantalla
estrecha la diagonal dejaba el titular sobre el cielo.

En la cabecera transparente sobre la fotografía, `--foco` pasa a
`--color-achiote-400`: el carbón del anillo de foco por defecto no se ve
contra un velo casi negro.

Valores calculados con la fórmula de luminancia relativa de WCAG 2.1
(§1.4.3).

## Checklist AA aplicado

- [x] Skip link al contenido principal, visible al recibir foco.
- [x] Landmarks semánticos (`header`, `nav`, `main`, `footer`) y un solo
      `h1` por página, sin saltos de jerarquía.
- [x] Foco visible: contorno de 2px + `outline-offset`, nunca
      `outline: none` sin un reemplazo igual o más visible.
- [x] Objetivos táctiles ≥ 44×44 px.
- [x] Zoom al 200% y ancho de 320px sin scroll horizontal.
- [x] Contraste de texto ≥ 4.5:1; de componentes e iconos informativos ≥ 3:1.
- [x] Nada se comunica solo por color — los estados llevan icono + texto
      (p. ej. "Pendiente de revisión" con icono, no solo un punto amarillo).
- [x] Formularios: `<label>` asociado a cada campo, error descriptivo
      vinculado con `aria-describedby`, resultados de búsqueda anunciados
      con `aria-live="polite"`.
- [x] `prefers-reduced-motion: reduce` respetado — sin animación forzada
      en carruseles ni transiciones.
- [x] `lang="es"` en el documento; título de página único y descriptivo
      por ruta.
- [x] Carruseles con controles reales (no solo gestos), pausables y
      navegables por teclado — a diferencia del carrusel Bootstrap del
      sitio actual, que no expone pausa. El fondo fotográfico de la
      portada lleva botón de pausa y un punto por fotograma, todos de
      44×44 px; con `prefers-reduced-motion` no rota en absoluto —se
      queda en el primer fotograma y los controles no llegan a aparecer.
- [x] Las animaciones de entrada por scroll ocultan el bloque **desde
      JavaScript**, nunca desde el HTML. Si el script no se ejecuta —red
      caída a media carga, JS bloqueado por una red institucional
      restrictiva— el contenido se ve igual. Ninguna sección puede quedar
      invisible por culpa de una animación.
- [x] Las cifras del cantón se sirven ya escritas en el HTML; el contador
      animado sólo las reescribe si hay JS y el visitante no pidió
      movimiento reducido. El fondo fotográfico de la
      portada lleva botón de pausa y un punto por fotograma, todos de
      44×44 px, y con `prefers-reduced-motion` no rota: se queda en el
      primer fotograma y los controles no llegan a aparecer.
- [x] Las animaciones de entrada por scroll ocultan el bloque **desde
      JavaScript**, nunca desde el HTML. Si el script no se ejecuta —red
      caída a media carga, JS bloqueado por una red institucional— el
      contenido se ve igual. Ninguna sección puede quedar invisible por
      culpa de una animación.
- [x] Las cifras del cantón se sirven ya escritas en el HTML; el contador
      animado sólo las reescribe si hay JS y el visitante no pidió
      movimiento reducido.

## Cómo se verifica

```bash
cd app && npm run dev
npx @axe-core/cli http://localhost:5173 --exit      # 0 violaciones críticas/serias
npx lighthouse http://localhost:5173 --preset=desktop --only-categories=accessibility,performance,seo
```

Si `@axe-core/cli` falla por desajuste entre Chrome y ChromeDriver, la
alternativa es inyectar `axe.min.js` en la página desde el navegador y
llamar a `axe.run()` — sirve igual y no depende de la versión del driver.
Al auditar la portada hay que **forzar antes `data-visible="si"` en todos
los `.revelable`**: si no, axe analiza bloques a `opacity: 0` y da por
buenos contrastes que nunca llegó a medir.

Si `@axe-core/cli` falla por desajuste entre las versiones de Chrome y
ChromeDriver, la alternativa es inyectar `axe.min.js` en la página desde
el navegador y llamar a `axe.run()`: mide lo mismo y no depende del
driver. Al auditar la portada hay que **forzar antes `data-visible="si"`
en todos los `.revelable`** — si no, axe analiza bloques a `opacity: 0` y
da por buenos contrastes que nunca llegó a medir.

Más una pasada manual: navegación completa solo con teclado (Tab / Shift+Tab
/ Enter / Escape, sin trampas de foco) y una revisión con lector de pantalla
(Orca en Linux, NVDA en Windows) sobre la portada y una ficha de trámite.
