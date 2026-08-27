import { error } from '@sveltejs/kit';
import { api, type Bloque, type Media } from '$lib/api';
import type { PageLoad } from './$types';

export interface Principio {
	nombre: string;
	descripcion: string;
}

/**
 * La fuente municipal mete los siete principios rectores dentro de un solo
 * párrafo, separados por guiones, y cada uno nombra su valor antes de un
 * ".-" o de una coma. Se separan aquí para poder presentarlos como lo que
 * son: una lista de compromisos, no un muro de texto.
 */
function extraerPrincipios(texto: string): { intro: string; principios: Principio[] } {
	const partes = texto.split(/\n\s*-\s+/);
	const intro = partes[0].replace(/\s+/g, ' ').trim();

	const principios = partes.slice(1).map((crudo) => {
		const p = crudo.replace(/\s+/g, ' ').trim();
		const m = p.match(/^(.{3,60}?)\.-\s*(.*)$/s) ?? p.match(/^(.{3,60}?),\s*(.*)$/s);
		if (!m) return { nombre: '', descripcion: p };
		const descripcion = m[2].charAt(0).toUpperCase() + m[2].slice(1);
		return { nombre: m[1].trim(), descripcion };
	});

	return { intro, principios: principios.filter((p) => p.descripcion) };
}

function textoTrasTitulo(bloques: Bloque[], titulo: RegExp): string {
	const i = bloques.findIndex((b) => b.tipo === 'titulo' && titulo.test(b.texto ?? ''));
	if (i < 0) return '';
	const sig = bloques[i + 1];
	return sig?.tipo === 'parrafo' ? (sig.texto ?? '') : '';
}

export const load: PageLoad = async ({ fetch }) => {
	let pagina;
	try {
		pagina = await api.pagina(fetch, 'institucional', 'alcaldia');
	} catch {
		error(404, 'No pudimos cargar la página de la Alcaldía');
	}

	const b = pagina.bloques;

	// El nombre y el cargo son los dos primeros bloques de contenido real;
	// el bloque 0 son las pestañas del sitio original, que se descartan.
	const nombre = b.find((x) => x.tipo === 'titulo' && !/principios|misión|visión/i.test(x.texto ?? ''))?.texto ?? 'Alcaldía';
	const cargo = b.find((x) => x.tipo === 'parrafo' && /alcalde/i.test(x.texto ?? ''))?.texto ?? '';

	const { intro, principios } = extraerPrincipios(textoTrasTitulo(b, /principios/i));

	// La primera imagen es el retrato oficial; el resto es apoyo visual.
	const [retrato, ...apoyo] = pagina.imagenes as Media[];

	return {
		nombre,
		cargo,
		intro,
		principios,
		mision: textoTrasTitulo(b, /misión/i).replace(/\s+/g, ' ').trim(),
		vision: textoTrasTitulo(b, /visión/i).replace(/\s+/g, ' ').trim(),
		retrato: retrato ?? null,
		apoyo: apoyo.slice(0, 3),
		fuente_url: pagina.fuente_url
	};
};
