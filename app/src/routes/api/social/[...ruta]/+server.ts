import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { leerToken } from '$lib/server/sesion';
import type { RequestHandler } from './$types';

/**
 * Proxy de las escrituras del módulo social: reaccionar, comentar, editar o
 * borrar un comentario propio, reportar. `[...ruta]` captura lo que va
 * después de `/api/social/`, que es exactamente la misma ruta que espera
 * Laravel bajo `/v1/social/`, así que no hay tabla de traducción que
 * mantener — un endpoint nuevo en la API ya funciona aquí sin tocar nada.
 *
 * Las lecturas PÚBLICAS no pasan por aquí: van directas del navegador a
 * Laravel (ver `social` en `$lib/api.ts`), porque no necesitan el token y así
 * se cachean como el contenido público que son.
 *
 * Las lecturas PROPIAS sí —«¿yo qué hice con esto?»: mis reacciones, mis
 * guardados, a quién sigo, qué respondí en una encuesta—. No son contenido
 * público con un filtro encima: son consultas sobre una identidad, y sin el
 * token no se pueden ni formular.
 */
function base(): string {
	return (env.PUBLIC_API_BASE ?? '').replace(/\/+$/, '');
}

async function reenviar(
	metodo: 'GET' | 'POST' | 'PATCH' | 'DELETE',
	ruta: string,
	request: Request,
	cookies: import('@sveltejs/kit').Cookies,
	fetch: typeof globalThis.fetch
): Promise<Response> {
	const token = leerToken(cookies);
	if (!token) return json({ message: 'Inicia sesión para continuar.' }, { status: 401 });

	const cuerpo = metodo === 'DELETE' || metodo === 'GET' ? undefined : await request.text();

	const res = await fetch(`${base()}/v1/social/${ruta}${new URL(request.url).search}`, {
		method: metodo,
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/json',
			...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {})
		},
		body: cuerpo
	});

	// Se reenvía tal cual —cuerpo y estado—, sin reinterpretar la respuesta:
	// este proxy sólo añade la autorización, no decide qué significa un 422.
	const texto = await res.text();
	return new Response(texto, { status: res.status, headers: { 'Content-Type': 'application/json' } });
}

export const GET: RequestHandler = ({ params, request, cookies, fetch }) =>
	reenviar('GET', params.ruta, request, cookies, fetch);

export const POST: RequestHandler = ({ params, request, cookies, fetch }) =>
	reenviar('POST', params.ruta, request, cookies, fetch);

export const PATCH: RequestHandler = ({ params, request, cookies, fetch }) =>
	reenviar('PATCH', params.ruta, request, cookies, fetch);

export const DELETE: RequestHandler = ({ params, request, cookies, fetch }) =>
	reenviar('DELETE', params.ruta, request, cookies, fetch);
