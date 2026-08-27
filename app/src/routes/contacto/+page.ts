import { api } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const [contacto, direcciones] = await Promise.all([
		api.contacto(fetch),
		api.direcciones(fetch)
	]);
	return { contacto, direcciones };
};
