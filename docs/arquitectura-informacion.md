# Arquitectura de información

## El problema del sitio actual

`orellana.gob.ec` organiza todo por **estructura administrativa**: para
encontrar un trámite hay que saber primero qué "Dirección" lo atiende (¿la
licencia de un restaurante la da "Dirección de Turismo" o "Dirección de
Servicios Municipales"? Un ciudadano no lo sabe de antemano). Es un modelo
mental cómodo para quien trabaja adentro del municipio, no para quien entra
una vez al año a sacar una patente.

## El principio del rediseño

Organizar por **lo que el ciudadano quiere hacer**, no por quién lo atiende
adentro. La estructura administrativa se mantiene, pero como filtro
secundario ("ver todos los trámites de la Dirección de Ambiente"), no como
la única puerta de entrada.

## Nivel 0 — Portada

Seis puertas de entrada por intención, más búsqueda global siempre visible:

```
Hacer un trámite · Pagar y consultar impuestos · Noticias y eventos
Conoce el cantón · Transparencia · Contacto y atención
```

## Regla de 3 clics

```
Portada ──(1)──▶ "Hacer un trámite" ──(2)──▶ categoría "Negocios" ──(3)──▶ ficha del trámite ✅
```

Y **0 clics** vía búsqueda global: escribir "patente" en el buscador lleva
directo a la ficha.

## Doble taxonomía de trámites

**Por categoría (intención):** Vivienda y construcción · Negocios ·
Vehículos y transporte · Agua y ambiente · Familia y bienestar · Turismo ·
Documentos y certificados.

**Por perfil (quién soy):** ciudadano · emprendedor · empresa ·
transportista · constructor · turista.

Ambas se infieren automáticamente del texto de cada trámite durante la
extracción (ver `tools/scraper/src/parsers/tramites.ts`) y quedan abiertas
a corrección editorial.

## Ficha de trámite — formato guía, un solo scroll

```
Qué es → Quién puede acceder → Qué necesitas (checklist) → Cuánto cuesta
       → Paso a paso (si la fuente lo especifica) → Dónde y cuándo → Descargas
```

Sin modales apilados ni menús de tercer nivel — el patrón que hoy entierra
el contenido del sitio actual dentro de hasta 4-5 clics.

## Migas de pan

Toda ficha muestra la ruta real de navegación (`Inicio / Trámites /
Negocios / Patente municipal`), no solo decorativa: cada tramo es un enlace
funcional.
