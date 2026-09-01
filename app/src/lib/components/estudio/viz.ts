/**
 * Las cuentas que necesitan los gráficos del estudio. Sin librería: son
 * cuatro funciones y un `path`, y meter una dependencia de gráficos en un
 * proyecto que hoy no tiene ninguna en tiempo de ejecución costaría más de lo
 * que ahorra.
 */

export interface Punto {
	fecha: string;
	valor: number;
}

/** Caja de dibujo en coordenadas del SVG. El alto es fijo; el ancho lo estira el viewBox. */
export const CAJA = { ancho: 720, alto: 220, margen: { arriba: 16, derecha: 16, abajo: 26, izquierda: 44 } };

export const TRAZO = { ancho: CAJA.ancho - CAJA.margen.izquierda - CAJA.margen.derecha };
export const TRAZO_ALTO = CAJA.alto - CAJA.margen.arriba - CAJA.margen.abajo;

/**
 * Techo del eje redondeado a un número limpio (10, 25, 50, 100, 250…).
 *
 * Un eje que termina en 37 obliga a leer cada etiqueta; uno que termina en 40
 * se lee de un vistazo. Nunca menos de 4: con un máximo de 1, un eje de 0 a 1
 * convierte cualquier ruido en una montaña.
 */
export function techo(valores: number[]): number {
	const maximo = Math.max(0, ...valores);

	if (maximo <= 4) return 4;

	const magnitud = 10 ** Math.floor(Math.log10(maximo));

	for (const paso of [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10]) {
		const candidato = paso * magnitud;
		if (candidato >= maximo) return candidato;
	}

	return 10 * magnitud;
}

/** Cuatro marcas: 0, un tercio, dos tercios y el techo. Más líneas no aportan y ensucian. */
export function marcas(max: number): number[] {
	return [0, max / 3, (max * 2) / 3, max].map((v) => Math.round(v));
}

export function x(indice: number, total: number): number {
	if (total <= 1) return CAJA.margen.izquierda + TRAZO.ancho / 2;

	return CAJA.margen.izquierda + (indice / (total - 1)) * TRAZO.ancho;
}

export function y(valor: number, max: number): number {
	const proporcion = max === 0 ? 0 : valor / max;

	return CAJA.margen.arriba + TRAZO_ALTO * (1 - proporcion);
}

/** Polilínea de la serie. Recta y no curvada: una curva inventa valores entre dos días. */
export function linea(puntos: Punto[], max: number): string {
	return puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i, puntos.length)} ${y(p.valor, max)}`).join(' ');
}

/** El mismo trazo cerrado contra la base, para el velo bajo la línea. */
export function area(puntos: Punto[], max: number): string {
	if (puntos.length === 0) return '';

	const base = CAJA.margen.arriba + TRAZO_ALTO;

	return `${linea(puntos, max)} L ${x(puntos.length - 1, puntos.length)} ${base} L ${x(0, puntos.length)} ${base} Z`;
}

/** Número con separador de miles ecuatoriano. */
export function numero(n: number): string {
	return n.toLocaleString('es-EC');
}

/** «12 ago» — etiqueta corta de eje. */
export function diaCorto(iso: string): string {
	const d = new Date(`${iso}T12:00:00`);

	if (Number.isNaN(d.getTime())) return iso;

	return d.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' }).replace('.', '');
}

/** «martes 12 de agosto» — para el globo, donde sí cabe entero. */
export function diaLargo(iso: string): string {
	const d = new Date(`${iso}T12:00:00`);

	if (Number.isNaN(d.getTime())) return iso;

	return d.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });
}

/**
 * Cuántas etiquetas del eje horizontal caben sin amontonarse.
 *
 * Con noventa días no se pueden pintar noventa fechas: se pinta una de cada
 * N. El resto de los valores los lleva el globo al pasar por encima y la
 * tabla de abajo, así que no se pierde nada.
 */
export function saltoEtiquetas(total: number): number {
	return Math.max(1, Math.ceil(total / 7));
}
