import { dev } from '$app/environment';
import type { Cookies } from '@sveltejs/kit';

/**
 * El token del estudio: la sesión del personal municipal que publica.
 *
 * Cookie aparte de la del ciudadano (`orellana_ciudadano`) y no un campo más
 * dentro de ella. La misma persona puede tener las dos abiertas —la jefa de
 * Comunicación es también vecina del cantón y comenta con su cuenta— y
 * mezclarlas obligaría a elegir cuál de las dos identidades se pierde al
 * cerrar sesión en una.
 *
 * Dura menos que la del ciudadano —ocho horas frente a ciento ochenta días—
 * porque es lo que da permiso de publicar en nombre del municipio. Una sesión
 * de trabajo caduca al final de la jornada; una de lectura, no tiene por qué.
 */
const NOMBRE_COOKIE = 'orellana_estudio';

/** Ocho horas: una jornada. */
const DURACION = 60 * 60 * 8;

export function guardarTokenEstudio(cookies: Cookies, token: string): void {
	cookies.set(NOMBRE_COOKIE, token, {
		path: '/',
		httpOnly: true,
		// `secure` exige HTTPS; en desarrollo local el sitio va por HTTP y la
		// cookie nunca llegaría a guardarse.
		secure: !dev,
		// `strict` y no `lax` como la del ciudadano: en el estudio no hay nada
		// que se llegue por un enlace de fuera, y una cookie que no viaja
		// desde otros sitios no puede usarse para un CSRF aunque aparezca uno.
		sameSite: 'strict',
		maxAge: DURACION
	});
}

export function leerTokenEstudio(cookies: Cookies): string | undefined {
	return cookies.get(NOMBRE_COOKIE);
}

export function borrarTokenEstudio(cookies: Cookies): void {
	cookies.delete(NOMBRE_COOKIE, { path: '/' });
}
