import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { leerToken } from '$lib/server/sesion';
import type { RequestHandler } from './$types';

/**
 * Declarar (o retirar) parroquia y año de nacimiento.
 *
 * Pasa por aquí y no directo a Laravel porque necesita el token del
 * ciudadano, que vive en una cookie httpOnly de este origen y el navegador no
 * puede leer. Es la misma razón que en el resto de escrituras ciudadanas.
 */
export const PUT: RequestHandler = async ({ request, cookies, fetch }) => {
	const token = leerToken(cookies);

	if (!token) return json({ message: 'Inicia sesión para continuar.' }, { status: 401 });

	const base = (env.PUBLIC_API_BASE ?? '').replace(/\/+$/, '');

	const res = await fetch(`${base}/v1/ciudadanos/yo/demografia`, {
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
			Accept: 'application/json'
		},
		body: await request.text()
	});

	return new Response(await res.text(), {
		status: res.status,
		headers: { 'Content-Type': 'application/json' }
	});
};
