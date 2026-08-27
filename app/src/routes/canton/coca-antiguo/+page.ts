import { error } from '@sveltejs/kit';
import { api } from '$lib/api';
import { CANTON, buscarEntrada } from '$lib/secciones';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const entrada = buscarEntrada(CANTON, 'coca-antiguo');
	if (!entrada) error(404, 'Sección no encontrada');
	try {
		const pagina = await api.pagina(fetch, 'turismo', 'coca-antiguo');
		return {
			entrada,
			parrafos: pagina.bloques.filter((b) => b.tipo === 'parrafo').map((b) => b.texto ?? ''),
			fotos: pagina.imagenes
		};
	} catch {
		error(404, 'No pudimos cargar El Coca antiguo');
	}
};
