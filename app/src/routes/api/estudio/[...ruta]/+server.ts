import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { leerTokenEstudio } from '$lib/server/sesionEstudio';
import type { RequestHandler } from './$types';

/**
 * Proxy del estudio. `[...ruta]` captura lo que va después de
 * `/api/estudio/`, que es exactamente lo que espera Laravel bajo
 * `/v1/estudio/`, así que no hay tabla de traducción que mantener.
 *
 * A diferencia del proxy social, aquí pasan también las LECTURAS. En el sitio
 * público leer es anónimo y el navegador puede hablar con Laravel
 * directamente; en el estudio no hay una sola lectura pública —el borrador de
 * una dirección, las respuestas de una caja de preguntas, las estadísticas de
 * la cuenta— y todas necesitan el token, que sólo vive aquí.
 *
 * El cuerpo se reenvía como flujo y no como texto: por aquí sube una
 * fotografía o un vídeo de hasta cien megas, y `await request.text()` los
 * cargaría enteros en memoria del proceso Node antes de empezar a enviarlos.
 */
function base(): string {
	return (env.PUBLIC_API_BASE ?? '').replace(/\/+$/, '');
}

async function reenviar(
	metodo: string,
	ruta: string,
	url: URL,
	request: Request,
	cookies: import('@sveltejs/kit').Cookies,
	fetch: typeof globalThis.fetch
): Promise<Response> {
	const token = leerTokenEstudio(cookies);

	if (!token) {
		return json({ message: 'Tu sesión del estudio caducó. Vuelve a entrar.' }, { status: 401 });
	}

	const cabeceras: Record<string, string> = {
		Authorization: `Bearer ${token}`,
		Accept: 'application/json'
	};

	// El tipo de contenido se copia del original —incluida la frontera de un
	// multipart, que es distinta en cada petición— o la subida llega a Laravel
	// como un cuerpo que no sabe interpretar.
	const tipo = request.headers.get('content-type');
	if (tipo) cabeceras['Content-Type'] = tipo;

	const conCuerpo = metodo !== 'GET' && metodo !== 'DELETE';

	const res = await fetch(`${base()}/v1/estudio/${ruta}${url.search}`, {
		method: metodo,
		headers: cabeceras,
		body: conCuerpo ? request.body : undefined,
		// Node exige declararlo cuando el cuerpo es un flujo.
		...(conCuerpo ? { duplex: 'half' } : {})
	} as RequestInit);

	// Se reenvía tal cual, cuerpo y estado: este proxy sólo añade la
	// autorización, no reinterpreta qué significa un 422 ni un 404.
	return new Response(await res.text(), {
		status: res.status,
		headers: { 'Content-Type': 'application/json' }
	});
}

export const GET: RequestHandler = ({ params, url, request, cookies, fetch }) =>
	reenviar('GET', params.ruta, url, request, cookies, fetch);

export const POST: RequestHandler = ({ params, url, request, cookies, fetch }) =>
	reenviar('POST', params.ruta, url, request, cookies, fetch);

export const PUT: RequestHandler = ({ params, url, request, cookies, fetch }) =>
	reenviar('PUT', params.ruta, url, request, cookies, fetch);

export const DELETE: RequestHandler = ({ params, url, request, cookies, fetch }) =>
	reenviar('DELETE', params.ruta, url, request, cookies, fetch);
