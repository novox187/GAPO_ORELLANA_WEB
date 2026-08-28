/**
 * Registro anónimo de consultas al asistente.
 *
 * Una línea JSON por consulta a la salida estándar, que es donde Coolify ya
 * conserva los logs del contenedor — sin base de datos y sin volumen
 * persistente, coherente con la decisión de no montar volúmenes que tomó
 * `docs/arquitectura.md`.
 *
 * **No se guarda IP, ni sesión, ni cookie, ni cabeceras.** Sólo la pregunta,
 * qué encontró el buscador y cuánta confianza tuvo. Es dato de uso, no dato
 * personal: no hay forma de reconstruir quién preguntó qué.
 *
 * Para qué sirve: la lista de preguntas que salen con confianza `baja` o sin
 * ficha es el mejor insumo editorial que va a tener el municipio. Dice qué
 * busca la gente y el sitio no tiene — que es exactamente lo que hay que
 * escribir a continuación.
 *
 *   docker logs <contenedor> | grep '"evento":"asistente"' | jq -r 'select(.confianza=="baja") | .consulta'
 */

import type { Respuesta } from './ficha';

export function registrar(respuesta: Respuesta, ms: number): void {
	const linea = {
		evento: 'asistente',
		ts: new Date().toISOString(),
		consulta: respuesta.consulta,
		confianza: respuesta.confianza,
		ficha: respuesta.ficha?.url ?? null,
		clase: respuesta.ficha?.clase ?? null,
		alternativas: respuesta.alternativas.map((a) => a.url),
		parrafo: respuesta.parrafo !== null,
		ms
	};
	console.log(JSON.stringify(linea));
}
