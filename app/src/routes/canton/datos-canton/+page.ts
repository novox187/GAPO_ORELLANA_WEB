import { error } from '@sveltejs/kit';
import { api } from '$lib/api';
import { extraerDatos } from '$lib/canton';
import { CANTON, buscarEntrada } from '$lib/secciones';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const entrada = buscarEntrada(CANTON, 'datos-canton');
	if (!entrada) error(404, 'Sección no encontrada');
	try {
		const pagina = await api.pagina(fetch, 'institucional', 'datos-canton');
		const datos = extraerDatos(pagina);
		return {
			entrada,
			// El primer bloque es la presentación general; el resto son campos.
			presentacion: datos.find((d) => /generales/i.test(d.etiqueta))?.parrafos ?? [],
			campos: datos.filter((d) => !/generales/i.test(d.etiqueta))
		};
	} catch {
		error(404, 'No pudimos cargar los datos del cantón');
	}
};
