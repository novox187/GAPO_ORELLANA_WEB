import { api } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const tramites = await api.tramites(fetch);

	const categorias = [...new Set(tramites.flatMap((t) => t.categorias))].sort();
	const perfiles = [...new Set(tramites.flatMap((t) => t.perfiles))].sort();
	const direcciones = [...new Map(tramites.map((t) => [t.direccion.slug, t.direccion])).values()].sort(
		(a, b) => a.nombre.localeCompare(b.nombre, 'es')
	);

	return { tramites, categorias, perfiles, direcciones };
};
