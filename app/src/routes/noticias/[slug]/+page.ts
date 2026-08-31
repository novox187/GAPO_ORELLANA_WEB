import { error } from '@sveltejs/kit';
import { social } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
	try {
		const { data: publicacion, comentarios } = await social.publicacion(fetch, params.slug);
		return {
			publicacion,
			comentarios: comentarios.data,
			siguienteCursorComentarios: comentarios.meta.siguiente_cursor
		};
	} catch {
		error(404, 'No encontramos esa publicación');
	}
};
