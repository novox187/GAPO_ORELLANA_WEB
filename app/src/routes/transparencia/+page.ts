import { TRANSPARENCIA } from '$lib/secciones';
import type { PageLoad } from './$types';

export const load: PageLoad = () => ({ entradas: TRANSPARENCIA });
