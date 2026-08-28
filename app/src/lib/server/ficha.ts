/**
 * Armado de la respuesta que ve el ciudadano.
 *
 * Todo lo que sale de aquí está copiado literalmente de `data/api/v1/`:
 * ningún campo se resume, se reformula ni se completa. Es la garantía de
 * que el asistente no puede inventarse un requisito de trámite — no porque
 * se le pida que no lo haga, sino porque no hay ningún punto del recorrido
 * donde pudiera hacerlo.
 *
 * El párrafo redactado por un modelo (fase 2, `redactor.ts`) se añade
 * *encima* de esta ficha y es prescindible. Si no está, la respuesta sigue
 * completa.
 */

import { api, type Tramite, type Pagina, type Noticia } from '$lib/api';
import { buscarEntrada, CANTON, TRANSPARENCIA } from '$lib/secciones';
import { consultar, DIRECTORIO, CONTACTO, type Recuperado } from './recuperacion';
import type { Confianza, Dato, Enlace, Ficha, Respuesta } from '$lib/asistente';

export type { Ficha, Respuesta };

type Fetch = typeof globalThis.fetch;

/** Palabras que delatan que lo que se busca es a quién llamar. */
const INTENCION_CONTACTO =
	/\b(telefono|teléfono|llamar|llamo|extension|extensión|contacto|contactar|numero|número|correo|email|oficina)\b/i;

/**
 * Dirección municipal que mejor encaja con la consulta. Sólo devuelve algo
 * cuando la pregunta va de contactar a alguien: si no, "obras públicas"
 * debe llevar al trámite de obras, no a la ficha de la dirección.
 */
function direccionPedida(consulta: string) {
	if (!INTENCION_CONTACTO.test(consulta)) return null;

	const normal = consulta
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '');
	const tokensConsulta = normal.split(/[^a-z0-9]+/).filter(Boolean);
	let mejor: (typeof DIRECTORIO)[number] | null = null;
	let mejorPuntaje = 0;

	for (const d of DIRECTORIO) {
		const palabras = d.nombre
			.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.split(/[^a-z0-9]+/)
			.filter((p) => p.length > 3 && p !== 'direccion');

		// Comparación por prefijo y en las dos direcciones, porque el
		// ciudadano escribe "catastro" o "riesgo" donde el directorio dice
		// "Catastros" y "Riesgos". Cinco caracteres es suficiente para que
		// "compras" y "comunicacion" no se confundan entre sí.
		const aciertos = palabras.filter((p) =>
			tokensConsulta.some((t) => {
				const n = Math.min(p.length, t.length);
				return n >= 5 && p.slice(0, n) === t.slice(0, n);
			})
		).length;

		if (aciertos > mejorPuntaje) {
			mejorPuntaje = aciertos;
			mejor = d;
		}
	}
	return mejorPuntaje > 0 ? mejor : null;
}

/** Carpeta real de la API para una página: /canton/x puede venir de dos sitios. */
function origenPagina(slug: string): string | null {
	return (
		buscarEntrada(CANTON, slug)?.origen ?? buscarEntrada(TRANSPARENCIA, slug)?.origen ?? null
	);
}

function fichaDeTramite(t: Tramite, url: string): Ficha {
	const datos: Dato[] = [];
	if (t.direccion?.nombre) datos.push({ etiqueta: 'Dónde se hace', valor: t.direccion.nombre });

	// El costo se muestra tal cual lo declara la fuente. Cuando la fuente no
	// lo dice, se dice que no lo dice — no se asume que sea gratuito.
	if (t.costo?.detalle) datos.push({ etiqueta: 'Costo', valor: t.costo.detalle });
	else if (t.costo?.tiene_costo === false) datos.push({ etiqueta: 'Costo', valor: 'Gratuito' });
	else if (t.costo?.tiene_costo === null)
		datos.push({ etiqueta: 'Costo', valor: 'La ficha municipal no lo especifica' });

	if (t.canales?.length) datos.push({ etiqueta: 'Canales', valor: t.canales.join(', ') });
	if (t.quienes_acceden) datos.push({ etiqueta: 'Quiénes acceden', valor: t.quienes_acceden });

	// La dirección responsable puede tener 20 extensiones (Financiera las
	// tiene). Volcarlas todas en la ficha de un trámite empuja el botón de
	// "ver la ficha completa" fuera de la pantalla y obliga a leer una lista
	// de cargos internos para encontrar el que importa. Aquí van tres como
	// pista; el directorio completo está en /contacto, que es su sitio.
	const telefonos = (
		DIRECTORIO.find((d) => d.slug === t.direccion?.slug)?.extensiones ?? []
	).slice(0, 3);

	return {
		clase: 'tramite',
		titulo: t.nombre,
		url,
		entradilla: t.que_es || t.para_que_sirve || t.resumen || '',
		datos,
		requisitos: (t.requisitos ?? []).map((r) => r.texto),
		pasos: (t.pasos ?? []).map((p) => ({ titulo: p.titulo, descripcion: p.descripcion })),
		documentos: (t.formularios ?? []).map((f) => ({
			titulo: f.nombre,
			url: f.url,
			tipo: f.tipo
		})),
		telefonos,
		requiereRevision: Boolean(t.requiere_revision_editorial)
	};
}

