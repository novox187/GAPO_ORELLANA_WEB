import type { NombrePictograma } from '$lib/components/Pictograma.svelte';

/**
 * Mapa de rutas públicas a recursos de la API.
 *
 * "El cantón" agrupa en una sola sección de navegación lo que en el origen
 * municipal vive en dos carpetas distintas (institucional y turismo): el
 * ciudadano no tiene por qué conocer esa división interna.
 */
export interface EntradaSeccion {
	slug: string;
	titulo: string;
	descripcion: string;
	/** Carpeta real dentro de data/api/v1/ */
	origen: 'institucional' | 'turismo' | 'transparencia';
	picto: NombrePictograma;
	fondo: string;
	tinta: string;
	/**
	 * Cómo se agrupa en el índice de la sección. "El cantón" mezcla dos
	 * cosas que el visitante busca en momentos distintos: saber cómo se
	 * gobierna el cantón y saber qué visitar en él. Nueve teselas iguales
	 * en fila obligan a leerlas todas para descubrir cuál es cuál.
	 */
	grupo?: 'territorio' | 'visitar';
	/** Fotografía de portada, para las entradas que tienen una que valga. */
	imagen?: string;
}

/*
  Pares fondo/tinta verificados contra WCAG AA. No se eligen por gusto: el
  texto blanco sobre los verdes claros de marca no llega al mínimo de
  4.5:1 —selva-400 se queda en 2.5:1 y selva-600 en 3.1:1—, así que esas
  dos superficies llevan tinta carbón, igual que la amarilla.
  Ver docs/accesibilidad.md.
*/
const VERDE_OSCURO = { fondo: 'bg-[var(--color-selva-800)]', tinta: 'text-white' }; // 4.8:1
const CARBON = { fondo: 'bg-[var(--color-carbon-600)]', tinta: 'text-white' }; // 8.9:1
const VERDE = {
	fondo: 'bg-[var(--color-selva-600)]',
	tinta: 'text-[var(--color-carbon-900)]'
}; // 6.6:1
const VERDE_CLARO = {
	fondo: 'bg-[var(--color-selva-400)]',
	tinta: 'text-[var(--color-carbon-900)]'
}; // 7.7:1
const AMARILLO = {
	fondo: 'bg-[var(--color-achiote-500)]',
	tinta: 'text-[var(--color-carbon-900)]'
}; // 15.6:1

export const CANTON: EntradaSeccion[] = [
	{
		slug: 'datos-canton',
		titulo: 'Datos del cantón',
		descripcion: 'Territorio, población, clima y parroquias.',
		origen: 'institucional',
		picto: 'canton',
		grupo: 'territorio',
		...VERDE_OSCURO
	},
	{
		slug: 'historia-simbolos',
		titulo: 'Historia y símbolos',
		descripcion: 'Origen del cantón, escudo, bandera e himno.',
		origen: 'institucional',
		picto: 'cultura',
		grupo: 'territorio',
		imagen: '/media/originales/311c1d181da9b52e.jpg',
		...CARBON
	},
	{
		slug: 'alcaldia',
		titulo: 'Alcaldía',
		descripcion: 'La máxima autoridad del gobierno municipal.',
		origen: 'institucional',
		picto: 'institucionesadscritas',
		grupo: 'territorio',
		imagen: '/media/originales/a5db66281ab7c839.jpg',
		...VERDE
	},
	{
		slug: 'concejo',
		titulo: 'Concejo Municipal',
		descripcion: 'Concejales y órgano legislativo del cantón.',
		origen: 'institucional',
		picto: 'concejomunicipal',
		grupo: 'territorio',
		...VERDE_CLARO
	},
	{
		slug: 'empresas-adscritas',
		titulo: 'Empresas adscritas',
		descripcion: 'Yasuní TV, Bomberos, MACCO, Terminal y Bocana.',
		origen: 'institucional',
		picto: 'direcciones',
		grupo: 'territorio',
		...AMARILLO
	},
	{
		slug: 'lugares',
		titulo: 'Lugares por visitar',
		descripcion: 'Supay Kucha, Amaru Yaya, Yasuní Land y los tres ríos.',
		origen: 'turismo',
		picto: 'turismo',
		grupo: 'visitar',
		imagen: '/media/originales/cd82af8e6d7e3b30.jpg',
		...VERDE_OSCURO
	},
	{
		slug: 'rutas',
		titulo: 'Rutas turísticas',
		descripcion: 'Recorridos por el cantón y sus comunidades.',
		origen: 'turismo',
		picto: 'gacetamunicipal',
		grupo: 'visitar',
		imagen: '/media/originales/bffa89f3c901cd47.jpg',
		...VERDE
	},
	{
		slug: 'coca-antiguo',
		titulo: 'El Coca antiguo',
		descripcion: 'Fotografías históricas de la ciudad.',
		origen: 'turismo',
		picto: 'cultura',
		grupo: 'visitar',
		imagen: '/media/originales/fcd766e94b2e88e9.png',
		...CARBON
	},
	{
		slug: 'coca-zoo',
		titulo: 'Coca Zoo',
		descripcion: 'Fauna amazónica en más de 50 hectáreas.',
		origen: 'turismo',
		picto: 'emprendedores',
		grupo: 'visitar',
		imagen: '/media/originales/46e80cc6a07f6d5f.png',
		...VERDE_CLARO
	}
];

