/**
 * Cliente de datos.
 *
 * Lee de la API en Laravel cuando `PUBLIC_API_BASE` está configurada, y de los
 * JSON estáticos empaquetados en la imagen cuando no. El envelope
 * (`{ data, meta, links }`) es idéntico en ambos casos, así que ningún
 * componente se entera de cuál está sirviendo.
 *
 * **El respaldo no es una comodidad de desarrollo.** Hasta ahora este sitio no
 * podía caerse: eran archivos. Al ponerle un backend delante, sí puede. Si
 * Laravel no responde, se vuelve a los estáticos: el ciudadano ve contenido
 * quizá desactualizado en vez de un error, que en un sitio municipal es
 * bastante mejor. Lo único que no tiene respaldo es el asistente, porque
 * necesita el modelo.
 */

import { env } from '$env/dynamic/public';

/** Los estáticos siguen en la imagen y son el respaldo. */
const ESTATICOS = '/api/v1';

const REMOTA = (env.PUBLIC_API_BASE ?? '').replace(/\/+$/, '');

type Fetch = typeof globalThis.fetch;

async function obtener<T>(f: Fetch, ruta: string): Promise<T> {
	if (REMOTA) {
		try {
			// fetch nativo, no el `f` de `load()`: ese fetch imita CORS también
			// en el servidor, y para la cabecera Origin usa el ORIGIN interno
			// del contenedor (http://localhost:3000, necesario para que el
			// respaldo estático de aquí abajo se resuelva sin el hairpin de
			// Coolify — ver docs/arquitectura.md), no el dominio público. Ese
			// origen interno nunca está en la lista blanca de Laravel, así que
			// la petición se rechazaba como si fuera un navegador de un
			// tercero, aunque es tráfico servidor-a-servidor sin cookies a una
			// lectura pública. El fetch nativo no impone esa capa.
			const res = await fetch(`${REMOTA}/v1/${ruta}`);
			if (res.ok) return (await res.json()) as T;
			// Un 404 es una respuesta legítima —ese recurso no existe— y no
			// tiene sentido buscarlo en los estáticos, que son más viejos.
			if (res.status === 404) throw new Error(`No se pudo cargar ${ruta} (404)`);
		} catch (e) {
			if (e instanceof Error && e.message.includes('(404)')) throw e;
			// Cualquier otro fallo —red, 500, timeout— cae al respaldo. Se deja
			// constancia en el log del servidor: al no tener respaldo estático
			// el módulo social, este fallo pasaba desapercibido hasta que el
			// respaldo también fallaba con un 404 genérico y sin pista alguna
			// de la causa real.
			console.error(`[api] fallo al pedir ${REMOTA}/v1/${ruta}:`, e);
		}
	}

	const res = await f(`${ESTATICOS}/${ruta}`);
	if (!res.ok) throw new Error(`No se pudo cargar ${ruta} (${res.status})`);
	return res.json() as Promise<T>;
}

/** Base de la API para lo que no pasa por `obtener()`, como el asistente. */
export const API_BASE = REMOTA;