function fichaDePagina(p: Pagina, url: string, fragmento: string): Ficha {
	return {
		clase: 'pagina',
		titulo: p.titulo,
		url,
		// El fragmento recuperado, no el principio de la página: si alguien
		// pregunta por el clima del cantón, la entradilla debe ser el párrafo
		// del clima y no la primera línea de la ficha.
		entradilla: fragmento.slice(0, 600),
		datos: [],
		requisitos: [],
		pasos: [],
		documentos: (p.documentos ?? []).map((d) => ({
			titulo: d.nombre,
			url: d.url,
			tipo: d.tipo
		})),
		telefonos: [],
		requiereRevision: false
	};
}

function fichaDeNoticia(n: Noticia, url: string): Ficha {
	return {
		clase: 'noticia',
		titulo: n.titulo,
		url,
		entradilla: n.resumen ?? '',
		datos: n.fecha ? [{ etiqueta: 'Publicada', valor: n.fecha }] : [],
		requisitos: [],
		pasos: [],
		documentos: [],
		telefonos: [],
		requiereRevision: false
	};
}

function fichaDeDireccion(d: (typeof DIRECTORIO)[number]): Ficha {
	return {
		clase: 'direccion',
		titulo: d.nombre,
		url: '/contacto',
		entradilla: d.mision,
		datos: d.responsable ? [{ etiqueta: 'Responsable', valor: d.responsable }] : [],
		requisitos: [],
		pasos: [],
		documentos: [],
		telefonos: d.extensiones,
		requiereRevision: false
	};
}

/**
 * Una entrada por documento: varios fragmentos del mismo trámite son uno
 * solo.
 *
 * También se agrupa por título, no sólo por ruta. El sitio origen publica
 * trámites duplicados con slugs distintos —la Dirección de Turismo tiene dos
 * pestañas idénticas de la licencia anual, ver `docs/deuda-heredada.md`— y
 * sin esto la lista de sugerencias muestra dos veces el mismo trámite, que
 * al ciudadano le parece un error de la página. La deduplicación es un
 * parche sobre un problema de datos que el municipio debería arreglar en el
 * origen.
 */
function porDocumento(lista: Recuperado[], excluir?: Enlace | null): Enlace[] {
	const rutasVistas = new Set<string>(excluir ? [excluir.url] : []);
	const titulosVistos = new Set<string>(excluir ? [excluir.titulo.toLowerCase().trim()] : []);
	const salida: Enlace[] = [];

	for (const r of lista) {
		if (rutasVistas.has(r.fragmento.url)) continue;
		// El título del fragmento lleva el sufijo de sección ("… — requisitos");
		// para un enlace sobra.
		const titulo = r.fragmento.titulo.split(' — ')[0];
		const clave = titulo.toLowerCase().trim();
		if (titulosVistos.has(clave)) continue;

		rutasVistas.add(r.fragmento.url);
		titulosVistos.add(clave);
		salida.push({ titulo, url: r.fragmento.url, tipo: r.fragmento.tipo });
	}
	return salida;
}

export async function responder(consulta: string, fetch: Fetch): Promise<Respuesta> {
	const { oficiales, noticias, confianza } = await consultar(consulta, 8);

	const base: Respuesta = {
		consulta,
		confianza,
		ficha: null,
		alternativas: [],
		noticias: porDocumento(noticias).slice(0, 3),
		parrafo: null,
		contacto: CONTACTO
	};

	// Preguntar "a qué número llamo" tiene respuesta propia, y no es un trámite.
	const direccion = direccionPedida(consulta);
	if (direccion) {
		return { ...base, ficha: fichaDeDireccion(direccion), confianza: 'alta' };
	}

	const mejor = oficiales[0];
	if (!mejor || confianza === 'baja') {
		// Sin nada sólido, la respuesta honesta es no tener ficha. Las
		// alternativas siguen ahí por si alguna sirve, pero no se presentan
		// como la respuesta.
		return { ...base, alternativas: porDocumento(oficiales).slice(0, 5) };
	}

	const url = mejor.fragmento.url;
	let ficha: Ficha | null = null;

	try {
		if (url.startsWith('/tramites/')) {
			const t = await api.tramite(fetch, url.slice('/tramites/'.length));
			ficha = fichaDeTramite(t, url);
		} else if (url.startsWith('/noticias/')) {
			const n = await api.noticia(fetch, url.slice('/noticias/'.length));
			ficha = fichaDeNoticia(n, url);
		} else {
			const slug = url.split('/').pop() ?? '';
			const origen = origenPagina(slug);
			if (origen) {
				const p = await api.pagina(fetch, origen, slug);
				ficha = fichaDePagina(p, url, mejor.fragmento.texto);
			}
		}
	} catch {
		// Si el JSON no carga, se degrada a la lista de enlaces en vez de
		// romper la respuesta entera. El ciudadano pierde el detalle, no la
		// pista de dónde mirar.
		ficha = null;
	}

	return {
		...base,
		ficha,
		alternativas: porDocumento(
			oficiales,
			ficha ? { titulo: ficha.titulo, url, tipo: ficha.clase } : { titulo: '', url, tipo: '' }
		).slice(0, 5)
	};
}
