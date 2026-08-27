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
      sitio actual, que no expone pausa.

## Cómo se verifica

```bash
cd app && npm run dev
npx @axe-core/cli http://localhost:5173 --exit      # 0 violaciones críticas/serias
npx lighthouse http://localhost:5173 --preset=desktop --only-categories=accessibility,performance,seo
```

Más una pasada manual: navegación completa solo con teclado (Tab / Shift+Tab
/ Enter / Escape, sin trampas de foco) y una revisión con lector de pantalla
(Orca en Linux, NVDA en Windows) sobre la portada y una ficha de trámite.
