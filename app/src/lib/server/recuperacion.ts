/**
 * Recuperación híbrida sobre el corpus del sitio.
 *
 * Dos recuperadores que se fusionan, porque ninguno sirve solo para este
 * corpus:
 *
 * - **Semántico** (vectores del modelo de embeddings): es el que entiende
 *   que "quiero poner un local" y "licencia única anual de funcionamiento"
 *   son lo mismo. Es la razón de ser del asistente.
 * - **Léxico BM25**: es el que encuentra "OM-020-2021" o el número exacto de
 *   una ordenanza. Un vector de 384 dimensiones diluye un código legal hasta
 *   volverlo irrecuperable; el índice invertido lo clava.
 *
 * Se fusionan con Reciprocal Rank Fusion, que combina posiciones y no
 * puntajes — importa porque el coseno de E5 vive comprimido entre 0,75 y
 * 0,90 mientras BM25 va de 0 a 30, y mezclar esas escalas directamente daría
 * todo el peso a BM25.
 *
 * Este archivo vive en `src/lib/server/` por la convención de SvelteKit: el
 * framework impide que nada de esta carpeta llegue al bundle del navegador.
 * Es la razón de que la carpeta esté en inglés y su contenido en español.
 */

import { env, pipeline } from '@huggingface/transformers';
import corpus from './corpus.generado.json' with { type: 'json' };
import { normalizarTexto } from '../api.ts';
import type { Confianza } from '../asistente.ts';

export type { Confianza };

export type Tipo = 'tramite' | 'noticia' | 'pagina';

export interface Fragmento {
	id: string;
	tipo: Tipo;
	titulo: string;
	url: string;
	seccion: string;
	texto: string;
}

export interface Recuperado {
	fragmento: Fragmento;
	/** Coseno con la consulta, entre -1 y 1. Comprimido: E5 rara vez baja de 0,7. */
	semantico: number;
	/** Puntaje BM25 sin normalizar. 0 significa que ningún término coincidió. */
	lexico: number;
	/** Puntaje de fusión. Sólo sirve para ordenar, no tiene unidades. */
	fusion: number;
}

const FRAGMENTOS = corpus.fragmentos as Fragmento[];
export const CATALOGO = corpus.catalogo;
export const DIRECTORIO = corpus.directorio;
export const CONTACTO = corpus.contacto;
export const RUTAS = new Set<string>(corpus.rutas);
export const DIMENSIONES = corpus.dimensiones;

/** Los vectores viajan en base64 dentro del JSON; aquí vuelven a ser números. */
const VECTORES = new Float32Array(Buffer.from(corpus.vectores, 'base64').buffer);

// ---------------------------------------------------------------------------
// Modelo de embeddings
// ---------------------------------------------------------------------------

env.cacheDir = process.env.RUTA_MODELOS ?? './modelos';
// Ni una descarga en tiempo de ejecución: los pesos ya están en la imagen,
// puestos ahí durante el build. Si faltaran, es mejor un error claro al
// arrancar que un contenedor que sale a internet en la primera consulta.
env.allowRemoteModels = process.env.PERMITIR_DESCARGA_MODELO === 'true';
env.allowLocalModels = true;

type Extractor = (
	texto: string | string[],
	opciones: { pooling: 'mean'; normalize: boolean }
) => Promise<{ data: Float32Array }>;

let extractor: Promise<Extractor> | null = null;

/** Carga perezosa y compartida: el modelo se lee del disco una sola vez. */
function obtenerExtractor(): Promise<Extractor> {
	extractor ??= pipeline('feature-extraction', corpus.modelo, {
		dtype: 'q8'
	}) as unknown as Promise<Extractor>;
	return extractor;
}

/** Precarga el modelo para que la primera consulta no pague los ~700 ms. */
export async function precalentar(): Promise<void> {
	const e = await obtenerExtractor();
	await e('query: precalentamiento', { pooling: 'mean', normalize: true });
}

// ---------------------------------------------------------------------------
// Índice léxico
// ---------------------------------------------------------------------------

/**
 * Vacías del español. Deliberadamente corta: sólo palabras que no
 * discriminan nada. "Donde", "cuando" o "como" NO están porque en un sitio
 * de trámites sí distinguen la intención de la pregunta.
 */
const VACIAS = new Set(
	`a al algo ante antes aqui asi aun cada con contra de del desde donde dos el ella ellas ello
	 ellos en entre era eran es esa ese eso esta estan este esto ha han hasta hay la las le les lo
	 los mas me mi mis mucho muy no nos o otra otro para pero poco por porque que se ser si sin
	 sobre solo son su sus tan te tiene todo tu un una uno unos y ya`.split(/\s+/)
);

