import { api, img } from '$lib/api';
import { CORREO, ORGANIZACION, SITIO, absoluta, descripcion, origen, tarjeta } from '$lib/seo';
import type { RequestHandler } from './$types';

/**
 * Canal RSS de las noticias municipales.
 *
 * No es nostalgia: los agregadores de prensa regional y los rastreadores de
 * noticias descubren publicaciones nuevas por aquí mucho antes que por el
 * mapa del sitio, y el municipio publica en su web antes que en cualquier
 * red social. Cuesta un endpoint y evita depender de que alguien comparta
 * el enlace para que una obra pública se entere de existir.
 */

const escapar = (s: string) =>
	(s ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');

/** RFC 822, que es el formato que exige RSS 2.0 (no ISO 8601). */
function fechaRss(iso: string | null): string | null {
	if (!iso) return null;
	const d = new Date(iso);
	return Number.isNaN(d.getTime()) ? null : d.toUTCString();
}

export const GET: RequestHandler = async ({ fetch, url }) => {
	const base = origen(url);
	const noticias = (await api.noticias(fetch).catch(() => [])).slice(0, 50);

	const items = noticias
		.map((n) => {
			const enlace = `${base}/noticias/${n.slug}`;
			const fecha = fechaRss(n.fecha);
			// `f_jpg` explícito: el `<enclosure>` declara image/jpeg, y la URL
		// con `f_auto` puede devolver WebP según quién la pida.
		const imagen = tarjeta(n.imagen ? img(n.imagen, 1600) : null);
			return `		<item>
			<title>${escapar(n.titulo)}</title>
			<link>${escapar(enlace)}</link>
			<guid isPermaLink="true">${escapar(enlace)}</guid>
			<description>${escapar(descripcion(n.resumen, ''))}</description>${
				fecha ? `\n\t\t\t<pubDate>${fecha}</pubDate>` : ''
			}${imagen ? `\n\t\t\t<enclosure url="${escapar(imagen)}" type="image/jpeg" />` : ''}
		</item>`;
		})
		.join('\n');

	const cuerpo = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
	<channel>
		<title>Noticias — ${escapar(SITIO)}</title>
		<link>${base}/noticias</link>
		<atom:link href="${base}/noticias/feed.xml" rel="self" type="application/rss+xml" />
		<description>Obras, servicios y decisiones del ${escapar(ORGANIZACION)}.</description>
		<language>es-ec</language>
		<copyright>${escapar(ORGANIZACION)}</copyright>
		<managingEditor>${CORREO} (${escapar(SITIO)})</managingEditor>
		<image>
			<url>${absoluta(url, '/img/og/logotipo.png')}</url>
			<title>${escapar(SITIO)}</title>
			<link>${base}</link>
		</image>
${items}
	</channel>
</rss>
`;

	return new Response(cuerpo, {
		headers: {
			'content-type': 'application/rss+xml; charset=utf-8',
			'cache-control': 'public, max-age=1800',
		},
	});
};
