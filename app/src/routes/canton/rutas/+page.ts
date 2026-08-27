import { error } from '@sveltejs/kit';
import { api } from '$lib/api';
import { CANTON, buscarEntrada } from '$lib/secciones';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const entrada = buscarEntrada(CANTON, 'rutas');
	if (!entrada) error(404, 'Sección no encontrada');
	try {
		const pagina = await api.pagina(fetch, 'turismo', 'rutas');
		return { entrada, mapa: pagina.imagenes[0] ?? null };
	} catch {
		error(404, 'No pudimos cargar las rutas turísticas');
	}
};
