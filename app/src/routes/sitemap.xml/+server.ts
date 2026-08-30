import { api } from '$lib/api';
import { CANTON, TRANSPARENCIA } from '$lib/secciones';
import { RUTAS_FIJAS } from '$lib/rutas';
import { origen } from '$lib/seo';
import type { RequestHandler } from './$types';

/**
 * Mapa del sitio.
 *
 * El sitio actual no tiene ninguno: `/sitemap.xml` devuelve 404 (ver
 * docs/deuda-heredada.md, punto 6). Para un sitio de 370 URLs donde casi
 * todo el valor está en trámites y noticias que se enlazan poco entre sí,
 * es la diferencia entre que un buscador encuentre los 60 trámites o sólo
 * los 6 que la portada destaca.
 *
 * Se genera en cada petición desde la misma fuente de datos que las
 * páginas, no desde una lista escrita a mano: cuando entre en producción la
 * API en Laravel y se publique una noticia nueva, aparece aquí sin que
 * nadie tenga que acordarse de añadirla.
 */

/** Prioridades relativas. No son un ranking: le dicen al rastreador qué mirar antes. */
const PRIORIDAD: Record<string, string> = {
	'/': '1.0',
	'/tramites': '0.9',
	'/asistente': '0.9',
	'/noticias': '0.8',
	'/transparencia': '0.8',
	'/canton': '0.7',
	'/contacto': '0.7',
};

/** Cada cuánto cambia de verdad cada tipo de contenido. */
const FRECUENCIA: Record<string, string> = {
	'/': 'daily',
	'/noticias': 'daily',
	'/tramites': 'monthly',
	'/transparencia': 'monthly',
	'/canton': 'yearly',
	'/contacto': 'yearly',
};

interface Entrada {
	ruta: string;
	fecha?: string | null;
	prioridad?: string;
	frecuencia?: string;
}

const escapar = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: RequestHandler = async ({ fetch, url }) => {
	const base = origen(url);

	// Si la API no responde, el mapa sale con las rutas fijas en vez de
	// con un 500: media lista es mejor que ninguna para un rastreador.
	const [tramites, noticias] = await Promise.all([
		api.tramites(fetch).catch(() => []),
		api.noticias(fetch).catch(() => []),
	]);

	const entradas: Entrada[] = [
		// El buscador no entra: es una página de resultados, sin contenido propio.
		...RUTAS_FIJAS.filter((r) => r !== '/buscar').map((ruta) => ({
			ruta,
			prioridad: PRIORIDAD[ruta] ?? '0.6',
			frecuencia: FRECUENCIA[ruta] ?? 'monthly',
		})),
		...CANTON.map((e) => ({
			ruta: `/canton/${e.slug}`,
			prioridad: '0.6',
			frecuencia: 'yearly',
		})),
		...TRANSPARENCIA.map((e) => ({
			ruta: `/transparencia/${e.slug}`,
			prioridad: '0.7',
			frecuencia: 'monthly',
		})),
		...tramites.map((t) => ({
			ruta: `/tramites/${t.slug}`,
			prioridad: '0.8',
			frecuencia: 'monthly',
		})),
		...noticias.map((n) => ({
			ruta: `/noticias/${n.slug}`,
			fecha: n.fecha,
			prioridad: '0.5',
			frecuencia: 'yearly',
		})),
	];

	const cuerpo = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entradas
	.map(
		(e) => `	<url>
		<loc>${escapar(base + e.ruta)}</loc>${e.fecha ? `\n\t\t<lastmod>${e.fecha}</lastmod>` : ''}
		<changefreq>${e.frecuencia ?? 'monthly'}</changefreq>
		<priority>${e.prioridad ?? '0.5'}</priority>
	</url>`,
	)
	.join('\n')}
</urlset>
`;

	return new Response(cuerpo, {
		headers: {
			'content-type': 'application/xml; charset=utf-8',
			// Una hora: las noticias se publican a diario, no cada minuto.
			'cache-control': 'public, max-age=3600',
		},
	});
};
