/**
 * Arranque del servidor.
 *
 * Carga el modelo de embeddings en cuanto el proceso levanta, sin esperar a
 * la primera consulta. Medido en el contenedor de producción: la primera
 * petición tardaba 867 ms y las siguientes 12-16 ms — esos 850 ms eran leer
 * los pesos del disco. Precalentando, ese coste lo paga el despliegue y no
 * el primer ciudadano que pregunte algo.
 *
 * No bloquea el arranque a propósito: si el modelo fallara al cargar, el
 * resto del sitio —que es contenido estático renderizado en servidor— tiene
 * que seguir sirviéndose igual. Sólo se cae el asistente, y con un error
 * visible en los logs.
 */

import { precalentar } from '$lib/server/recuperacion';

precalentar()
	.then(() => console.log(JSON.stringify({ evento: 'asistente:listo' })))
	.catch((e) =>
		console.error(
			JSON.stringify({
				evento: 'asistente:error-carga',
				mensaje: e instanceof Error ? e.message : String(e)
			})
		)
	);
