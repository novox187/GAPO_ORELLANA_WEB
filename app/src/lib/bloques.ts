import type { Bloque, ItemLista, Pagina } from '$lib/api';

/**
 * Limpieza y agrupado de los bloques scrapeados de Transparencia.
 *
 * El origen municipal genera páginas con estructura redundante (LOTAIP
 * repite los mismos 3 enlaces externos 24 veces, una por mes) y con
 * agrupación real por año/categoría en otras (rendición de cuentas,
 * calidad de agua, ordenanzas, PAC). Estas funciones son genéricas — no
 * dependen de ningún slug concreto — y se aplican por igual a las 9
 * secciones.
 */

export interface Resumen {
	cantidad: number;
	etiqueta: string;
}

export interface GrupoBloques {
	titulo: string;
	nivel: number;
	bloques: Bloque[];
}

export interface DocumentoResuelto {
	texto: string;
	url: string;
	tipo: string;
}

/**
 * Deduplica enlaces repetidos y descarta títulos que se quedan sin
 * contenido debajo tras la deduplicación.
 *
 * Dentro de cada bloque `lista`, un item con `url` ya visto (misma
 * pareja texto+url) se descarta; los items sin enlace (texto plano) se
 * conservan siempre, porque no hay forma de decidir si son "el mismo"
 * dato repetido o dos datos distintos que coinciden en texto.
 */
export function limpiarBloques(bloques: Bloque[]): Bloque[] {
	const vistos = new Set<string>();

	const sinDuplicados = bloques
		.map((b) => {
			if (b.tipo !== 'lista') return b;
			const items = (b.items ?? []).filter((it) => {
				if (!it.url) return true;
				const clave = `${it.texto}|${it.url}`;
				if (vistos.has(clave)) return false;
				vistos.add(clave);
				return true;
			});
			return { ...b, items };
		})
		.filter((b) => b.tipo !== 'lista' || (b.items?.length ?? 0) > 0);

	// Un título sin nada debajo (porque su única lista se quedó vacía, o
	// porque nunca tuvo contenido) desaparece.
	return sinDuplicados.filter((b, i, arr) => {
		if (b.tipo !== 'titulo') return true;
		const siguiente = arr[i + 1];
		return !!siguiente && siguiente.tipo !== 'titulo';
	});
}

/**
 * Agrupa por el nivel de título más alto presente en la página (nivel 1
 * en ordenanzas, nivel 2 en rendición de cuentas/calidad de
 * agua/PAC...). Todo lo anterior al primer título de ese nivel es
 * `intro`; cada título de nivel raíz abre un grupo que acumula lo
 * siguiente (subtítulos, párrafos, tablas, listas) hasta el próximo
 * título raíz.
 */
export function agruparBloques(bloques: Bloque[]): { intro: Bloque[]; grupos: GrupoBloques[] } {
	const nivelDe = (b: Bloque) => b.nivel ?? 2;
	const titulos = bloques.filter((b) => b.tipo === 'titulo');
	if (!titulos.length) return { intro: bloques, grupos: [] };

	// El nivel raíz es el que más se repite, no el más alto en la
	// jerarquía. Una página puede traer un único título de nivel 1 a modo
	// de preámbulo (con su propio párrafo, "Estudios de calidad del
	// servicio de Agua Potable") seguido de diez títulos de nivel 2, uno
	// por año: son esos diez los que hacen falta como apartados plegables,
	// no el preámbulo envolviéndolos a todos en un único grupo gigante.
	// Empate a frecuencia: gana el nivel más alto en la jerarquía (el
	// número menor).
	const frecuencias = new Map<number, number>();
	for (const t of titulos) frecuencias.set(nivelDe(t), (frecuencias.get(nivelDe(t)) ?? 0) + 1);
	let nivelRaiz = nivelDe(titulos[0]);
	let mejorFrecuencia = 0;
	for (const [nivel, frecuencia] of [...frecuencias.entries()].sort((a, b) => a[0] - b[0])) {
		if (frecuencia > mejorFrecuencia) {
			mejorFrecuencia = frecuencia;
			nivelRaiz = nivel;
		}
	}

	const intro: Bloque[] = [];
	const grupos: GrupoBloques[] = [];
	let actual: GrupoBloques | null = null;

	for (const b of bloques) {
		if (b.tipo === 'titulo' && nivelDe(b) === nivelRaiz) {
			actual = { titulo: b.texto ?? '', nivel: nivelRaiz, bloques: [] };
			grupos.push(actual);
			continue;
		}
		(actual ? actual.bloques : intro).push(b);
	}

	return { intro, grupos };
}

/**
 * Recuento honesto de "cuánto hay publicado" en una sección, para el
 * índice y la ficha de datos rápidos. Nunca inventa un número: si no hay
 * documentos ni contenido agrupado ni texto real, lo dice.
 */
