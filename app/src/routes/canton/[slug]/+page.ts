import { error } from '@sveltejs/kit';
import { api } from '$lib/api';
import { CANTON, buscarEntrada } from '$lib/secciones';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
	const entrada = buscarEntrada(CANTON, params.slug);
	if (!entrada) error(404, 'Esa sección del cantón no existe');
	try {
		const pagina = await api.pagina(fetch, entrada.origen, entrada.slug);
		return { entrada, pagina };
	} catch {
		error(404, 'No pudimos cargar esa sección');
	}
};
