/**
 * Construye el corpus que consume el asistente ciudadano.
 *
 * Lee `data/api/v1/` y escribe `src/lib/server/corpus.generado.json` con
 * cuatro cosas: los 524 fragmentos de texto, sus vectores, el catálogo de
 * rutas públicas válidas y el directorio telefónico. Se ejecuta en `prepare`
 * y en `prebuild`, así que un clon nuevo o una compilación en Docker lo
 * generan solos.
 *
 * Por qué vive en `app/scripts/` y no en `tools/`, donde está el resto del
 * utillaje del proyecto: el Dockerfile sólo copia `app/`, `data/api/` y
 * `media/manifest.json` al contexto de build. Un script en `tools/` no
 * llegaría a la imagen sin tocar el Dockerfile.
 *
 * Los vectores se guardan en base64 y no como listas de números: 524 × 384
 * flotantes son 800 KB en binario y unos 4 MB escritos como texto JSON.
 *
 *     node scripts/construir-corpus.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env, pipeline } from '@huggingface/transformers';
import { rutaPublica, RUTAS_FIJAS } from '../src/lib/rutas.ts';
import { MODELO, DIMENSIONES, PRECISION } from './modelo.ts';

const AQUI = dirname(fileURLToPath(import.meta.url));
const APP = join(AQUI, '..');
const API = join(APP, '..', 'data', 'api', 'v1');
const SALIDA = join(APP, 'src', 'lib', 'server', 'corpus.generado.json');

/** Máximo de caracteres que se embeben por fragmento. */
const TOPE_EMBEBIDO = 1600;
const LOTE = 32;

env.cacheDir = join(APP, 'modelos');

function leer<T>(ruta: string): T {
	return JSON.parse(readFileSync(join(API, ruta), 'utf8')) as T;
}

interface Chunk {
	id: string;
	tipo: 'tramite' | 'noticia' | 'pagina';
	titulo: string;
	url: string;
	seccion: string;
	texto: string;
	perfiles: string[];
}

export interface Fragmento {
	id: string;
	tipo: 'tramite' | 'noticia' | 'pagina';
	titulo: string;
	/** Ruta pública, ya traducida — nunca la ruta interna de la API. */
	url: string;
	seccion: string;
	texto: string;
}

export interface EntradaCatalogo {
	tipo: 'tramite' | 'pagina';
	titulo: string;
	url: string;
	/** Dirección municipal responsable, sólo en trámites. */
	direccion?: string;
	categorias?: string[];
	perfiles?: string[];
	resumen?: string;
}

export interface EntradaDirectorio {
	slug: string;
	nombre: string;
	responsable: string | null;
	mision: string;
	extensiones: { cargo: string; extension: string }[];
}

export interface Corpus {
	generadoEn: string;
	modelo: string;
	dimensiones: number;
	fragmentos: Fragmento[];
	/** Float32Array de fragmentos.length × dimensiones, en base64. */
	vectores: string;
	catalogo: EntradaCatalogo[];
	directorio: EntradaDirectorio[];
	/** Todas las rutas públicas que existen. Nada fuera de aquí se enlaza. */
	rutas: string[];
	contacto: { correo: string | null; nota: string; redes: { red: string; url: string }[] };
}

