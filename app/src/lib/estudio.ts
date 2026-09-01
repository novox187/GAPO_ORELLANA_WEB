import type {
	Cuenta,
	Destacada,
	ElementoHistoria as ElementoPublico,
	Historia,
	Media,
	PublicacionResumen
} from './api';

/**
 * Cliente del estudio del creador.
 *
 * Todo pasa por `/api/estudio/…`, el proxy del propio SvelteKit que añade el
 * token: aquí no hay una sola lectura pública, así que —a diferencia del
 * módulo social— también las consultas van por él. Ver el proxy para el
 * porqué.
 */
const RAIZ = '/api/estudio';

export interface CuentaEstudio extends Cuenta {
	publicaciones_contador: number;
	seguidores_contador: number;
	seguidos_contador: number;
}

export interface Etiqueta {
	alias: string;
	nombre: string;
	avatar: Media | null;
	verificada: boolean;
	x: number | null;
	y: number | null;
}

export interface Ubicacion {
	nombre: string;
	slug: string | null;
}

export interface PublicacionEstudio {
	id: number;
	slug: string;
	tipo: 'nota' | 'breve';
	estado: 'publicado' | 'borrador';
	cuenta?: Cuenta;
	titulo: string;
	pie: string;
	resumen: string;
	cuerpo?: string;
	fecha: string | null;
	publicado_en: string | null;
	ubicacion: Ubicacion | null;
	imagen: Media | null;
	imagenes?: Media[];
	num_imagenes?: number;
	etiquetadas?: Etiqueta[];
	permite_comentarios: boolean;
	permite_reacciones: boolean;
	fijada: boolean;
	reacciones_contador: number;
	comentarios_contador: number;
	url: string;
}

export interface Creador {
	id: number;
	nombre: string;
	correo: string;
	roles: string[];
	cuentas: CuentaEstudio[];
}

/**
 * Un elemento pegado sobre una historia, tal como lo maneja el compositor.
 *
 * Extiende el tipo público (`api.ts`) relajando `id`, `orden` y
 * `respuestas_contador`: mientras se compone, un elemento todavía no tiene
 * fila y por tanto no tiene id. La forma se declara UNA sola vez y allí,
 * porque el mismo componente la pinta en el estudio y en el visor.
 */
export type ElementoHistoria = Omit<ElementoPublico, 'id' | 'orden' | 'respuestas_contador'> & {
	id?: number;
	orden?: number;
	respuestas_contador?: number;
};

/**
 * `Omit` sobre `elementos` y no un `extends` a secas: en el estudio un
 * elemento puede no tener id todavía —se está componiendo—, así que su tipo es
 * más laxo que el público y TypeScript, con razón, no deja estrecharlo por
 * herencia.
 */
export interface HistoriaEstudio extends Omit<Historia, 'elementos'> {
	elementos?: ElementoHistoria[];
	activa?: boolean;
	metricas?: {
		aperturas: number;
		alcance: number;
		enlaces: number;
		reproducciones: number;
		compartidos: number;
	};
}

export interface AjustesHistorias {
	duraciones_permitidas: number[];
	duracion_por_defecto: number;
	permitir_destacadas: boolean;
	permitir_enlace: boolean;
	permitir_texto_superpuesto: boolean;
	segundos_por_diapositiva: number;
	max_por_dia_por_cuenta: number;
}

/** Una cifra del panel con su comparación contra el periodo anterior. */
export interface Cifra {
	valor: number;
	previo: number | null;
	/** Nulo cuando no había base con la que comparar: ver InformeMetricas. */
	variacion: number | null;
}

export interface Punto {
	fecha: string;
	valor: number;
}

export interface Periodo {
	dias: number;
	desde: string;
	hasta: string;
}

export interface Cobertura {
	midiendo_desde: string | null;
	periodo_incompleto: boolean;
}

export type NombreCifra =
	| 'alcance'
	| 'impresiones'
	| 'visitas'
	| 'reproducciones'
	| 'compartidos'
	| 'reacciones'
	| 'comentarios'
	| 'guardados'
	| 'seguidores_nuevos';

export interface ResumenMetricas {
	periodo: Periodo;
	cifras: Record<NombreCifra, Cifra>;
	/** Nula cuando no hubo alcance: sin denominador la división no existe. */
	tasa_interaccion: number | null;
	series: { alcance: Punto[]; impresiones: Punto[]; interacciones: Punto[] };
	publicado: { publicaciones: number; historias: number };
	cobertura: Cobertura;
}

