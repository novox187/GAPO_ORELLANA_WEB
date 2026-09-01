import { social } from './api';
import { MarcasPropias } from './marcasPropias.svelte';

/** A qué cuentas sigo. La clave es el alias, no el slug. */
export const misSeguimientos = new MarcasPropias(async (alias) => (await social.misSeguimientos(alias)).data);
