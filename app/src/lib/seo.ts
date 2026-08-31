/**
 * SEO: una sola fuente de verdad para lo que este sitio dice de sí mismo.
 *
 * Antes cada página escribía su `<title>` y su descripción a mano, y ocho de
 * las veinte rutas no escribían ninguno: heredaban el título de la portada.
 * Para un sitio municipal eso no es un detalle de posicionamiento, es que el
 * resultado de Google para "patente municipal El Coca" decía "El Coca,
 * entrada al Yasuní" y no llevaba al trámite.
 *
 * Todo lo que se declara aquí es verificable en el propio contenido
 * municipal. No hay dirección ni teléfono en los datos estructurados porque
 * `data/api/v1/contacto.json` los tiene en `null`: el sitio original no los
 * publica y Comunicación Social todavía no los ha confirmado (ver
 * docs/deuda-heredada.md, punto 4). Inventarlos para "rellenar el schema"
 * sería publicar un dato falso en la ficha de un gobierno local.
 */

import { env } from '$env/dynamic/public';

/** Nombre corto, el de la marca en la cabecera. */
export const SITIO = 'Alcaldía de Francisco de Orellana';

/** Razón social completa, la que usa el propio municipio en sus actos. */
export const ORGANIZACION = 'Gobierno Autónomo Descentralizado Municipal de Francisco de Orellana';

export const IDIOMA = 'es-EC';

/** Sufijo de todos los títulos. Se omite en la portada, que ya lo lleva. */
export const SUFIJO = ` — ${SITIO}`;

/**
 * Descripción por defecto: la que ve quien comparte una página sin ficha
 * propia. Nombra el cantón y su nombre coloquial ("El Coca"), que es como
 * se busca de verdad.
 */
export const DESCRIPCION_POR_DEFECTO =
	'Trámites, obras, noticias y transparencia del cantón Francisco de Orellana (El Coca), en la Amazonía ecuatoriana.';

/** Imagen de previsualización por defecto, 1200×630. Ver static/img/og/. */
export const IMAGEN_POR_DEFECTO = '/img/og/portada.jpg';
export const IMAGEN_POR_DEFECTO_ALT =
	'El puente sobre el río Napo al anochecer, con el logotipo de la Alcaldía de Francisco de Orellana.';

/** Perfiles oficiales, tal como los publica el pie del sitio municipal. */
export const REDES = [
	'https://www.facebook.com/MunicipiodeFranciscodeOrellana',
	'https://www.instagram.com/gadmforellana',
	'https://www.youtube.com/@GADFranciscodeOrellana',
	'https://x.com/GADMFOrellana',
	'https://www.tiktok.com/@munifranciscodeorellana',
];

/** El único correo institucional confirmado en todo el contenido extraído. */
export const CORREO = 'alcaldia@orellana.gob.ec';

/**
 * Origen canónico del sitio.
 *
 * Por defecto se toma del propio pedido: con `adapter-node` detrás de
 * Coolify, `ORIGIN` ya fija el host real y `url.origin` es correcto. Se
 * puede forzar con `PUBLIC_SITIO_URL` cuando el dominio definitivo no
 * coincida con el host que sirve (por ejemplo, detrás de un CDN o mientras
 * el sitio vive en un subdominio de despliegue).
 *
 * No se codifica `https://orellana.gob.ec` como valor por defecto a
 * propósito: mientras el rediseño no esté en ese dominio, un canonical fijo
 * apuntaría cada página nueva al sitio viejo y le regalaría la indexación.
 */
export function origen(url: URL): string {
	const forzado = (env.PUBLIC_SITIO_URL ?? '').trim().replace(/\/+$/, '');
	return forzado || url.origin;
}

