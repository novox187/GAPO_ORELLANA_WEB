import { error } from '@sveltejs/kit';
import { api } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
	try {
		const noticia = await api.noticia(fetch, params.slug);
		// Noticias contiguas para la navegación al pie del artículo.
		const indice = await api.noticias(fetch);
		const i = indice.findIndex((n) => n.slug === params.slug);
		return {
			noticia,
			anterior: i > 0 ? indice[i - 1] : null,
			siguiente: i >= 0 && i < indice.length - 1 ? indice[i + 1] : null
		};
	} catch {
		error(404, 'No encontramos esa noticia');
	}
};
