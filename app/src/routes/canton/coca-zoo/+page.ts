import { error } from '@sveltejs/kit';
import { api } from '$lib/api';
import { ESPECIES_COCA_ZOO } from '$lib/canton';
import { CANTON, buscarEntrada } from '$lib/secciones';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const entrada = buscarEntrada(CANTON, 'coca-zoo');
	if (!entrada) error(404, 'Sección no encontrada');
	try {
		const pagina = await api.pagina(fetch, 'turismo', 'coca-zoo');
		// Las fichas de especie son los JPG apaisados; el resto es cabecera.
		const fichas = pagina.imagenes
			.filter((im) => im.ancho === 1140)
			.map((im) => ({ media: im, especie: ESPECIES_COCA_ZOO[im.id] ?? '' }));

		return {
			entrada,
			parrafos: pagina.bloques.filter((b) => b.tipo === 'parrafo').map((b) => b.texto ?? ''),
			fichas
		};
	} catch {
		error(404, 'No pudimos cargar el Coca Zoo');
	}
};