export interface MetricasPublicacion extends Omit<ResumenMetricas, 'publicado' | 'series'> {
	series: { alcance: Punto[]; impresiones: Punto[] };
	referencia: { alcance_medio_de_la_cuenta: number | null };
}

export interface Reparto {
	etiqueta: string;
	total: number;
	porcentaje: number;
}

export interface Audiencia {
	periodo: Periodo;
	dispositivos: Reparto[];
	horas: { hora: number; total: number }[];
	dias_semana: { dia: number; etiqueta: string; total: number }[];
	parroquias: Reparto[];
	edades: Reparto[];
	cobertura: {
		eventos: number;
		personas_identificadas: number;
		personas_que_declararon: number;
		porcentaje_declarado: number | null;
		desde: string | null;
	};
}

/** Error de una petición al estudio, con el estado y los `errors` de Laravel. */
export class ErrorEstudio extends Error {
	constructor(
		message: string,
		public readonly estado: number,
		public readonly errores: Record<string, string[]> = {}
	) {
		super(message);
	}

	/** El primer mensaje de validación, o el general si no hay ninguno específico. */
	primero(): string {
		return Object.values(this.errores)[0]?.[0] ?? this.message;
	}
}

async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
	const res = await fetch(`${RAIZ}/${ruta}`, opciones);
	const datos = await res.json().catch(() => ({}));

	if (!res.ok) {
		throw new ErrorEstudio(
			datos?.message ?? 'No se pudo completar la acción.',
			res.status,
			datos?.errors ?? {}
		);
	}

	return datos as T;
}

function conCuerpo<T>(ruta: string, metodo: string, cuerpo?: unknown): Promise<T> {
	return pedir<T>(ruta, {
		method: metodo,
		headers: cuerpo === undefined ? undefined : { 'Content-Type': 'application/json' },
		body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
	});
}