async function principal() {
	console.log('Leyendo data/api/v1/…');
	const chunks = leer<{ data: Chunk[] }>('search/chunks.json').data;
	const tramites = leer<{ data: Record<string, any>[] }>('tramites/index.json').data;
	const indice = leer<{ data: { tipo: string; titulo: string; url: string }[] }>(
		'search/index.json'
	).data;
	const direcciones = leer<{ data: Record<string, any>[] }>('institucional/direcciones.json').data;
	const contacto = leer<{ data: Record<string, any> }>('contacto.json').data;

	// ---- Fragmentos -------------------------------------------------------
	const fragmentos: Fragmento[] = chunks.map((c) => ({
		id: c.id,
		tipo: c.tipo,
		titulo: c.titulo,
		url: rutaPublica(c.url),
		seccion: c.seccion,
		texto: c.texto
	}));
	console.log(`  ${fragmentos.length} fragmentos`);

	// ---- Catálogo ---------------------------------------------------------
	// Sin noticias a propósito: son 280 entradas que casi nunca son la
	// respuesta a "cómo hago X", y se alcanzan igual por el buscador. El
	// catálogo es la lista de lo que el municipio *hace*, no de lo que
	// publica.
	const porUrlTramite = new Map(tramites.map((t) => [`/tramites/${t.slug}`, t]));
	const catalogo: EntradaCatalogo[] = [];

	for (const d of indice) {
		if (d.tipo === 'noticia') continue;
		const url = rutaPublica(d.url);
		const t = porUrlTramite.get(url);
		catalogo.push(
			t
				? {
						tipo: 'tramite',
						titulo: d.titulo,
						url,
						direccion: t.direccion?.nombre,
						categorias: t.categorias,
						perfiles: t.perfiles,
						resumen: (t.resumen ?? '').slice(0, 220)
					}
				: { tipo: 'pagina', titulo: d.titulo, url }
		);
	}
	console.log(`  ${catalogo.length} entradas de catálogo`);

	// ---- Directorio -------------------------------------------------------
	// Sin las fotos: son objetos de medios de 800 bytes cada uno que no
	// aportan nada a una respuesta de texto.
	const directorio: EntradaDirectorio[] = direcciones.map((d) => ({
		slug: d.slug,
		nombre: d.nombre,
		responsable: d.responsable ?? null,
		mision: (d.mision ?? '').slice(0, 400),
		extensiones: d.directorio_telefonico ?? []
	}));
	const extensiones = directorio.reduce((n, d) => n + d.extensiones.length, 0);
	console.log(`  ${directorio.length} direcciones, ${extensiones} extensiones`);

	// ---- Rutas válidas ----------------------------------------------------
	const rutas = [...new Set([...RUTAS_FIJAS, ...indice.map((d) => rutaPublica(d.url))])].sort();
	console.log(`  ${rutas.length} rutas públicas`);

	// ---- Vectores ---------------------------------------------------------
	console.log(`\nCargando ${MODELO}…`);
	const t0 = Date.now();
	const extraer = await pipeline('feature-extraction', MODELO, { dtype: PRECISION });
	console.log(`  cargado en ${((Date.now() - t0) / 1000).toFixed(1)} s`);

	// El prefijo "passage: " no es decorativo: E5 se entrenó con pares
	// asimétricos "query:"/"passage:" y omitirlos degrada la recuperación
	// sin dar ningún error visible.
	const textos = fragmentos.map((f) => `passage: ${f.titulo}. ${f.texto}`.slice(0, TOPE_EMBEBIDO));

	const vectores = new Float32Array(fragmentos.length * DIMENSIONES);
	const t1 = Date.now();
	for (let i = 0; i < textos.length; i += LOTE) {
		const lote = textos.slice(i, i + LOTE);
		const salida = await extraer(lote, { pooling: 'mean', normalize: true });
		vectores.set(salida.data as Float32Array, i * DIMENSIONES);
		process.stdout.write(`\r  embebiendo ${Math.min(i + LOTE, textos.length)}/${textos.length}`);
	}
	console.log(`\n  ${((Date.now() - t1) / 1000).toFixed(1)} s`);

	// ---- Escritura --------------------------------------------------------
	const corpus: Corpus = {
		generadoEn: new Date().toISOString(),
		modelo: MODELO,
		dimensiones: DIMENSIONES,
		fragmentos,
		vectores: Buffer.from(vectores.buffer).toString('base64'),
		catalogo,
		directorio,
		rutas,
		contacto: {
			correo: contacto.correo ?? null,
			nota: contacto.nota ?? '',
			redes: contacto.redes_sociales ?? []
		}
	};

	mkdirSync(dirname(SALIDA), { recursive: true });
	writeFileSync(SALIDA, JSON.stringify(corpus));
	const mb = (Buffer.byteLength(JSON.stringify(corpus)) / 1024 / 1024).toFixed(2);
	console.log(`\nEscrito src/lib/server/corpus.generado.json (${mb} MB)`);
}

principal().catch((e) => {
	console.error(e);
	process.exit(1);
});
