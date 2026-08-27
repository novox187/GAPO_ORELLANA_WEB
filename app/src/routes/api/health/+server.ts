import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Healthcheck para Coolify. No consulta nada más: si el proceso Node
 * responde, el contenedor está vivo. Comprobar la API o el disco de medios
 * aquí solo añadiría una razón más para que Coolify reinicie el contenedor
 * por un problema que un reinicio no arregla.
 */
export const GET: RequestHandler = () => json({ estado: 'ok' });
