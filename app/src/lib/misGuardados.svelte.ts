import { social } from './api';
import { MarcasPropias } from './marcasPropias.svelte';

/**
 * Qué publicaciones tengo guardadas.
 *
 * Guardar es privado: no suma a ningún contador público ni aparece en las
 * métricas de quien publicó. Este marcador sólo sirve para que el icono salga
 * relleno al montar la tarjeta, no para contar nada.
 */
export const misGuardados = new MarcasPropias(async (slugs) => (await social.misGuardados(slugs)).data);
