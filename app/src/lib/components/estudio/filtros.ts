import { multiplyMatrices, brightnessMatrix, contrastMatrix, saturationMatrix, temperatureMatrix } from '@we-are-singular/svelte-chop-chop';
import type { ChopPlugin, FilterMatrix } from '@we-are-singular/svelte-chop-chop';

/**
 * Los preajustes municipales, como matrices de color de verdad.
 *
 * Antes esto era una cadena `filter: sepia(0.4) saturate(1.1)…` de CSS,
 * aplicada dos veces —una para la previsualización, otra sobre el lienzo
 * exportado— y sólo funcionaba donde `CanvasRenderingContext2D.filter`
 * existe. Una matriz de color se aplica con `getImageData`/`putImageData`,
 * que no depende de ninguna característica opcional del navegador: funciona
 * en todos, y es exactamente la misma operación en la previsualización en
 * vivo y en el archivo final porque las dos pasan por el mismo código de
 * `createImageEditor`.
 *
 * Se componen multiplicando las matrices que ya trae la librería
 * (`brightnessMatrix`, `contrastMatrix`, `saturationMatrix`,
 * `temperatureMatrix`) en vez de inventar coeficientes propios: es la misma
 * matemática que usan los controles de Ajustes, así que un preajuste y un
 * ajuste manual se combinan sin sorpresas.
 *
 * Los nombres son del cantón, no de un catálogo importado. Un filtro se
 * elige por cómo suena tanto como por cómo se ve, y los de fábrica de la
 * librería se llaman «clarendon», «gingham», «juno» — el catálogo de
 * Instagram, literalmente. No se usan.
 */
const IDENTIDAD: number[] = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];

function componer(...matrices: number[][]): number[] {
	return matrices.reduce((acumulada, m) => multiplyMatrices(acumulada, m), IDENTIDAD);
}

export const PRESETS_MUNICIPALES: FilterMatrix[] = [
	{
		clave: 'napo',
		nombre: 'Napo',
		matrix: componer(saturationMatrix(18), contrastMatrix(8), temperatureMatrix(-8))
	},
	{
		clave: 'selva',
		nombre: 'Selva',
		matrix: componer(saturationMatrix(32), contrastMatrix(5), brightnessMatrix(-2))
	},
	{
		clave: 'achiote',
		nombre: 'Achiote',
		matrix: componer(saturationMatrix(-10), temperatureMatrix(20), contrastMatrix(6))
	},
	{
		clave: 'garza',
		nombre: 'Garza',
		matrix: componer(brightnessMatrix(8), contrastMatrix(-6), saturationMatrix(-10))
	},
	{
		clave: 'chonta',
		nombre: 'Chonta',
		matrix: componer(temperatureMatrix(25), saturationMatrix(-15), contrastMatrix(5))
	},
	{
		clave: 'neblina',
		nombre: 'Neblina',
		matrix: componer(contrastMatrix(-10), brightnessMatrix(5), saturationMatrix(-15))
	},
	{
		clave: 'carbon',
		nombre: 'Carbón',
		matrix: componer(saturationMatrix(-100), contrastMatrix(12))
	},
	{
		clave: 'archivo',
		nombre: 'Archivo',
		// Blanco y negro y LUEGO un tinte cálido: la desaturación total no
		// borra el desplazamiento de canal que aplica `temperatureMatrix`
		// después, así que el resultado es un monocromo con pátina, como una
		// fotografía de archivo. El orden de la composición importa.
		matrix: componer(saturationMatrix(-100), temperatureMatrix(15), contrastMatrix(5))
	}
].map(({ clave, nombre, matrix }) => ({ name: clave, label: nombre, matrix }));

/**
 * El plugin que registra el catálogo municipal en el editor.
 *
 * Es el único punto de extensión que `createImageEditor` ofrece para meter
 * presets propios (`ctx.registerFilterPresets`), y no dibuja ninguna
 * interfaz: la barra de herramientas real es la del estudio, no la que trae
 * la librería de fábrica.
 */
export function pluginPresetsMunicipales(): ChopPlugin {
	return {
		name: 'presets-municipales',
		setup(ctx) {
			ctx.registerFilterPresets(PRESETS_MUNICIPALES);
		}
	};
}

/**
 * Los siete controles de Ajustes, con su rango y su valor neutro.
 *
 * Salen de `FilterState` en el propio paquete: claridad va de 0 a 100 (no
 * admite negativos, a diferencia del resto) y gamma es multiplicativo con
 * neutro en 1, no en 0 — de ahí que cada entrada lleve su propio mínimo,
 * máximo y paso en vez de asumir uno común para los siete.
 */
export const CONTROLES_AJUSTE = [
	{ clave: 'brightness', nombre: 'Brillo', min: -100, max: 100, paso: 1, neutro: 0 },
	{ clave: 'contrast', nombre: 'Contraste', min: -100, max: 100, paso: 1, neutro: 0 },
	{ clave: 'saturation', nombre: 'Saturación', min: -100, max: 100, paso: 1, neutro: 0 },
	{ clave: 'exposure', nombre: 'Exposición', min: -100, max: 100, paso: 1, neutro: 0 },
	{ clave: 'temperature', nombre: 'Temperatura', min: -100, max: 100, paso: 1, neutro: 0 },
	{ clave: 'clarity', nombre: 'Claridad', min: 0, max: 100, paso: 1, neutro: 0 },
	{ clave: 'gamma', nombre: 'Gamma', min: 0.5, max: 2, paso: 0.05, neutro: 1 }
] as const;

/** Las proporciones que ofrece el recorte, con el nombre de para qué sirve cada una. */
export const PROPORCIONES = [
	{ clave: '1:1', nombre: 'Cuadrado', valor: 1, para: 'La cuadrícula del perfil' },
	{ clave: '4:5', nombre: 'Vertical', valor: 4 / 5, para: 'Ocupa más pantalla en el móvil' },
	{ clave: '16:9', nombre: 'Apaisado', valor: 16 / 9, para: 'Panorámicas y actos' },
	{ clave: '9:16', nombre: 'Historia', valor: 9 / 16, para: 'Pantalla completa' }
] as const;

export type ClaveProporcion = (typeof PROPORCIONES)[number]['clave'];
