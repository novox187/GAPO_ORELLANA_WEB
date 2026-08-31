import { dev } from '$app/environment';
import type { Cookies } from '@sveltejs/kit';

/**
 * El token de Sanctum del ciudadano, guardado en una cookie httpOnly del
 * propio origen del sitio.
 *
 * Nunca vive en localStorage ni llega a JavaScript del navegador: SvelteKit
 * actúa de intermediario entre el navegador y Laravel — recibe el token en
 * `/api/sesion`, lo guarda aquí, y lo reenvía como cabecera `Authorization`
 * en cada escritura del módulo social (`/api/social/[...ruta]`). Así ni un
 * script inyectado en la página ni una extensión del navegador pueden
 * robarlo, que es justo lo que sí podría pasar si viviera en localStorage.
 */
const NOMBRE_COOKIE = 'orellana_ciudadano';

export function guardarToken(cookies: Cookies, token: string): void {
	cookies.set(NOMBRE_COOKIE, token, {
		path: '/',
		httpOnly: true,
		// `secure` exige HTTPS; en desarrollo local el sitio se sirve por HTTP
		// y con `secure` a fuerzas la cookie nunca llegaría a guardarse.
		secure: !dev,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 180 // 180 días
	});
}

export function leerToken(cookies: Cookies): string | undefined {
	return cookies.get(NOMBRE_COOKIE);
}

export function borrarToken(cookies: Cookies): void {
	cookies.delete(NOMBRE_COOKIE, { path: '/' });
}
