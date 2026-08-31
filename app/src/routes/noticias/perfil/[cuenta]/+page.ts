import { error } from '@sveltejs/kit';
import { social } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
	try {
		const [cuenta, publicaciones] = await Promise.all([
			social.cuenta(fetch, params.cuenta),
			social.publicacionesDeCuenta(fetch, params.cuenta)
		]);
		return {
			cuenta,
			publicaciones: publicaciones.data,
			siguienteCursor: publicaciones.meta.siguiente_cursor
		};
	} catch {
		error(404, 'No encontramos esa cuenta');
	}
};
