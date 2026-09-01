import { MarcasPropias } from './marcasPropias.svelte';

/**
 * Qué publicaciones ya reaccionó quien está mirando.
 *
 * El mecanismo —acumular las claves de la tanda visible y resolverlas en una
 * sola petición— vive en `MarcasPropias`, compartido con lo guardado y con a
 * quién se sigue. Aquí sólo queda de qué se pregunta.
 */
export const misReacciones = new MarcasPropias(async (slugs) => {
	const res = await fetch(`/api/mis-reacciones?slugs=${slugs.map(encodeURIComponent).join(',')}`);

	if (!res.ok) throw new Error('No se pudo consultar');

	const { data } = (await res.json()) as { data: string[] };

	return data;
});
