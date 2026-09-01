import type { LayoutLoad } from './$types';

/**
 * Quién está dentro del estudio, resuelto en el servidor antes de pintar.
 *
 * Sin esto, la primera carga enseñaría la pantalla de entrar durante un
 * instante a quien ya tiene la sesión abierta — y en una herramienta que se
 * usa cada día, ese parpadeo se ve treinta veces al día.
 */
export const load: LayoutLoad = async ({ fetch }) => {
	const res = await fetch('/api/estudio/sesion');
	const { data } = await res.json();

	return { creador: data };
};

/**
 * El estudio no se prerrenderiza ni se indexa: todo lo que hay dentro
 * depende de quién eres.
 */
export const prerender = false;
export const ssr = true;
