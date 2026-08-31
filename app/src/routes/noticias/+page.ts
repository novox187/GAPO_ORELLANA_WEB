import { social } from '$lib/api';
import type { PageLoad } from './$types';

/**
 * El feed social: historias activas de la bandeja + la primera tanda de
 * publicaciones. A diferencia del listado de noticias anterior —que traía
 * las 280 de una vez porque cabían en 360 KB—, aquí las publicaciones se
 * piden por cursor: el feed crece sin techo con historias, comentarios y
 * más cuentas publicando, así que cargarlo entero dejaría de ser razonable
 * mucho antes de llegar a 280.
 */
export const load: PageLoad = async ({ fetch }) => {
	const [feed, cuentasConHistorias] = await Promise.all([
		social.feed(fetch),
		social.bandejaHistorias(fetch)
	]);

	return {
		publicaciones: feed.data,
		siguienteCursor: feed.meta.siguiente_cursor,
		cuentasConHistorias
	};
};