export interface Media {
	id: string;
	rutaOriginal: string;
	rutaDerivados: Record<string, string>;
	ancho: number | null;
	alto: number | null;
	alt: string;
	altPendiente: boolean;
	/**
	 * Identificador en Cloudinary (`orellana-web/<id>`), presente desde la
	 * migración de media/originales fuera de git — ver
	 * tools/cloudinary/. `rutaOriginal` y `rutaDerivados` ya son URLs
	 * absolutas a Cloudinary; este campo no lo consume ningún componente
	 * todavía, se guarda para poder administrar o volver a transformar el
	 * activo sin tener que recuperar el id a mano.
	 */
	cloudinaryPublicId?: string;
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

/**
 * El módulo social — Alcaldía y direcciones publicando historias y
 * publicaciones, con reacciones y comentarios de ciudadanos con cuenta.
 *
 * Vive bajo `/v1/social/*`, sin sufijo `.json` de compatibilidad porque no
 * reemplaza ningún archivo estático del sitio origen: es contenido que no
 * existía antes de Laravel. Por eso, a diferencia de `api.noticias()`, estas
 * llamadas no tienen respaldo estático — si la API no responde, la petición
 * falla como cualquier recurso que nunca tuvo forma de archivo. Las 280
 * notas heredadas siguen sirviéndose además por `api.noticias()` /
 * `api.noticia()`, que sí conservan el respaldo de siempre.
 */
export interface Cuenta {
	id: number;
	slug: string;
	alias: string;
	nombre: string;
	tipo: 'alcaldia' | 'direccion';
	verificada: boolean;
	avatar: Media | null;
	/** Sólo presente cuando el perfil se pidió con detalle (ficha del perfil). */
	portada?: Media | null;
	biografia?: string;
	enlace_url: string | null;
	/** Sólo presente en los listados que lo calculan (directorio, bandeja de historias). */
	tiene_historias_activas?: boolean;
	/** Sólo presente en la ficha del perfil. */
	destacadas?: Destacada[];
}

export interface PublicacionResumen {
	id: number;
	slug: string;
	tipo: 'nota' | 'breve';
	cuenta: Cuenta;
	titulo: string;
	pie: string;
	resumen: string;
	fecha: string | null;
	imagen: Media | null;
	num_imagenes?: number;
	permite_comentarios: boolean;
	permite_reacciones: boolean;
	reacciones_contador: number;
	comentarios_contador: number;
	fijada: boolean;
	url: string;
}

export interface PublicacionSocial extends Omit<PublicacionResumen, 'num_imagenes'> {
	cuerpo: string;
	imagenes: Media[];
	fuente_url: string | null;
}

export interface Historia {
	id: number;
	/** Ausente cuando la historia llega anidada dentro de una destacada del perfil. */
	cuenta?: Cuenta;
	medio: Media;
	texto: string | null;
	enlace_url: string | null;
	enlace_texto: string | null;
	publicado_en: string | null;
	expira_en: string | null;
	destacada_id: number | null;
}

export interface Destacada {
	id: number;
	titulo: string;
	portada: Media | null;
	historias?: Historia[];
}

export interface AutorComentario {
	nombre: string | null;
	alias?: string;
	avatar: Media | null;
	verificada: boolean;
}

export interface Comentario {
	id: number;
	texto: string;
	creado_en: string | null;
	es_oficial: boolean;
	/** Id del ciudadano autor, o null si es una respuesta oficial de la cuenta. */
	ciudadano_id: number | null;
	autor: AutorComentario;
	respuesta_a_id: number | null;
	respuestas?: Comentario[];
}

interface SobreCursor<T> {
	data: T[];
	meta: { siguiente_cursor: number | null };
}

export interface Ciudadano {
	id: number;
	nombre: string;
	correo: string;
	avatar: Media | null;
	estado: 'activo' | 'silenciado' | 'bloqueado';
	correo_verificado: boolean;
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

/** Añade `?cursor=n` sólo cuando hay cursor; sin él se pide la primera tanda. */
function conCursor(ruta: string, cursor?: number | null): string {
	return cursor ? `${ruta}?cursor=${cursor}` : ruta;
}

export const social = {
	/** El directorio: Alcaldía y las direcciones que publican. */
	cuentas: (f: Fetch) => obtener<Sobre<Cuenta[]>>(f, 'social/cuentas.json').then((r) => r.data),

	/** El perfil: cabecera, destacadas y si tiene historias activas. */
	cuenta: (f: Fetch, slug: string) =>
		obtener<Sobre<Cuenta>>(f, `social/cuentas/${slug}.json`).then((r) => r.data),

	/** La cuadrícula del perfil, una tanda de 12. */
	publicacionesDeCuenta: (f: Fetch, slug: string, cursor?: number | null) =>
		obtener<SobreCursor<PublicacionResumen>>(f, conCursor(`social/cuentas/${slug}/publicaciones.json`, cursor)),

	/** Las diapositivas de una cuenta, en orden de publicación. */
	historiasDeCuenta: (f: Fetch, slug: string) =>
		obtener<Sobre<Historia[]>>(f, `social/cuentas/${slug}/historias.json`).then((r) => r.data),

	/** El feed cronológico de todas las cuentas, una tanda de 12. */
	feed: (f: Fetch, cursor?: number | null) =>
		obtener<SobreCursor<PublicacionResumen>>(f, conCursor('social/feed.json', cursor)),

	/** La publicación completa, con la primera tanda de comentarios. */
	publicacion: (f: Fetch, slug: string) =>
		obtener<{ data: PublicacionSocial; comentarios: SobreCursor<Comentario> }>(
			f,
			`social/publicaciones/${slug}.json`
		),

	/** Comentarios de nivel superior, más antiguos primero, con sus respuestas. */
	comentarios: (f: Fetch, slug: string, cursor?: number | null) =>
		obtener<SobreCursor<Comentario>>(f, conCursor(`social/publicaciones/${slug}/comentarios.json`, cursor)),

	/** La bandeja: cuentas con al menos una historia activa. */
	bandejaHistorias: (f: Fetch) => obtener<Sobre<Cuenta[]>>(f, 'social/historias.json').then((r) => r.data),

	/**
	 * Escrituras: pasan por `/api/social/…`, el proxy del propio SvelteKit
	 * que añade el token del ciudadano — nunca directas a Laravel, porque el
	 * navegador no tiene el token, sólo la cookie httpOnly lo tiene.
	 */
	reaccionar: (slug: string) => escribir(`social/publicaciones/${slug}/reacciones`, 'POST'),
	quitarReaccion: (slug: string) => escribir(`social/publicaciones/${slug}/reacciones`, 'DELETE'),

	comentar: (slug: string, texto: string, respuestaAId?: number | null) =>
		escribir<{ data: Comentario }>(`social/publicaciones/${slug}/comentarios`, 'POST', {
			texto,
			respuesta_a_id: respuestaAId ?? null
		}),

	editarComentario: (id: number, texto: string) =>
		escribir<{ data: Comentario }>(`social/comentarios/${id}`, 'PATCH', { texto }),

	borrarComentario: (id: number) => escribir(`social/comentarios/${id}`, 'DELETE'),

	reportarComentario: (id: number, motivo: string, nota?: string) =>
		escribir(`social/comentarios/${id}/reportes`, 'POST', { motivo, nota })
};

/** Error de una escritura: además del mensaje, expone el estado HTTP y los `errors` de validación de Laravel. */
export class ErrorEscritura extends Error {
	constructor(
		message: string,
		public readonly estado: number,
		public readonly errores: Record<string, string[]> = {}
	) {
		super(message);
	}

