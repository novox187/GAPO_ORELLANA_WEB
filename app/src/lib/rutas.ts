/**
 * Traducción de las rutas del modelo de datos a las rutas públicas del
 * sitio.
 *
 * El índice de búsqueda y los fragmentos guardan la ruta tal como está
 * organizada la API (`/institucional/alcaldia`, `/turismo/lugares`), que no
 * es la que ve el ciudadano: "El cantón" agrupa en una sola sección lo que
 * en el origen municipal vive en dos carpetas distintas. Esta traducción se
 * hacía dentro de la página de búsqueda; vive aquí porque ahora la necesitan
 * tres consumidores —la página de búsqueda, el asistente y el script que
 * construye el corpus— y tener tres copias de la misma regla es la forma
 * segura de que un día dejen de coincidir.
 *
 * El import lleva extensión `.ts` a propósito: este módulo lo carga tanto
 * Vite como Node a secas (desde `scripts/construir-corpus.ts`, que corre
 * fuera del bundler), y Node en ESM exige la extensión. El proyecto ya tiene
 * `rewriteRelativeImportExtensions` activado en tsconfig.json para eso.
 */

import { CANTON, TRANSPARENCIA } from './secciones.ts';

/** Rutas de sección que existen aunque no correspondan a un documento. */
export const RUTAS_FIJAS = [
	'/',
	'/tramites',
	'/noticias',
	'/transparencia',
	'/canton',
	'/contacto',
	'/buscar',
	'/asistente'
] as const;

/**
 * Ruta pública de un documento del índice. Los trámites y las noticias ya
 * vienen con su ruta definitiva; el resto son páginas que hay que ubicar en
 * la sección donde el sitio las publica.
 */
export function rutaPublica(url: string): string {
	if (url.startsWith('/tramites/') || url.startsWith('/noticias/')) return url;

	const slug = url.split('/').pop() ?? '';
	if (TRANSPARENCIA.some((e) => e.slug === slug)) return `/transparencia/${slug}`;
	if (CANTON.some((e) => e.slug === slug)) return `/canton/${slug}`;
	return '/canton';
}
