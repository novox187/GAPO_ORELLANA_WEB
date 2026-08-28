/**
 * Forma de la respuesta del asistente, compartida entre el servidor que la
 * arma y el componente que la pinta.
 *
 * Vive fuera de `src/lib/server/` a propósito: SvelteKit prohíbe que el
 * código del navegador importe nada de esa carpeta —que es justo lo que la
 * hace segura— y el componente necesita estos tipos.
 */

/**
 * Cuánta confianza merece la ficha. Los tramos están calibrados contra
 * consultas reales en `scripts/evaluar-recuperacion.ts`; el porqué de que
 * exista un tramo intermedio está explicado en `server/recuperacion.ts`.
 */
export type Confianza = 'alta' | 'media' | 'baja';

export interface Dato {
	etiqueta: string;
	valor: string;
}

export interface Enlace {
	titulo: string;
	url: string;
	tipo: string;
}

export interface Ficha {
	clase: 'tramite' | 'pagina' | 'noticia' | 'direccion';
	titulo: string;
	url: string;
	/** Qué es esto, en las palabras del propio municipio. */
	entradilla: string;
	datos: Dato[];
	requisitos: string[];
	pasos: { titulo: string; descripcion: string }[];
	documentos: Enlace[];
	telefonos: { cargo: string; extension: string }[];
	/** La fuente municipal reconoce que este contenido está sin revisar. */
	requiereRevision: boolean;
}

export interface Contacto {
	correo: string | null;
	nota: string;
	redes: { red: string; url: string }[];
}

export interface Respuesta {
	consulta: string;
	confianza: Confianza;
	ficha: Ficha | null;
	alternativas: Enlace[];
	noticias: Enlace[];
	/** Redactado por el modelo local. `null` mientras la fase 2 esté apagada. */
	parrafo: string | null;
	contacto: Contacto;
}

export const ETIQUETA_TIPO: Record<string, string> = {
	tramite: 'Trámite',
	noticia: 'Noticia',
	pagina: 'Página',
	direccion: 'Dirección municipal'
};

/**
 * Un turno de la conversación.
 *
 * El texto del asistente se guarda aparte de `respuesta.parrafo` porque
 * mientras el modelo escribe sólo tenemos trozos sueltos: `parrafo` es el
 * texto definitivo, ya verificado, y `escrito` es lo que se está viendo
 * aparecer. Si el control numérico lo descarta, `escrito` se borra y la ficha
 * se queda sola — que es exactamente lo que debe pasar.
 */
export interface Turno {
	id: string;
	rol: 'ciudadano' | 'asistente';
	/** Lo que escribió el ciudadano. Vacío en los turnos del asistente. */
	texto: string;
	/** La ficha oficial y sus enlaces. Llega en 20 ms, antes que el texto. */
	respuesta?: Respuesta;
	/** Lo que va escribiendo el modelo, trozo a trozo. */
	escrito?: string;
	estado: 'pensando' | 'redactando' | 'listo' | 'error';
	/** Mensaje de error, cuando lo hay. */
	error?: string;
	mensajeId?: number;
	/** Si el ciudadano ya dijo si le sirvió. */
	util?: boolean;
}

/** Respuesta del backend al abrir una conversación. */
export interface Conversacion {
	conversacion: string;
}
