/**
 * Endpoint del asistente ciudadano.
 *
 * Vive en `/api/asistente` y no en `/api/v1/asistente/consulta`, que es lo
 * que anunciaba `docs/arquitectura.md`: `/api/v1/*` se sirve como archivos
 * estáticos desde el symlink `static/api`, así que una ruta de servidor ahí
 * dentro conviviría con archivos JSON reales y sería una trampa para quien
 * lea el árbol de rutas. `/api/health` ya establece el patrón para las rutas
 * de servidor bajo `/api`.
 *
 * Todo el trabajo ocurre aquí dentro del contenedor. No hay ninguna llamada
 * a un servicio externo: el modelo de embeddings está en la imagen y el
 * redactor de la fase 2, cuando exista, correrá en la red interna de Docker.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { responder } from '$lib/server/ficha';
import { redactar } from '$lib/server/redactor';
import { registrar } from '$lib/server/registro';

/** Interruptor de apagado sin redesplegar. */
const ACTIVO = process.env.ASISTENTE_ACTIVO !== 'false';

/**
 * Una pregunta ciudadana cabe de sobra en 500 caracteres. El tope existe
 * porque el endpoint es público y embeber texto cuesta CPU: sin él, un
 * bucle enviando párrafos enteros tumba el contenedor.
 */
const MAX_CARACTERES = 500;

// Límite por IP en memoria del proceso. Basta porque el sitio corre en un
// solo contenedor; si algún día hay réplicas, esto hay que sacarlo a Redis.
const VENTANA_MS = 10 * 60 * 1000;
const MAX_POR_VENTANA = 30;
const visitas = new Map<string, number[]>();

function excedeLimite(ip: string): boolean {
	const ahora = Date.now();
	const recientes = (visitas.get(ip) ?? []).filter((t) => ahora - t < VENTANA_MS);
	recientes.push(ahora);
	visitas.set(ip, recientes);

	// Poda barata: sin esto el mapa crece sin límite en un proceso que no se
	// reinicia en semanas.
	if (visitas.size > 5000) {
		for (const [k, v] of visitas) if (!v.some((t) => ahora - t < VENTANA_MS)) visitas.delete(k);
	}
	return recientes.length > MAX_POR_VENTANA;
}

export const POST: RequestHandler = async ({ request, fetch, getClientAddress }) => {
	if (!ACTIVO) error(503, 'El asistente está temporalmente fuera de servicio.');

	if (excedeLimite(getClientAddress())) {
		error(429, 'Demasiadas consultas seguidas. Espera un momento e inténtalo de nuevo.');
	}

	let cuerpo: { mensaje?: unknown };
	try {
		cuerpo = await request.json();
	} catch {
		error(400, 'El cuerpo de la petición no es JSON válido.');
	}

	const mensaje = typeof cuerpo.mensaje === 'string' ? cuerpo.mensaje.trim() : '';
	if (mensaje.length < 2) error(400, 'Escribe una pregunta.');
	if (mensaje.length > MAX_CARACTERES) {
		error(400, `La pregunta no puede pasar de ${MAX_CARACTERES} caracteres.`);
	}

	const t0 = Date.now();
	const respuesta = await responder(mensaje, fetch);

	// El párrafo es lo último y lo prescindible: si el redactor no está o
	// tarda, `redactar` devuelve null y la respuesta sale igual.
	if (respuesta.ficha) {
		respuesta.parrafo = await redactar(mensaje, respuesta.ficha);
	}

	registrar(respuesta, Date.now() - t0);
	return json(respuesta);
};
