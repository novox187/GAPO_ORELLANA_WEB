import { error } from '@sveltejs/kit';
import { api } from '$lib/api';
import { extraerConcejales } from '$lib/canton';
import { CANTON, buscarEntrada } from '$lib/secciones';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const entrada = buscarEntrada(CANTON, 'concejo');
	if (!entrada) error(404, 'Sección no encontrada');
	try {
		const pagina = await api.pagina(fetch, 'institucional', 'concejo');
		return { entrada, concejales: extraerConcejales(pagina) };
	} catch {
		error(404, 'No pudimos cargar el Concejo Municipal');
	}
};
