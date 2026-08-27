import { error } from '@sveltejs/kit';
import { api } from '$lib/api';
import { extraerSimbolos } from '$lib/canton';
import { CANTON, buscarEntrada } from '$lib/secciones';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const entrada = buscarEntrada(CANTON, 'historia-simbolos');
	if (!entrada) error(404, 'Sección no encontrada');
	try {
		const pagina = await api.pagina(fetch, 'institucional', 'historia-simbolos');
		return { entrada, simbolos: extraerSimbolos(pagina) };
	} catch {
		error(404, 'No pudimos cargar la historia y los símbolos');
	}
};
