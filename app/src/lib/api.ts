/**
 * Cliente de datos. Hoy lee los JSON estáticos extraídos del sitio actual;
 * cuando exista la API en Laravel basta apuntar PUBLIC_API_BASE a ella,
 * porque el envelope ({ data, meta, links }) es idéntico en ambos casos.
 */

const BASE = '/api/v1';

type Fetch = typeof globalThis.fetch;

async function obtener<T>(f: Fetch, ruta: string): Promise<T> {
	const res = await f(`${BASE}/${ruta}`);
	if (!res.ok) throw new Error(`No se pudo cargar ${ruta} (${res.status})`);
	return res.json() as Promise<T>;
}

export interface Media {
	id: string;
	rutaOriginal: string;
	rutaDerivados: Record<string, string>;
	ancho: number | null;
	alto: number | null;
	alt: string;
	altPendiente: boolean;
}

export interface TramiteResumen {
	id: number;
	slug: string;
	nombre: string;
	direccion: { id: number; slug: string; nombre: string };
	categorias: string[];
	perfiles: string[];
	resumen: string;
	requiere_revision_editorial: boolean;
}

export interface Requisito {
	orden: number;
	texto: string;
	documento_url: string | null;
	obligatorio: boolean;
}

export interface Tramite extends TramiteResumen {
	que_es: string;
	para_que_sirve: string;
	quienes_acceden: string;
	costo: { tiene_costo: boolean | null; detalle: string; valor_referencial: number | null };
	canales: string[];
	requisitos: Requisito[];
	pasos: { orden: number; titulo: string; descripcion: string }[];
	formularios: { nombre: string; url: string; tipo: string }[];
	base_legal: string[];
	contenido_adicional: { titulo: string; html: string }[];
	actualizado_en: string;
	fuente_url: string;
}

export interface NoticiaResumen {
	id: number;
	slug: string;
	titulo: string;
	resumen: string;
	fecha: string | null;
	imagen: Media | null;
	url: string;
}

export interface Noticia extends NoticiaResumen {
	cuerpo: string;
	imagenes: Media[];
	fuente_url: string;
}

export interface ItemLista {
	texto: string;
	/** Destino cuando el ítem era un enlace en la fuente municipal. */
	url: string | null;
}

export interface Bloque {
	tipo: 'titulo' | 'parrafo' | 'lista' | 'tabla' | 'html';
	nivel?: number;
	texto?: string;
	items?: ItemLista[];
	filas?: string[][];
}

export interface Pagina {
	slug: string;
	seccion: string;
	titulo: string;
	bloques: Bloque[];
	texto: string;
	imagenes: Media[];
	documentos: { nombre: string; url: string; tipo: string }[];
	fuente_url: string;
}

export interface Contacto {
	redes_sociales: { red: string; url: string }[];
	mapa_embed_url: string | null;
	direccion_fisica: string | null;
	telefono: string | null;
	correo: string | null;
	nota: string;
	fuente_url: string;
}

export interface Direccion {
	id: number | string;
	slug: string;
	nombre: string;
	responsable: string | null;
	foto: Media | null;
	mision: string;
	directorio_telefonico: { cargo: string; extension: string }[];
	fuente_url: string;
}

export interface DocumentoIndice {
	id: string;
	tipo: 'tramite' | 'noticia' | 'pagina';
	titulo: string;
	texto: string;
	url: string;
}

interface Sobre<T> {
	data: T;
	meta?: Record<string, unknown>;
	links?: Record<string, string | null>;
}

