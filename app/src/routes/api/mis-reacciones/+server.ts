import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { leerToken } from '$lib/server/sesion';
import type { RequestHandler } from './$types';

/**
 * Qué publicaciones, de las que pregunta el cliente, ya reaccionó el
 * ciudadano de esta sesión. A diferencia del resto de lecturas del módulo
 * social —que van directas del navegador a Laravel, ver `social` en
 * `$lib/api.ts`—, esta sí necesita el token: es «¿reaccioné yo?», no un
 * dato público. Por eso pasa por aquí en vez de por el proxy de escrituras
 * de `api/social/[...ruta]`, que sólo reenvía POST/PATCH/DELETE.
 */
export const GET: RequestHandler = async ({ url, cookies, fetch }) => {
	const token = leerToken(cookies);
	if (!token) return json({ data: [] });

	const slugs = url.searchParams.get('slugs') ?? '';
	if (!slugs) return json({ data: [] });

	const base = (env.PUBLIC_API_BASE ?? '').replace(/\/+$/, '');
	const res = await fetch(`${base}/v1/social/reacciones/mias.json?slugs=${encodeURIComponent(slugs)}`, {
		headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
	});

	if (!res.ok) return json({ data: [] });
	return json(await res.json());
};
