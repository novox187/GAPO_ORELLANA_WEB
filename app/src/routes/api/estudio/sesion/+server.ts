import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { borrarTokenEstudio, guardarTokenEstudio, leerTokenEstudio } from '$lib/server/sesionEstudio';
import type { RequestHandler } from './$types';

/**
 * Entrar y salir del estudio.
 *
 * El token de Laravel no llega nunca al navegador: se cambia aquí por una
 * cookie httpOnly del propio origen, igual que ya se hacía con la identidad
 * ciudadana. Es la diferencia entre que un script inyectado en la página
 * pueda robar el permiso de publicar en nombre del municipio y que no pueda.
 */
function base(): string {
	return (env.PUBLIC_API_BASE ?? '').replace(/\/+$/, '');
}

export const POST: RequestHandler = async ({ request, cookies, fetch }) => {
	const cuerpo = await request.text();

	const res = await fetch(`${base()}/v1/estudio/sesion`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
		body: cuerpo
	});

	const datos = await res.json().catch(() => ({}));

	if (!res.ok) {
		// Se devuelve el error tal cual —incluidos los `errors` de validación
		// de Laravel—, sin el token, que en un fallo no existe.
		return json(datos, { status: res.status });
	}

	guardarTokenEstudio(cookies, datos.token);

	return json({ data: datos.data });
};

export const DELETE: RequestHandler = async ({ cookies, fetch }) => {
	const token = leerTokenEstudio(cookies);

	if (token) {
		// Se revoca también en Laravel: borrar sólo la cookie dejaría el token
		// vivo y utilizable por quien lo hubiera copiado.
		await fetch(`${base()}/v1/estudio/sesion`, {
			method: 'DELETE',
			headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
		}).catch(() => null);
	}

	borrarTokenEstudio(cookies);

	return json({ data: null });
};

/** Quién está dentro, o `null`. Lo pide el `+layout.ts` del estudio en cada carga. */
export const GET: RequestHandler = async ({ cookies, fetch }) => {
	const token = leerTokenEstudio(cookies);

	if (!token) return json({ data: null });

	const res = await fetch(`${base()}/v1/estudio/yo`, {
		headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
	}).catch(() => null);

	if (!res?.ok) {
		// Token caducado o revocado: se limpia la cookie para no repetir la
		// consulta fallida en cada navegación.
		borrarTokenEstudio(cookies);

		return json({ data: null });
	}

	return json(await res.json());
};