	/** El primer mensaje de validación, o el mensaje general si no hay ninguno específico. */
	primero(): string {
		const campo = Object.values(this.errores)[0];
		return campo?.[0] ?? this.message;
	}
}

async function escribir<T = { data: unknown }>(
	ruta: string,
	metodo: 'POST' | 'PATCH' | 'DELETE',
	cuerpo?: Record<string, unknown>
): Promise<T> {
	const res = await fetch(`/api/${ruta}`, {
		method: metodo,
		headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
		body: cuerpo ? JSON.stringify(cuerpo) : undefined
	});

	const datos = await res.json().catch(() => ({}));

	if (!res.ok) {
		throw new ErrorEscritura(datos?.message ?? 'No se pudo completar la acción.', res.status, datos?.errors ?? {});
	}

	return datos as T;
}

/**
 * Búsqueda léxica sin dependencias: puntúa coincidencias en título (peso
 * alto) y cuerpo (peso bajo), ignorando acentos. Suficiente mientras no
 * exista el backend; la fase de búsqueda semántica sustituirá esta función
 * sin cambiar la forma del resultado.
 */
/** Minúsculas y sin acentos, para comparar texto ignorando tildes. */
export function normalizarTexto(s: string): string {
	return (s ?? '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '');
}

export function buscar(documentos: DocumentoIndice[], consulta: string): DocumentoIndice[] {
	const normaliza = normalizarTexto;

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
