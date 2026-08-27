import { api } from '$lib/api';
import type { PageLoad } from './$types';

const DESTACADOS = [
	'patente-por-primera-vez-persona-natural-19',
	'servicio-de-agua-potable-6',
	'solicitud-de-conexion-de-acometida-de-agua-potable-4',
	'requisitos-para-permiso-de-construccion-y-aprobacion-de-planos-34',
	'certificado-de-no-poseer-bienes-32',
	'requisito-para-la-revision-y-renovacion-de-matricula-particulares-48'
];

export const load: PageLoad = async ({ fetch }) => {
	const [tramites, noticias] = await Promise.all([api.tramites(fetch), api.noticias(fetch)]);

	const porSlug = new Map(tramites.map((t) => [t.slug, t]));
	const destacados = DESTACADOS.map((s) => porSlug.get(s)).filter((t) => t !== undefined);

	return {
		destacados,
		totalTramites: tramites.length,
		noticias: noticias.slice(0, 4)
	};
};
