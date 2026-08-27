import { api } from '$lib/api';
import type { PageLoad } from './$types';

/**
 * El feed se alimenta del índice completo (280 resúmenes con foto y fecha,
 * ~360 KB) en lugar de pedir página a página. Así el filtro por año es
 * instantáneo y el scroll infinito no vuelve a tocar la red.
 */
export const load: PageLoad = async ({ fetch, url }) => {
	const noticias = await api.noticias(fetch);

	const conteoPorAnio = new Map<string, number>();
	for (const n of noticias) {
		const anio = n.fecha?.slice(0, 4);
		if (anio) conteoPorAnio.set(anio, (conteoPorAnio.get(anio) ?? 0) + 1);
	}

	const anios = [...conteoPorAnio.entries()]
		.map(([anio, total]) => ({ anio, total }))
		.sort((a, b) => b.anio.localeCompare(a.anio));

	const pedido = url.searchParams.get('anio');
	const anioActivo = pedido && conteoPorAnio.has(pedido) ? pedido : null;

	return { noticias, anios, anioActivo, total: noticias.length };
};
