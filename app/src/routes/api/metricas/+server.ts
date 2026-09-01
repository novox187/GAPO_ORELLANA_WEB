import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { leerToken } from '$lib/server/sesion';
import type { RequestHandler } from './$types';

/**
 * Reenvío de la medición al backend.
 *
 * Podría enviarse directo del navegador a Laravel, y aun así pasa por aquí
 * por dos motivos que no son intercambiables:
 *
 * 1. **Mismo origen.** `navigator.sendBeacon` es la única forma de que un
 *    lote sobreviva al cierre de la pestaña, y contra otro origen dispararía
 *    una comprobación previa de CORS que el navegador ya no ejecuta cuando la
 *    página se está yendo. Contra el propio origen no hay CORS que valga.
 *
 * 2. **La identidad, cuando la hay.** El token del ciudadano vive en una
 *    cookie httpOnly de ESTE origen: el navegador no puede leerlo ni ponerlo
 *    en una cabecera. Si el lote no pasara por aquí, ningún evento llevaría
 *    `ciudadano_id` y el panel de audiencia se quedaría vacío para siempre.
 *
 * La IP se reenvía en `X-Forwarded-For` porque, sin ella, Laravel vería la del
 * contenedor de este proceso y contaría a todo el cantón como un solo
 * visitante. Que se haga caso a esa cabecera depende de `TRUSTED_PROXIES` en
 * el backend; ver bootstrap/app.php allí.
 */
export const POST: RequestHandler = async ({ request, cookies, fetch, getClientAddress }) => {
	const base = (env.PUBLIC_API_BASE ?? '').replace(/\/+$/, '');

	if (!base) return json({ data: { registrados: 0 } }, { status: 202 });

	const cuerpo = await request.text();
	const token = leerToken(cookies);

	const cabeceras: Record<string, string> = {
		'Content-Type': 'application/json',
		Accept: 'application/json',
		'X-Forwarded-For': getClientAddress()
	};

	const agente = request.headers.get('user-agent');
	if (agente) cabeceras['User-Agent'] = agente;
	if (token) cabeceras.Authorization = `Bearer ${token}`;

	try {
		const res = await fetch(`${base}/v1/metricas`, { method: 'POST', headers: cabeceras, body: cuerpo });

		return new Response(await res.text(), {
			status: res.status,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch {
		// La medición nunca puede romper una página. Si el backend no
		// responde, el lote se pierde y no pasa nada más.
		return json({ data: { registrados: 0 } }, { status: 202 });
	}
};