export const TRANSPARENCIA: EntradaSeccion[] = [
	{
		slug: 'lotaip',
		titulo: 'LOTAIP',
		descripcion: 'Información pública obligatoria por ley.',
		origen: 'transparencia',
		picto: 'normativa',
		...VERDE_OSCURO
	},
	{
		slug: 'ordenanzas',
		titulo: 'Ordenanzas y resoluciones',
		descripcion: 'Normativa vigente del cantón.',
		origen: 'transparencia',
		picto: 'normativa',
		...CARBON
	},
	{
		slug: 'rendicion-cuentas',
		titulo: 'Rendición de cuentas',
		descripcion: 'Informes anuales de gestión municipal.',
		origen: 'transparencia',
		picto: 'rendiciondecuentas',
		...VERDE
	},
	{
		slug: 'pac',
		titulo: 'Plan Anual de Contratación',
		descripcion: 'Compras públicas previstas para el año.',
		origen: 'transparencia',
		picto: 'tramitesciudadanos',
		...AMARILLO
	},
	{
		slug: 'mecanismos-participacion',
		titulo: 'Mecanismos de participación',
		descripcion: 'Cómo incidir en las decisiones del municipio.',
		origen: 'transparencia',
		picto: 'concejomunicipal',
		...VERDE_CLARO
	},
	{
		slug: 'calidad-agua',
		titulo: 'Calidad de agua',
		descripcion: 'Estudios del servicio de agua potable.',
		origen: 'transparencia',
		picto: 'canton',
		...VERDE
	},
	{
		slug: 'publicidad',
		titulo: 'Inversión en publicidad',
		descripcion: 'Informe de gasto en difusión institucional.',
		origen: 'transparencia',
		picto: 'gacetamunicipal',
		...VERDE_OSCURO
	},
	{
		slug: 'convocatorias',
		titulo: 'Convocatorias a sesión',
		descripcion: 'Sesiones del Concejo Municipal.',
		origen: 'transparencia',
		picto: 'concejomunicipal',
		...CARBON
	},
	{
		slug: 'documentos',
		titulo: 'Documentos',
		descripcion: 'Otros documentos publicados por el municipio.',
		origen: 'transparencia',
		picto: 'normativa',
		...AMARILLO
	}
];

export function buscarEntrada(lista: EntradaSeccion[], slug: string): EntradaSeccion | undefined {
	return lista.find((e) => e.slug === slug);
}