/** Convierte una ruta del sitio en URL absoluta. Open Graph no acepta rutas relativas. */
export function absoluta(url: URL, ruta: string): string {
	if (/^https?:\/\//.test(ruta)) return ruta;
	return origen(url) + (ruta.startsWith('/') ? ruta : `/${ruta}`);
}

/**
 * Título completo. Se corta la parte propia de la página, no el sufijo:
 * el nombre de un trámite municipal puede tener 90 caracteres y Google
 * muestra unos 60, así que se recorta por palabra y con elipsis.
 */
export function tituloCompleto(titulo?: string): string {
	if (!titulo) return `${SITIO} — Cantón Francisco de Orellana, Amazonía ecuatoriana`;
	return recortar(titulo, 68) + SUFIJO;
}

/** Recorte por palabra: nunca parte una palabra por la mitad. */
export function recortar(texto: string, maximo: number): string {
	const limpio = (texto ?? '').replace(/\s+/g, ' ').trim();
	if (limpio.length <= maximo) return limpio;
	const corte = limpio.slice(0, maximo);
	const ultimo = corte.lastIndexOf(' ');
	return (ultimo > maximo * 0.6 ? corte.slice(0, ultimo) : corte).replace(/[,;:.\s]+$/, '') + '…';
}

/**
 * Descripción para `<meta name="description">` y Open Graph.
 *
 * Las de los trámites y las páginas de sección vienen de texto municipal
 * que puede llegar cortado a mitad de frase o con saltos de línea dentro;
 * se normaliza y se recorta a la longitud que los buscadores muestran.
 */
export function descripcion(
	texto: string | null | undefined,
	respaldo = DESCRIPCION_POR_DEFECTO,
): string {
	const limpio = (texto ?? '')
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	return limpio ? recortar(limpio, 158) : respaldo;
}

/**
 * Convierte una imagen del catálogo en tarjeta de previsualización.
 *
 * Las fotografías municipales vienen de Cloudinary con proporciones de
 * cámara (5328×4000, por ejemplo). Compartidas tal cual, WhatsApp y
 * Facebook las degradan a miniatura cuadrada al lado del título en vez de
 * pintar la tarjeta grande, que exige 1200×630 o muy cerca.
 *
 * Así que se pide a Cloudinary el recorte exacto, con `g_auto` para que el
 * encuadre lo decida el contenido de la foto y no el centro geométrico —en
 * una foto de una obra, el centro suele ser cielo—, y en JPEG explícito:
 * `f_auto` negocia el formato con la cabecera `Accept`, y los rastreadores
 * de vistas previas no anuncian WebP, así que con `f_auto` la respuesta
 * depende de un rastreador que no controlamos.
 */
const RECORTE_TARJETA = 'c_fill,g_auto,w_1200,h_630,f_jpg,q_auto:good';

export function tarjeta(ruta: string | null | undefined): string | null {
	if (!ruta) return null;
	if (!ruta.includes('/image/upload/')) return ruta;
	// El segmento de transformación es el que lleva comas; el de versión
	// (`v1787852561`) no. Si no hay transformación, se inserta.
	return ruta.replace(/\/image\/upload\/(?:[^/]*,[^/]*\/)?/, `/image/upload/${RECORTE_TARJETA}/`);
}

/* ══ Datos estructurados ═══════════════════════════════════════════════ */

/**
 * `@id` estables para poder referenciar la organización desde cualquier
 * otro nodo (una noticia, un trámite) sin repetir la ficha entera.
 */
export const ID_ORGANIZACION = '#organizacion';
export const ID_SITIO_WEB = '#sitio';

/**
 * Ficha de la institución. `GovernmentOrganization` es el tipo correcto
 * para un GAD municipal — no `LocalBusiness`, que es lo que suele ponerse
 * por descuido y describe un comercio.
 */
export function organizacion(url: URL) {
	const base = origen(url);
	return {
		'@type': 'GovernmentOrganization',
		'@id': base + ID_ORGANIZACION,
		name: ORGANIZACION,
		alternateName: [SITIO, 'GAD Municipal Francisco de Orellana', 'Municipio de El Coca'],
		url: base,
		logo: {
			'@type': 'ImageObject',
			url: absoluta(url, '/img/og/logotipo.png'),
			width: 512,
			height: 512,
		},
		image: absoluta(url, IMAGEN_POR_DEFECTO),
		email: CORREO,
		sameAs: REDES,
		// Sin calle ni teléfono: no están confirmados. La localidad, la
		// provincia y el país sí son hechos del cantón.
		address: {
			'@type': 'PostalAddress',
			addressLocality: 'Puerto Francisco de Orellana (El Coca)',
			addressRegion: 'Orellana',
			addressCountry: 'EC',
		},
		// Coordenadas del propio mapa que el municipio embebe en /contactos/.
		geo: {
			'@type': 'GeoCoordinates',
			latitude: -0.468712,
			longitude: -76.998323,
		},
		areaServed: {
			'@type': 'AdministrativeArea',
			name: 'Cantón Francisco de Orellana',
			containedInPlace: {
				'@type': 'AdministrativeArea',
				name: 'Provincia de Orellana, Ecuador',
			},
		},
	};
}

/**
 * El sitio como entidad, con la acción de búsqueda. Es lo que permite que
 * Google ofrezca una caja de búsqueda del sitio en el propio resultado.
 */
export function sitioWeb(url: URL) {
	const base = origen(url);
	return {
		'@type': 'WebSite',
		'@id': base + ID_SITIO_WEB,
		url: base,
		name: SITIO,
		alternateName: ORGANIZACION,
		inLanguage: IDIOMA,
		publisher: { '@id': base + ID_ORGANIZACION },
		potentialAction: {
			'@type': 'SearchAction',
			target: {
				'@type': 'EntryPoint',
				urlTemplate: `${base}/buscar?q={search_term_string}`,
			},
			'query-input': 'required name=search_term_string',
		},
	};
}

/** Migas de pan como `BreadcrumbList`. Las rutas llegan relativas. */
export function migas(url: URL, tramos: { texto: string; href?: string }[]) {
	return {
		'@type': 'BreadcrumbList',
		itemListElement: tramos.map((t, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			name: t.texto,
			...(t.href ? { item: absoluta(url, t.href) } : {}),
		})),
	};
}

