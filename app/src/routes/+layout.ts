import type { LayoutLoad } from './$types';

/**
 * Quién está identificado, en todas las páginas. Se resuelve aquí —no en
 * cada componente— para que la primera carga ya sepa si hay sesión: sin
 * esto, el botón de reaccionar parpadearía entre «inicia sesión» y su
 * estado real cada vez que se entra al sitio con la cookie ya puesta.
 */
export const load: LayoutLoad = async ({ fetch }) => {
	const res = await fetch('/api/sesion');
	const { data } = await res.json();

	return { ciudadano: data };
};