export function resumenPagina(pagina: Pagina): Resumen {
	if (pagina.documentos.length > 0) {
		return {
			cantidad: pagina.documentos.length,
			etiqueta: pagina.documentos.length === 1 ? 'documento' : 'documentos'
		};
	}

	const { intro, grupos } = agruparBloques(limpiarBloques(pagina.bloques));

	if (grupos.length > 0) {
		return { cantidad: grupos.length, etiqueta: grupos.length === 1 ? 'apartado' : 'apartados' };
	}

	const hayContenido = intro.some(
		(b) => (b.tipo === 'parrafo' && b.texto) || (b.tipo === 'tabla' && (b.filas?.length ?? 0) > 0)
	);
	if (hayContenido) return { cantidad: 1, etiqueta: 'contenido informativo' };

	return { cantidad: 0, etiqueta: 'sin publicaciones' };
}

/** Rango de años detectado en los títulos de grupo ("RENDICIÓN DE CUENTAS 2019" → 2019). */
export function extraerAnios(grupos: { titulo: string }[]): { min: number; max: number } | null {
	const anios = grupos
		.flatMap((g) => [...g.titulo.matchAll(/20\d{2}/g)])
		.map((m) => Number(m[0]));
	if (!anios.length) return null;
	return { min: Math.min(...anios), max: Math.max(...anios) };
}

/** Extensión del archivo en mayúsculas ("pdf" → "PDF"), o "ENLACE" si la URL no tiene una. */
export function tipoDocumento(url: string): string {
	const m = url.match(/\.([a-z0-9]+)(?:\?.*)?$/i);
	return m ? m[1].toUpperCase() : 'ENLACE';
}

/**
 * Índice nombre→documento para resolver los items de `bloques` que
 * llegan sin URL (la mayoría: la extracción solo dejó `item.texto`, la
 * URL real vive en `pagina.documentos`, emparejada por nombre de
 * archivo exacto). Verificado contra los datos reales: en
 * ordenanzas/PAC/calidad de agua el cruce por nombre no falla ni una
 * vez; en rendición de cuentas solo fallan los 4 items que ya traían su
 * propia URL directa (LOTAIP-style) y por tanto no la necesitan.
 */
export function indexarDocumentos(
	documentos: Pagina['documentos']
): Map<string, { url: string; tipo: string }> {
	const mapa = new Map<string, { url: string; tipo: string }>();
	for (const d of documentos) {
		if (!mapa.has(d.nombre)) mapa.set(d.nombre, { url: d.url, tipo: d.tipo });
	}
	return mapa;
}

/**
 * Resuelve el enlace real de un item de lista. Sin `indice` se
 * comporta exactamente como antes (enlace simple si `item.url` existe,
 * texto plano si no) — así `Bloques.svelte` no cambia nada para "El
 * cantón", que nunca pasa `indice`.
 */
export function resolverEnlaceItem(
	it: ItemLista,
	indice?: Map<string, { url: string; tipo: string }>
): { url: string; tipo: string | null } | null {
	if (!indice) return it.url ? { url: it.url, tipo: null } : null;
	if (it.url) return { url: it.url, tipo: tipoDocumento(it.url) };
	const doc = indice.get(it.texto);
	return doc ? { url: doc.url, tipo: doc.tipo.toUpperCase() } : null;
}

/**
 * Todos los documentos resueltos (con URL real) de un grupo, en orden.
 *
 * Dedupe por texto+url resueltos, igual criterio que `limpiarBloques` — no
 * solo por url: en LOTAIP tres enlaces con texto distinto ("Ir a
 * Transparencia Activa/Focalizada/Colaborativa") comparten la misma URL del
 * portal externo, y son tres datos distintos, no uno repetido. La
 * duplicación real (mismo archivo, mismo texto, dos sub-listas del mismo
 * grupo — visto en rendición de cuentas con "Alcaldia_RC_2025.xlsx") solo
 * se detecta después de resolver contra el índice, porque llega sin URL
 * propia y `limpiarBloques` no puede verla.
 */
export function itemsDeGrupo(
	grupo: GrupoBloques,
	indice: Map<string, { url: string; tipo: string }>
): DocumentoResuelto[] {
	const vistos = new Set<string>();
	const resultado: DocumentoResuelto[] = [];
	for (const b of grupo.bloques) {
		if (b.tipo !== 'lista') continue;
		for (const it of b.items ?? []) {
			const enlace = resolverEnlaceItem(it, indice);
			if (!enlace) continue;
			const clave = `${it.texto}|${enlace.url}`;
			if (vistos.has(clave)) continue;
			vistos.add(clave);
			resultado.push({
				texto: it.texto,
				url: enlace.url,
				tipo: enlace.tipo ?? tipoDocumento(enlace.url)
			});
		}
	}
	return resultado;
}