/**
 * Envuelve uno o varios nodos en un `@graph` con el contexto. Un solo
 * bloque JSON-LD por página: varios bloques sueltos se validan igual, pero
 * el grafo deja explícitas las relaciones entre nodos.
 */
export function grafo(nodos: unknown[]) {
	return { '@context': 'https://schema.org', '@graph': nodos.filter(Boolean) };
}

/**
 * Serializa JSON-LD para incrustarlo en un `<script>`.
 *
 * `<` se escapa a `\u003c` para que ni un título de noticia con HTML dentro
 * ni un `</script>` en el texto municipal puedan cerrar la etiqueta y
 * convertir contenido en código.
 */
export function serializar(datos: unknown): string {
	return JSON.stringify(datos).replace(/</g, '\\u003c');
}

/**
 * Una noticia municipal como `NewsArticle`.
 *
 * `author` es la institución, no una persona: las notas del municipio no
 * llevan firma en el origen y atribuírselas a alguien sería inventar.
 */
export function noticia(
	url: URL,
	n: {
		slug: string;
		titulo: string;
		resumen: string;
		fecha: string | null;
		imagen?: string | null;
	},
) {
	const base = origen(url);
	const enlace = `${base}/noticias/${n.slug}`;
	return {
		'@type': 'NewsArticle',
		'@id': enlace,
		mainEntityOfPage: { '@type': 'WebPage', '@id': enlace },
		// Google descarta el titular a partir de 110 caracteres.
		headline: recortar(n.titulo, 110),
		description: descripcion(n.resumen, ''),
		inLanguage: IDIOMA,
		...(n.fecha ? { datePublished: n.fecha, dateModified: n.fecha } : {}),
		...(n.imagen ? { image: [absoluta(url, n.imagen)] } : {}),
		articleSection: 'Noticias municipales',
		author: { '@id': base + ID_ORGANIZACION },
		publisher: { '@id': base + ID_ORGANIZACION },
		isPartOf: { '@id': base + ID_SITIO_WEB },
	};
}

/**
 * El perfil de una cuenta del módulo social como `ProfilePage`.
 *
 * La cuenta Alcaldía no es una entidad nueva: es la misma
 * `GovernmentOrganization` que ya describe todo el sitio (`organizacion()`),
 * así que su perfil enlaza a `#organizacion` en vez de duplicarla. Una
 * dirección sí es una oficina propia, y se declara como
 * `GovernmentOrganization` aparte, subordinada a la Alcaldía con
 * `parentOrganization` — la misma relación que ya usa `tramite()` para
 * `serviceOperator`.
 */
export function perfilCuenta(
	url: URL,
	c: {
		slug: string;
		nombre: string;
		biografia?: string;
		avatar?: string | null;
		tipo: 'alcaldia' | 'direccion';
	},
) {
	const base = origen(url);
	const enlace = `${base}/noticias/perfil/${c.slug}`;
	const idEntidad = c.tipo === 'alcaldia' ? base + ID_ORGANIZACION : `${enlace}#direccion`;

	const pagina = {
		'@type': 'ProfilePage',
		'@id': enlace,
		url: enlace,
		name: c.nombre,
		inLanguage: IDIOMA,
		isPartOf: { '@id': base + ID_SITIO_WEB },
		about: { '@id': idEntidad },
		mainEntity: { '@id': idEntidad },
	};

	if (c.tipo === 'alcaldia') return [pagina];

	return [
		pagina,
		{
			'@type': 'GovernmentOrganization',
			'@id': idEntidad,
			name: c.nombre,
			...(c.biografia ? { description: descripcion(c.biografia, '') } : {}),
			...(c.avatar ? { logo: absoluta(url, c.avatar) } : {}),
			parentOrganization: { '@id': base + ID_ORGANIZACION },
		},
	];
}

/**
 * Un trámite como `GovernmentService`, que es lo que es: un servicio que
 * presta una administración, con su canal, su público y su territorio.
 *
 * Los pasos se declaran aparte como `HowTo`. Google retiró el resultado
 * enriquecido de HowTo en 2023, así que esto no pinta una tarjeta en el
 * buscador; se mantiene porque es la única forma estándar de decir "este
 * trámite se hace en estos pasos y pide estos documentos", y los
 * buscadores conversacionales sí leen esa estructura.
 */
