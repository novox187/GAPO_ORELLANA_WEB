import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { borrarToken, guardarToken, leerToken } from '$lib/server/sesion';
import type { RequestHandler } from './$types';

/**
 * El único punto del sitio que llega a ver el token de Sanctum de verdad.
 * Recibe correo/contraseña, se los pasa a Laravel, y si acierta guarda el
 * token en una cookie httpOnly — nunca lo devuelve al navegador.
 */
function base(): string {
	return (env.PUBLIC_API_BASE ?? '').replace(/\/+$/, '');
}

export const GET: RequestHandler = async ({ cookies, fetch }) => {
	const token = leerToken(cookies);
	if (!token) return json({ data: null });

	const res = await fetch(`${base()}/v1/ciudadanos/yo`, {
		headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
	});

	if (!res.ok) {
		// El token ya no sirve (se revocó, o la cuenta se bloqueó): se limpia
		// la cookie en vez de dejar que cada página vuelva a fallar igual.
		borrarToken(cookies);
		return json({ data: null });
	}

	return json(await res.json());
};

export const POST: RequestHandler = async ({ request, cookies, fetch }) => {
	const cuerpo = await request.text();

	const res = await fetch(`${base()}/v1/ciudadanos/sesion`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
		body: cuerpo
	});

	const datos = await res.json();
	if (!res.ok) return json(datos, { status: res.status });

	guardarToken(cookies, datos.token);

	return json({ data: datos.data });
};

export const DELETE: RequestHandler = async ({ cookies, fetch }) => {
	const token = leerToken(cookies);

	if (token) {
		// Mejor esfuerzo: si Laravel no responde, la cookie se borra igual y
		// la sesión termina del lado del navegador. El token revocado a
		// medias caduca solo si algún día se le pone expiración.
		await fetch(`${base()}/v1/ciudadanos/sesion`, {
			method: 'DELETE',
			headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
		}).catch(() => null);
	}

	borrarToken(cookies);

	return json({ data: null });
};
