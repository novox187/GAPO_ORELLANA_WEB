import { error } from '@sveltejs/kit';
import { api } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
	try {
		const tramite = await api.tramite(fetch, params.slug);
		return { tramite };
	} catch {
		error(404, 'No encontramos ese trámite');
	}
};
