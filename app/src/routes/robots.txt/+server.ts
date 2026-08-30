import { origen } from '$lib/seo';
import type { RequestHandler } from './$types';

/**
 * `robots.txt` generado, no estático: la línea `Sitemap:` exige una URL
 * absoluta, y el dominio depende de dónde esté desplegado el sitio.
 *
 * Sustituye a `static/robots.txt`, que no podía declarar el mapa del sitio
 * por eso mismo. Los archivos de `static/` se sirven antes que las rutas,
 * así que el estático se eliminó al crear esta ruta.
 */
export const GET: RequestHandler = ({ url }) => {
	const base = origen(url);

	const cuerpo = `# Contenido público de un gobierno local: se indexa todo.
User-agent: *
Allow: /

# El asistente es un endpoint de cómputo, no contenido: cada petición
# embebe texto en CPU. Un rastreador recorriéndolo no indexa nada nuevo
# —todo lo que responde ya está en las páginas— y sí consume el servidor.
Disallow: /api/asistente

# Los filtros de trámites y noticias (?categoria=, ?anio=, ?q=) NO se
# bloquean a propósito, aunque sean URLs duplicadas: bloquearlas impide que
# el rastreador lea la etiqueta <link rel="canonical"> que las consolida y,
# sin poder leerla, puede acabar indexando la URL vacía. Las páginas de
# resultados llevan además "noindex", que tampoco se ve si no se rastrea.

Sitemap: ${base}/sitemap.xml
`;

	return new Response(cuerpo, {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'public, max-age=86400',
		},
	});
};
