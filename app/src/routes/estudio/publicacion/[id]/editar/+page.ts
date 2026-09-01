import { api, social } from '$lib/api';
import type { PageLoad } from './$types';

/**
 * Lo mismo que necesita el compositor —qué lugares del cantón se pueden
 * proponer como ubicación y qué cuentas se pueden etiquetar—, porque editar
 * una publicación ofrece exactamente los mismos campos que crearla.
 *
 * Los lugares NO son una lista escrita aquí: se extraen de la propia página
 * «Lugares por visitar» del sitio, donde cada sitio turístico es un título de
 * nivel 2. Es contenido municipal ya publicado, así que si mañana el
 * municipio añade uno, aparece solo. Inventar una lista de topónimos en el
 * código sería exactamente lo que el principio rector del proyecto prohíbe.
 */
export const load: PageLoad = async ({ fetch }) => {
	const [lugares, cuentas] = await Promise.all([
		api
			.pagina(fetch, 'turismo', 'lugares')
			.then((p) =>
				p.bloques
					.filter((b) => b.tipo === 'titulo' && b.nivel === 2 && b.texto)
					.map((b) => b.texto as string)
			)
			.catch(() => [] as string[]),
		social.cuentas(fetch).catch(() => [])
	]);

	return { lugares, cuentas };
};