export function tramite(
	url: URL,
	t: {
		slug: string;
		nombre: string;
		resumen: string;
		que_es?: string;
		quienes_acceden?: string;
		canales?: string[];
		categorias?: string[];
		direccion?: { nombre: string };
		costo?: { tiene_costo: boolean | null; valor_referencial: number | null };
		requisitos?: { texto: string }[];
		pasos?: { orden: number; titulo: string; descripcion: string }[];
	},
) {
	const base = origen(url);
	const enlace = `${base}/tramites/${t.slug}`;

	const servicio: Record<string, unknown> = {
		'@type': 'GovernmentService',
		'@id': enlace,
		name: t.nombre,
		description: descripcion(t.resumen || t.que_es, ''),
		serviceType: t.categorias?.length ? t.categorias.join(', ') : 'Trámite municipal',
		provider: { '@id': base + ID_ORGANIZACION },
		serviceOperator: t.direccion?.nombre
			? {
					'@type': 'GovernmentOrganization',
					name: t.direccion.nombre,
					parentOrganization: { '@id': base + ID_ORGANIZACION },
				}
			: { '@id': base + ID_ORGANIZACION },
		areaServed: {
			'@type': 'AdministrativeArea',
			name: 'Cantón Francisco de Orellana',
		},
		availableChannel: {
			'@type': 'ServiceChannel',
			serviceUrl: enlace,
			name: t.canales?.length ? t.canales.join(', ') : 'Atención presencial',
			availableLanguage: {
				'@type': 'Language',
				name: 'Español',
				alternateName: 'es',
			},
		},
		mainEntityOfPage: { '@type': 'WebPage', '@id': enlace },
	};

	if (t.quienes_acceden) {
		servicio.audience = {
			'@type': 'Audience',
			audienceType: recortar(t.quienes_acceden, 120),
		};
	}

	// Sólo se declara el precio cuando el dato existe. `tiene_costo: null`
	// significa "el sitio municipal no lo dice", no "es gratis".
	if (t.costo?.tiene_costo === false) {
		servicio.offers = { '@type': 'Offer', price: 0, priceCurrency: 'USD' };
	} else if (t.costo?.valor_referencial != null) {
		servicio.offers = {
			'@type': 'Offer',
			price: t.costo.valor_referencial,
			priceCurrency: 'USD',
		};
	}

	const pasos = t.pasos ?? [];
	if (!pasos.length) return [servicio];

	return [
		servicio,
		{
			'@type': 'HowTo',
			'@id': `${enlace}#pasos`,
			name: `Cómo hacer: ${t.nombre}`,
			description: descripcion(t.resumen || t.que_es, ''),
			inLanguage: IDIOMA,
			about: { '@id': enlace },
			...(t.requisitos?.length
				? {
						supply: t.requisitos.slice(0, 30).map((r) => ({
							'@type': 'HowToSupply',
							name: recortar(r.texto, 120),
						})),
					}
				: {}),
			step: pasos.map((p) => ({
				'@type': 'HowToStep',
				position: p.orden,
				name: recortar(p.titulo || `Paso ${p.orden}`, 90),
				text: descripcion(p.descripcion || p.titulo, p.titulo || `Paso ${p.orden}`),
			})),
		},
	];
}

/**
 * Índice de sección. `ItemList` no pinta nada en el buscador por sí solo,
 * pero le da al rastreador la lista completa de un vistazo — que es justo
 * lo que le falta a un sitio donde 60 trámites cuelgan de una página con
 * filtros en el cliente.
 */
export function indiceSeccion(
	url: URL,
	titulo: string,
	ruta: string,
	items: { nombre: string; ruta: string }[],
) {
	const base = origen(url);
	return {
		'@type': 'CollectionPage',
		'@id': base + ruta,
		name: titulo,
		inLanguage: IDIOMA,
		isPartOf: { '@id': base + ID_SITIO_WEB },
		about: { '@id': base + ID_ORGANIZACION },
		mainEntity: {
			'@type': 'ItemList',
			numberOfItems: items.length,
			itemListElement: items.map((it, i) => ({
				'@type': 'ListItem',
				position: i + 1,
				name: it.nombre,
				url: base + it.ruta,
			})),
		},
	};
}

/**
 * La página de contacto.
 *
 * No declara `telephone` ni `streetAddress`: el directorio publica
 * extensiones internas, no números marcables desde fuera, y la central no
 * está confirmada. Declarar una extensión como teléfono de la institución
 * pondría en la ficha de Google un número al que nadie puede llamar.
 */
export function paginaContacto(url: URL) {
	const base = origen(url);
	return {
		'@type': 'ContactPage',
		'@id': `${base}/contacto`,
		name: 'Contacto y atención ciudadana',
		inLanguage: IDIOMA,
		isPartOf: { '@id': base + ID_SITIO_WEB },
		about: { '@id': base + ID_ORGANIZACION },
		mainEntity: { '@id': base + ID_ORGANIZACION }
	};
}
