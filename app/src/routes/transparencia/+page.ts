import { api } from '$lib/api';
import { TRANSPARENCIA } from '$lib/secciones';
import { limpiarBloques, agruparBloques, resumenPagina, extraerAnios } from '$lib/bloques';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const paginas = await Promise.all(
		TRANSPARENCIA.map((entrada) => api.pagina(fetch, 'transparencia', entrada.slug))
	);

	const entradas = TRANSPARENCIA.map((entrada, i) => ({
		entrada,
		resumen: resumenPagina(paginas[i])
	}));

	const totalDocumentos = paginas.reduce((n, p) => n + p.documentos.length, 0);

	const rangos = paginas
		.map((p) => extraerAnios(agruparBloques(limpiarBloques(p.bloques)).grupos))
		.filter((r): r is { min: number; max: number } => r !== null);
	const anios = rangos.length
		? {
				min: Math.min(...rangos.map((r) => r.min)),
				max: Math.max(...rangos.map((r) => r.max))
			}
		: null;

	return {
		entradas,
		cifras: { categorias: TRANSPARENCIA.length, documentos: totalDocumentos, anios }
	};
};