/**
 * Vocabulario municipal: cómo lo dice el ciudadano → cómo lo escribe el
 * municipio. Sólo expande, nunca sustituye, para no perder la palabra
 * original. Nace de leer los trámites, no de suponer.
 */
const SINONIMOS: Record<string, string[]> = {
	patente: ['patente', 'municipal', 'actividad', 'economica'],
	luaf: ['licencia', 'unica', 'anual', 'funcionamiento'],
	predial: ['impuesto', 'predial', 'predio'],
	local: ['establecimiento', 'comercial', 'negocio', 'funcionamiento'],
	negocio: ['establecimiento', 'comercial', 'funcionamiento'],
	tienda: ['establecimiento', 'comercial'],
	agua: ['agua', 'potable', 'alcantarillado'],
	luz: ['alumbrado', 'publico'],
	basura: ['desechos', 'residuos', 'solidos'],
	casa: ['vivienda', 'construccion', 'edificacion'],
	construir: ['construccion', 'edificacion', 'planos'],
	terreno: ['predio', 'lote', 'solar'],
	titulo: ['escritura', 'titulacion', 'predio'],
	permiso: ['permiso', 'licencia', 'autorizacion'],
	multa: ['sancion', 'multa'],
	bombero: ['bomberos', 'seguridad'],
	perro: ['mascota', 'animal'],
	feria: ['mercado', 'comerciante'],
	taxi: ['transporte', 'transito', 'operadora'],
	ordenanza: ['ordenanza', 'normativa', 'resolucion'],
	sueldo: ['remuneracion', 'salarial'],
	trabajo: ['empleo', 'talento', 'humano', 'concurso']
};

function tokenizar(texto: string): string[] {
	return normalizarTexto(texto)
		.split(/[^a-z0-9]+/)
		.filter((t) => t.length > 1 && !VACIAS.has(t));
}

/** Tokens de la consulta, más las expansiones del vocabulario municipal. */
function tokenizarConsulta(texto: string): string[] {
	const base = tokenizar(texto);
	const salida = new Set(base);
	for (const t of base) for (const s of SINONIMOS[t] ?? []) salida.add(s);
	return [...salida];
}

const K1 = 1.2;
const B = 0.75;

/** Índice invertido, construido una vez al arrancar. Son milisegundos. */
const indiceLexico = (() => {
	const frecuencias: Map<string, number>[] = [];
	const longitudes: number[] = [];
	const df = new Map<string, number>();

	for (const f of FRAGMENTOS) {
		// El título pesa el triple: que un fragmento se titule "Patente
		// municipal" dice más que mencionar la palabra en un párrafo suelto.
		const tokens = [
			...tokenizar(f.titulo),
			...tokenizar(f.titulo),
			...tokenizar(f.titulo),
			...tokenizar(f.texto)
		];
		const cuenta = new Map<string, number>();
		for (const t of tokens) cuenta.set(t, (cuenta.get(t) ?? 0) + 1);
		for (const t of cuenta.keys()) df.set(t, (df.get(t) ?? 0) + 1);
		frecuencias.push(cuenta);
		longitudes.push(tokens.length);
	}

	const longitudMedia = longitudes.reduce((a, b) => a + b, 0) / longitudes.length;
	return { frecuencias, longitudes, df, longitudMedia };
})();

function puntuarBm25(tokens: string[]): Float64Array {
	const { frecuencias, longitudes, df, longitudMedia } = indiceLexico;
	const n = FRAGMENTOS.length;
	const puntajes = new Float64Array(n);

	for (const t of tokens) {
		const nq = df.get(t);
		if (!nq) continue;
		const idf = Math.log(1 + (n - nq + 0.5) / (nq + 0.5));
		for (let i = 0; i < n; i++) {
			const tf = frecuencias[i].get(t);
			if (!tf) continue;
			const norma = 1 - B + (B * longitudes[i]) / longitudMedia;
			puntajes[i] += idf * ((tf * (K1 + 1)) / (tf + K1 * norma));
		}
	}
	return puntajes;
}

// ---------------------------------------------------------------------------
// Fusión
// ---------------------------------------------------------------------------

/** Constante estándar de RRF: amortigua el peso de los primeros puestos. */
const K_RRF = 60;

function ordenarIndices(puntajes: ArrayLike<number>, tope: number): number[] {
	return Array.from({ length: puntajes.length }, (_, i) => i)
		.filter((i) => puntajes[i] > 0)
		.sort((a, b) => puntajes[b] - puntajes[a])
		.slice(0, tope);
}


// ---------------------------------------------------------------------------
// Consulta
// ---------------------------------------------------------------------------

