import { error } from '@sveltejs/kit';
import { api } from '$lib/api';
import { extraerLugares } from '$lib/canton';
import { CANTON, buscarEntrada } from '$lib/secciones';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const entrada = buscarEntrada(CANTON, 'lugares');
	if (!entrada) error(404, 'Sección no encontrada');

	try {
		const pagina = await api.pagina(fetch, 'turismo', 'lugares');
		return { entrada, lugares: extraerLugares(pagina) };
	} catch {
		error(404, 'No pudimos cargar los lugares por visitar');
	}
};
