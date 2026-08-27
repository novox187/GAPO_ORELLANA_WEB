import { api } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => ({
	documentos: await api.indiceBusqueda(fetch)
});