/**
 * Cuánta confianza merece el mejor resultado. Los tres tramos salen de medir
 * 16 consultas con respuesta en el sitio contra 10 que no la tienen
 * (`scripts/evaluar-recuperacion.ts`), no de números elegidos a ojo:
 *
 * - `alta`  — ninguna consulta sin respuesta llegó aquí.
 * - `baja`  — ninguna consulta con respuesta cayó aquí.
 * - `media` — la zona donde las dos poblaciones se solapan de verdad.
 *
 * Ese solapamiento es un hecho del modelo, no un defecto de la calibración:
 * el coseno de E5 vive comprimido entre 0,80 y 0,92 y no tiene rango
 * suficiente para distinguir "el municipio no hace esto" de "el municipio lo
 * hace con otro nombre". Por eso el tramo intermedio no se resuelve
 * adivinando: se le enseña al ciudadano lo encontrado *diciéndole* que es lo
 * más parecido, y se le deja a mano el contacto humano. Un asistente
 * municipal que se calla lo que no sabe es más útil que uno que acierta un
 * poco más y falla en silencio.
 */
const UMBRAL_ALTA_SEMANTICA = 0.885;
const UMBRAL_ALTA_LEXICA = 12;
const UMBRAL_BAJA_SEMANTICA = 0.82;

function calificar(mejor: Recuperado | undefined): Confianza {
	if (!mejor) return 'baja';
	if (mejor.semantico >= UMBRAL_ALTA_SEMANTICA || mejor.lexico >= UMBRAL_ALTA_LEXICA) return 'alta';
	if (mejor.semantico < UMBRAL_BAJA_SEMANTICA) return 'baja';
	return 'media';
}

export interface Resultado {
	/** Trámites y páginas: lo que el municipio *hace*. De aquí sale la ficha. */
	oficiales: Recuperado[];
	/** Noticias: lo que el municipio *publica*. Nunca compiten con lo oficial. */
	noticias: Recuperado[];
	confianza: Confianza;
}

/**
 * Las noticias se separan en vez de competir. Son 280 de los 524 fragmentos
 * —más de la mitad del corpus— y están escritas en español narrativo, así
 * que se parecen a una pregunta conversacional mucho más que el texto
 * burocrático de un trámite. Medido: sin esta separación, "quiero poner un
 * local" devolvía un operativo de control de patentes en vez del trámite de
 * patente, y "no me llega el agua" una noticia sobre entrega de agua
 * gratuita en vez del servicio de agua potable.
 *
 * No se descartan: una noticia es la respuesta correcta a "qué obras hay en
 * mi barrio". Simplemente no se dejan ganar a un trámite.
 */
export async function consultar(consulta: string, tope = 8): Promise<Resultado> {
	const texto = consulta.trim();
	if (!texto) return { oficiales: [], noticias: [], confianza: 'baja' };

	// --- semántico ---
	const extraer = await obtenerExtractor();
	const salida = await extraer(`query: ${texto}`, { pooling: 'mean', normalize: true });
	const vq = salida.data;

	const cosenos = new Float64Array(FRAGMENTOS.length);
	for (let i = 0; i < FRAGMENTOS.length; i++) {
		let s = 0;
		const base = i * DIMENSIONES;
		// Ambos lados llegan normalizados a norma 1, así que el producto
		// escalar ya es el coseno.
		for (let d = 0; d < DIMENSIONES; d++) s += vq[d] * VECTORES[base + d];
		cosenos[i] = s;
	}

	// --- léxico ---
	const lexicos = puntuarBm25(tokenizarConsulta(texto));

	// --- fusión por posición, dentro de cada grupo ---
	const fusionar = (indices: number[]): Recuperado[] => {
		const porSemantica = [...indices].sort((a, b) => cosenos[b] - cosenos[a]).slice(0, 40);
		const porLexico = indices
			.filter((i) => lexicos[i] > 0)
			.sort((a, b) => lexicos[b] - lexicos[a])
			.slice(0, 40);

		const fusion = new Map<number, number>();
		porSemantica.forEach((i, r) => fusion.set(i, (fusion.get(i) ?? 0) + 1 / (K_RRF + r + 1)));
		porLexico.forEach((i, r) => fusion.set(i, (fusion.get(i) ?? 0) + 1 / (K_RRF + r + 1)));

		return [...fusion.entries()]
			.map(([i, f]) => ({
				fragmento: FRAGMENTOS[i],
				semantico: cosenos[i],
				lexico: lexicos[i],
				fusion: f
			}))
			.sort((a, b) => b.fusion - a.fusion)
			.slice(0, tope);
	};

	const indices = Array.from({ length: FRAGMENTOS.length }, (_, i) => i);
	const oficiales = fusionar(indices.filter((i) => FRAGMENTOS[i].tipo !== 'noticia'));
	const noticias = fusionar(indices.filter((i) => FRAGMENTOS[i].tipo === 'noticia'));

	return { oficiales, noticias, confianza: calificar(oficiales[0]) };
}