export const api = {
	tramites: (f: Fetch) =>
		obtener<Sobre<TramiteResumen[]>>(f, 'tramites/index.json').then((r) => r.data),
	tramite: (f: Fetch, slug: string) =>
		obtener<Sobre<Tramite>>(f, `tramites/${slug}.json`).then((r) => r.data),
	noticias: (f: Fetch) =>
		obtener<Sobre<NoticiaResumen[]>>(f, 'noticias/index.json').then((r) => r.data),
	noticiasPagina: (f: Fetch, n: number) =>
		obtener<Sobre<NoticiaResumen[]>>(f, `noticias/page-${n}.json`),
	noticia: (f: Fetch, slug: string) =>
		obtener<Sobre<Noticia>>(f, `noticias/${slug}.json`).then((r) => r.data),
	pagina: (f: Fetch, seccion: string, slug: string) =>
		obtener<Sobre<Pagina>>(f, `${seccion}/${slug}.json`).then((r) => r.data),

	contacto: (f: Fetch) => obtener<Sobre<Contacto>>(f, 'contacto.json').then((r) => r.data),
	direcciones: (f: Fetch) =>
		obtener<Sobre<Direccion[]>>(f, 'institucional/direcciones.json').then((r) => r.data),

	/** Corpus para la búsqueda léxica en el cliente. */
	indiceBusqueda: (f: Fetch) =>
		obtener<Sobre<DocumentoIndice[]>>(f, 'search/index.json').then((r) => r.data)
};

/**
 * Búsqueda léxica sin dependencias: puntúa coincidencias en título (peso
 * alto) y cuerpo (peso bajo), ignorando acentos. Suficiente mientras no
 * exista el backend; la fase de búsqueda semántica sustituirá esta función
 * sin cambiar la forma del resultado.
 */
export function buscar(documentos: DocumentoIndice[], consulta: string): DocumentoIndice[] {
	const normaliza = (s: string) =>
		(s ?? '')
			.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '');

	const terminos = normaliza(consulta)
		.split(/\s+/)
		.filter((t) => t.length > 1);
	if (!terminos.length) return [];

	return documentos
		.map((doc) => {
			const titulo = normaliza(doc.titulo);
			const texto = normaliza(doc.texto);
			let puntaje = 0;
			for (const t of terminos) {
				if (titulo.includes(t)) puntaje += 6;
				puntaje += Math.min(texto.split(t).length - 1, 4);
			}
			return { doc, puntaje };
		})
		.filter((r) => r.puntaje > 0)
		.sort((a, b) => b.puntaje - a.puntaje)
		.slice(0, 40)
		.map((r) => r.doc);
}

/** Ruta de imagen preferida: derivado WebP del ancho pedido, con caída al original. */
export function img(m: Media | null | undefined, ancho: 400 | 800 | 1600 = 800): string {
	if (!m) return '';
	return m.rutaDerivados[`${ancho}w`] ?? m.rutaOriginal;
}

/**
 * Fecha en estilo red social ("hace 4 meses"). Se acompaña siempre de la
 * fecha exacta en el atributo `datetime`/`title`, porque en un sitio
 * municipal saber el día concreto de una obra o un anuncio importa.
 */
export function fechaRelativa(iso: string | null): string {
	if (!iso) return '';
	const d = new Date(`${iso}T00:00:00`);
	if (Number.isNaN(d.getTime())) return iso;

	const segundos = (d.getTime() - Date.now()) / 1000;
	const rtf = new Intl.RelativeTimeFormat('es-EC', { numeric: 'auto' });
	const tramos: [Intl.RelativeTimeFormatUnit, number][] = [
		['year', 31536000],
		['month', 2592000],
		['week', 604800],
		['day', 86400]
	];
	for (const [unidad, seg] of tramos) {
		const v = segundos / seg;
		if (Math.abs(v) >= 1) return rtf.format(Math.round(v), unidad);
	}
	return 'hoy';
}

export function fechaLegible(iso: string | null): string {
	if (!iso) return '';
	const d = new Date(`${iso}T00:00:00`);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' });
}

export const ETIQUETA_CATEGORIA: Record<string, string> = {
	'vivienda-y-construccion': 'Vivienda y construcción',
	negocios: 'Negocios',
	'vehiculos-y-transporte': 'Vehículos y transporte',
	'agua-y-ambiente': 'Agua y ambiente',
	'familia-y-bienestar': 'Familia y bienestar',
	turismo: 'Turismo',
	'documentos-y-certificados': 'Documentos y certificados',
	'otros-tramites': 'Otros trámites'
};

export const ETIQUETA_PERFIL: Record<string, string> = {
	ciudadano: 'Ciudadano',
	emprendedor: 'Emprendedor',
	empresa: 'Empresa',
	transportista: 'Transportista',
	constructor: 'Constructor',
	turista: 'Turista'
};
