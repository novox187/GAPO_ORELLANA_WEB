import { error } from '@sveltejs/kit';
import { social, type Cuenta, type Historia } from '$lib/api';
import type { PageLoad } from './$types';

/**
 * El visor de historias vive en su propia ruta —no en un modal abierto
 * desde el feed— para que una historia se pueda compartir y enlazar, y el
 * botón atrás del navegador la cierre como se espera.
 *
 * `?destacada=` filtra a las historias guardadas en esa colección
 * permanente del perfil: no hace falta un endpoint aparte, porque
 * `historiasDeCuenta()` ya incluye las historias de una destacada aunque
 * hayan caducado — ver Historia::scopeActiva() en la API.
 */
export const load: PageLoad = async ({ fetch, params, url }) => {
	let cuenta!: Cuenta;
	let historias!: Historia[];

	try {
		[cuenta, historias] = await Promise.all([
			social.cuenta(fetch, params.cuenta),
			social.historiasDeCuenta(fetch, params.cuenta)
		]);
	} catch {
		error(404, 'No encontramos esa cuenta');
	}

	const destacada = url.searchParams.get('destacada');
	const filtradas = destacada ? historias.filter((h) => String(h.destacada_id) === destacada) : historias;

	if (!filtradas.length) {
		error(404, 'Esta cuenta no tiene historias activas ahora mismo');
	}

	return { cuenta, historias: filtradas };
};
