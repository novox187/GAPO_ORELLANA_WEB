import type { Bloque, Media, Pagina } from '$lib/api';

/**
 * Lectores de la sección "El cantón".
 *
 * Las páginas municipales llegan como una secuencia plana de bloques
 * (`titulo`, `parrafo`, `lista`) y una bolsa de imágenes aparte. Renderizar
 * eso tal cual produce lo que había antes: "Lugares por visitar" era un
 * muro de 7.500 px con doce lugares indistinguibles y sus doce fotos
 * amontonadas al final, sin relación visible con el lugar que ilustran.
 *
 * Aquí la secuencia se vuelve a montar en los registros que realmente
 * describe. No se inventa ni un dato: sólo se reconoce la estructura que
 * el propio contenido ya tiene y se emparejan las imágenes por su orden,
 * que es el mismo en el que aparecen los bloques.
 */

const esTitulo = (b: Bloque | undefined) => b?.tipo === 'titulo';
const esParrafo = (b: Bloque | undefined) => b?.tipo === 'parrafo';
const limpio = (t: string | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const sinDosPuntos = (t: string) => t.replace(/\s*:\s*$/, '');

/** Encabezados que son etiquetas de campo, no nombres de cosa. */
const ES_CAMPO = /^(ubicaci[óo]n|atractivos)\s*:?\s*$/i;

export interface Lugar {
	nombre: string;
	ubicacion: string;
	atractivos: string;
	imagen: Media | null;
}

/**
 * "Lugares por visitar": diez lugares, cada uno como
 * `titulo(nombre) → titulo("Ubicación:") → parrafo → titulo("Atractivos:") → parrafo`.
 *
 * Las fotos son las verticales de 489 px de ancho — las postales de la
 * campaña, una por lugar y en el mismo orden. El resto de imágenes de la
 * página son cabeceras, iconos repetidos y banners, que no describen nada.
 */
export function extraerLugares(pagina: Pagina): Lugar[] {
	const postales = pagina.imagenes.filter((im) => im.ancho === 489);
	const lugares: Lugar[] = [];

	for (let i = 0; i < pagina.bloques.length; i++) {
		const b = pagina.bloques[i];
		if (!esTitulo(b)) continue;

		const nombre = limpio(b.texto);
		if (!nombre || ES_CAMPO.test(nombre)) continue;

		let ubicacion = '';
		let atractivos = '';

		// Mira hacia delante hasta el siguiente nombre de lugar.
		for (let j = i + 1; j < pagina.bloques.length; j++) {
			const s = pagina.bloques[j];
			if (esTitulo(s) && !ES_CAMPO.test(limpio(s.texto))) break;
			if (esTitulo(s) && /ubicaci/i.test(limpio(s.texto)) && esParrafo(pagina.bloques[j + 1])) {
				ubicacion = limpio(pagina.bloques[j + 1].texto);
			}
			if (esTitulo(s) && /atractivos/i.test(limpio(s.texto)) && esParrafo(pagina.bloques[j + 1])) {
				atractivos = limpio(pagina.bloques[j + 1].texto);
			}
		}

		lugares.push({
			nombre,
			ubicacion,
			atractivos,
			imagen: postales[lugares.length] ?? null
		});
	}

	return lugares;
}

export interface Entidad {
	nombre: string;
	texto: string;
	imagen: Media | null;
}

/**
 * Bloques de `titulo → parrafo` emparejados con la imagen del mismo
 * índice. Sirve a "Empresas adscritas", donde cada entidad trae su
 * cabecera gráfica en el mismo orden.
 */
export function extraerEntidades(pagina: Pagina, anchoImagen?: number): Entidad[] {
	const fotos = anchoImagen
		? pagina.imagenes.filter((im) => im.ancho === anchoImagen)
		: pagina.imagenes;
	const salida: Entidad[] = [];

	for (let i = 0; i < pagina.bloques.length; i++) {
		if (!esTitulo(pagina.bloques[i])) continue;
		const nombre = limpio(pagina.bloques[i].texto);
		if (!nombre) continue;

		// Junta todos los párrafos seguidos hasta el próximo título.
		const parrafos: string[] = [];
		for (let j = i + 1; j < pagina.bloques.length && !esTitulo(pagina.bloques[j]); j++) {
			if (esParrafo(pagina.bloques[j])) parrafos.push(limpio(pagina.bloques[j].texto));
		}

		salida.push({
			nombre,
			texto: parrafos.join('\n\n'),
			imagen: fotos[salida.length] ?? null
		});
	}

	return salida;
}

export interface Simbolo {
	nombre: string;
	parrafos: string[];
	imagen: Media | null;
}

/**
 * "Historia y símbolos": secciones de `titulo → varios parrafos`. Sólo la
 * bandera y el escudo tienen imagen; el himno y la historia son texto, así
 * que el emparejamiento va por nombre y no por índice.
 */
export function extraerSimbolos(pagina: Pagina): Simbolo[] {
	const porNombre = new Map<string, Media>();
	const [bandera, escudo] = pagina.imagenes;
	if (bandera) porNombre.set('bandera', bandera);
	if (escudo) porNombre.set('escudo', escudo);

	const salida: Simbolo[] = [];

	for (let i = 0; i < pagina.bloques.length; i++) {
		if (!esTitulo(pagina.bloques[i])) continue;
		const nombre = limpio(pagina.bloques[i].texto);
		if (!nombre) continue;

		const parrafos: string[] = [];
		for (let j = i + 1; j < pagina.bloques.length && !esTitulo(pagina.bloques[j]); j++) {
			if (esParrafo(pagina.bloques[j])) parrafos.push(limpio(pagina.bloques[j].texto));
		}

		const clave = /bandera/i.test(nombre) ? 'bandera' : /escudo/i.test(nombre) ? 'escudo' : '';
		salida.push({ nombre, parrafos, imagen: porNombre.get(clave) ?? null });
	}

	return salida;
}

export interface DatoCanton {
	etiqueta: string;
	parrafos: string[];
	listas: { texto: string; url: string | null }[][];
}

/**
 * "Datos del cantón": pares `titulo("Extensión:") → parrafo`. Dos de ellos
 * arrastran además listas (las parroquias y sus comunidades).
 */
export function extraerDatos(pagina: Pagina): DatoCanton[] {
	const salida: DatoCanton[] = [];

	for (let i = 0; i < pagina.bloques.length; i++) {
		if (!esTitulo(pagina.bloques[i])) continue;
		const etiqueta = sinDosPuntos(limpio(pagina.bloques[i].texto));
		if (!etiqueta) continue;

		const parrafos: string[] = [];
		const listas: DatoCanton['listas'] = [];
		for (let j = i + 1; j < pagina.bloques.length && !esTitulo(pagina.bloques[j]); j++) {
			const b = pagina.bloques[j];
			if (esParrafo(b)) parrafos.push(limpio(b.texto));
			if (b.tipo === 'lista' && b.items?.length) listas.push(b.items);
		}

		salida.push({ etiqueta, parrafos, listas });
	}

	return salida;
}

export interface Concejal {
	nombre: string;
	foto: Media | null;
}

/**
 * "Concejo Municipal": la página es sólo siete nombres y siete retratos,
 * en el mismo orden. El sitio los publicaba como títulos sueltos y las
 * fotos aparte, sin manera de saber quién es quién.
 */
export function extraerConcejales(pagina: Pagina): Concejal[] {
	const nombres = pagina.bloques.filter(esTitulo).map((b) => limpio(b.texto)).filter(Boolean);
	return nombres.map((nombre, i) => ({ nombre, foto: pagina.imagenes[i] ?? null }));
}

/**
 * Nombres de las especies del Coca Zoo.
 *
 * Las fichas ilustradas llegan sin texto alternativo, pero el municipio sí
 * nombró cada archivo (`TUCAN.jpg`, `MONO-CHORONGO.jpg`…). Ese nombre es
 * dato del propio municipio, no una descripción inventada por nosotros, y
 * es lo único que permite que un lector de pantalla distinga una ficha de
 * otra. El hash es el identificador estable del medio tras la extracción.
 */
export const ESPECIES_COCA_ZOO: Record<string, string> = {
	'4df9a50dd37bbeda': 'Tucán',
	'514388c1a614c7c2': 'Tapir',
	'84a1fb084cfc9e95': 'Tigrillo',
	'1714114285ff4267': 'Oso perezoso',
	b18d84fc05f7245c: 'Motelo',
	'7cda873427da64c9': 'Mono chorongo',
	f265b1ff1df431db: 'Mono ardilla',
	df917866a6e04d20: 'Anaconda',
	'787aa608a4162aa6': 'Caimán'
};
