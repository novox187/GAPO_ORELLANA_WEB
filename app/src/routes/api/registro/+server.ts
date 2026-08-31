import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { guardarToken } from '$lib/server/sesion';
import type { RequestHandler } from './$types';

/** Registro de una cuenta ciudadana. Igual que /api/sesion: guarda el token, nunca lo devuelve. */
export const POST: RequestHandler = async ({ request, cookies, fetch }) => {
	const base = (env.PUBLIC_API_BASE ?? '').replace(/\/+$/, '');
	const cuerpo = await request.text();

	const res = await fetch(`${base}/v1/ciudadanos`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
		body: cuerpo
	});

	const datos = await res.json();
	if (!res.ok) return json(datos, { status: res.status });

	guardarToken(cookies, datos.token);

	return json({ data: datos.data }, { status: 201 });
};
