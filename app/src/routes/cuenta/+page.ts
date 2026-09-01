import { env } from '$env/dynamic/public';
import type { PageLoad } from './$types';

/**
 * Las parroquias entre las que se puede elegir. Salen de la API —que las lee
 * del propio contenido municipal migrado— y no de una lista escrita en el
 * frontend: doce topónimos inventados en un archivo de interfaz son doce
 * afirmaciones sobre el cantón que nadie revisó.
 */
export const load: PageLoad = async ({ fetch }) => {
	const base = (env.PUBLIC_API_BASE ?? '').replace(/\/+$/, '');

	if (!base) return { parroquias: [] as string[] };

	try {
		const res = await fetch(`${base}/v1/ciudadanos/parroquias`);
		const { data } = await res.json();

		return { parroquias: (data ?? []) as string[] };
	} catch {
		// Sin la lista, el formulario de demografía no se ofrece. Es
		// preferible a ofrecerlo con un desplegable vacío.
		return { parroquias: [] as string[] };
	}
};
