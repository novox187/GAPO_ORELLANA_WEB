/**
 * Descarga los pesos del modelo de embeddings a `app/modelos/`.
 *
 * Existe para que el Dockerfile pueda bajarlos en una capa propia, antes de
 * copiar el código fuente: sin esto, cambiar una línea de un componente
 * invalidaría la capa y volvería a descargar 135 MB en cada compilación.
 *
 * Es también el único momento en toda la vida del contenedor en que se sale
 * a internet a buscar el modelo. En ejecución, `recuperacion.ts` arranca con
 * las descargas remotas deshabilitadas: si los pesos faltaran, es mejor un
 * error claro que un servidor municipal llamando a un tercero sin que nadie
 * lo haya decidido.
 *
 *     node scripts/descargar-modelo.ts
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env, pipeline } from '@huggingface/transformers';
import { MODELO, PRECISION } from './modelo.ts';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
env.cacheDir = join(APP, 'modelos');

const t0 = Date.now();
console.log(`Descargando ${MODELO} (${PRECISION}) a app/modelos/…`);
await pipeline('feature-extraction', MODELO, { dtype: PRECISION });
console.log(`Listo en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