export const estudio = {
	// ------------------------------------------------------------- sesión
	entrar: async (correo: string, password: string): Promise<Creador> => {
		const res = await fetch('/api/estudio/sesion', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ correo, password })
		});
		const datos = await res.json().catch(() => ({}));

		if (!res.ok) {
			throw new ErrorEstudio(
				datos?.message ?? 'No se pudo iniciar sesión.',
				res.status,
				datos?.errors ?? {}
			);
		}

		return datos.data as Creador;
	},

	salir: () => fetch('/api/estudio/sesion', { method: 'DELETE' }),

	// -------------------------------------------------------------- perfil
	perfil: (alias: string) =>
		pedir<{ data: CuentaEstudio; permisos: { editar_perfil: boolean; publicar: boolean } }>(
			`cuentas/${alias}`
		),

	guardarPerfil: (alias: string, campos: Record<string, unknown>) =>
		conCuerpo<{ data: CuentaEstudio }>(`cuentas/${alias}`, 'PUT', campos),

	publicaciones: (alias: string, cursor?: number | null, estado?: 'borrador') => {
		const parametros = new URLSearchParams();
		if (cursor) parametros.set('cursor', String(cursor));
		if (estado) parametros.set('estado', estado);
		const cola = parametros.toString();

		return pedir<{ data: PublicacionEstudio[]; meta: { siguiente_cursor: number | null } }>(
			`cuentas/${alias}/publicaciones${cola ? `?${cola}` : ''}`
		);
	},

	etiquetada: (alias: string) => pedir<{ data: PublicacionEstudio[] }>(`cuentas/${alias}/etiquetada`),

	// ---------------------------------------------------------- compositor
	/**
	 * Sube una fotografía o un vídeo. `FormData` y no JSON: el archivo ya
	 * viene recortado y filtrado desde el `<canvas>` del compositor, y
	 * codificarlo en base64 para meterlo en un JSON lo engordaría un tercio
	 * sin ganar nada.
	 */
	subirMedio: async (
		archivo: Blob,
		uso: 'publicacion' | 'historia' | 'avatar' | 'portada',
		alt: string,
		recorte?: { desde?: number; hasta?: number }
	): Promise<Media> => {
		const cuerpo = new FormData();
		cuerpo.append('archivo', archivo, nombreDe(archivo));
		cuerpo.append('uso', uso);
		cuerpo.append('alt', alt);
		if (recorte?.desde !== undefined) cuerpo.append('desde', String(recorte.desde));
		if (recorte?.hasta !== undefined) cuerpo.append('hasta', String(recorte.hasta));

		const { data } = await pedir<{ data: Media }>('medios', { method: 'POST', body: cuerpo });

		return data;
	},

	crear: (campos: Record<string, unknown>) =>
		conCuerpo<{ data: PublicacionEstudio }>('publicaciones', 'POST', campos),

	publicacion: (id: number) => pedir<{ data: PublicacionEstudio }>(`publicaciones/${id}`),

	actualizar: (id: number, campos: Record<string, unknown>) =>
		conCuerpo<{ data: PublicacionEstudio }>(`publicaciones/${id}`, 'PUT', campos),

	retirar: (id: number) => conCuerpo<{ data: PublicacionEstudio }>(`publicaciones/${id}/retirar`, 'POST', {}),

	fijar: (id: number, fijada: boolean) =>
		conCuerpo<{ data: PublicacionEstudio }>(`publicaciones/${id}/fijar`, 'POST', { fijada }),

	// ----------------------------------------------------------- historias
	historias: (alias: string) =>
		pedir<{ data: HistoriaEstudio[]; ajustes: AjustesHistorias }>(`cuentas/${alias}/historias`),

	publicarHistoria: (campos: Record<string, unknown>) =>
		conCuerpo<{ data: HistoriaEstudio }>('historias', 'POST', campos),

	borrarHistoria: (id: number) => conCuerpo<{ data: null }>(`historias/${id}`, 'DELETE'),

	respuestasHistoria: (id: number) =>
		pedir<{
			data: {
				id: number;
				tipo: string;
				contenido: Record<string, unknown>;
				total: number;
				resultados?: number[];
				respuestas?: { id: number; texto: string; de: string | null; cuando: string }[];
			}[];
		}>(`historias/${id}/respuestas`),

	// ---------------------------------------------------------- destacadas
	destacadas: (alias: string) => pedir<{ data: Destacada[] }>(`cuentas/${alias}/destacadas`),

	crearDestacada: (alias: string, titulo: string) =>
		conCuerpo<{ data: Destacada }>(`cuentas/${alias}/destacadas`, 'POST', { titulo }),

	actualizarDestacada: (id: number, campos: { titulo?: string; portada_uid?: string }) =>
		conCuerpo<{ data: Destacada }>(`destacadas/${id}`, 'PUT', campos),

	borrarDestacada: (id: number) => conCuerpo<{ data: null }>(`destacadas/${id}`, 'DELETE'),

	guardarEnDestacada: (destacadaId: number, historiaId: number, guardar: boolean) =>
		conCuerpo<{ data: Destacada }>(`destacadas/${destacadaId}/historias/${historiaId}`, 'POST', {
			guardar
		}),

	// -------------------------------------------------------- estadísticas
	metricas: (alias: string, dias: number) =>
		pedir<{
			data: ResumenMetricas;
			mejores: { publicacion: PublicacionEstudio; alcance: number; impresiones: number }[];
		}>(`cuentas/${alias}/metricas?dias=${dias}`),

	audiencia: (alias: string, dias: number) =>
		pedir<{ data: Audiencia }>(`cuentas/${alias}/metricas/audiencia?dias=${dias}`),

	metricasDe: (id: number, dias: number) =>
		pedir<{ data: MetricasPublicacion; publicacion: PublicacionEstudio }>(
			`publicaciones/${id}/metricas?dias=${dias}`
		)
};

/** Nombre con extensión coherente: Cloudinary lo usa para decidir el formato. */
function nombreDe(archivo: Blob): string {
	if (archivo instanceof File && archivo.name) return archivo.name;

	const extension = archivo.type.split('/')[1]?.split(';')[0] ?? 'bin';

	return `medio.${extension}`;
}

/** Formatea una cifra grande como la formatea cualquier red social: 1,2 mil. */
export function cifra(n: number): string {
	if (n < 1000) return String(n);
	if (n < 1_000_000) return `${(n / 1000).toLocaleString('es-EC', { maximumFractionDigits: 1 })} mil`;

	return `${(n / 1_000_000).toLocaleString('es-EC', { maximumFractionDigits: 1 })} M`;
}

/** El texto de una variación, con su signo. Nula cuando no hay con qué comparar. */
export function variacion(v: number | null): string | null {
	if (v === null) return null;

	return `${v > 0 ? '+' : ''}${v.toLocaleString('es-EC', { maximumFractionDigits: 1 })} %`;
}

/** Se conserva la referencia al tipo del feed público para no duplicarlo. */
export type { PublicacionResumen };
