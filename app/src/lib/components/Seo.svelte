<script lang="ts">
	import { page } from '$app/state';
	import {
		DESCRIPCION_POR_DEFECTO,
		IMAGEN_POR_DEFECTO,
		IMAGEN_POR_DEFECTO_ALT,
		SITIO,
		absoluta,
		descripcion as normalizarDescripcion,
		grafo,
		serializar,
		tituloCompleto
	} from '$lib/seo';

	/**
	 * Cabecera de una página: título, descripción, canónica, Open Graph,
	 * Twitter y datos estructurados, todo desde un solo sitio.
	 *
	 * Existe como componente y no como una función que devuelve etiquetas
	 * porque `<svelte:head>` sólo funciona dentro de un componente, y porque
	 * así es imposible que una ruta nueva se publique con Open Graph a
	 * medias: o pone `<Seo>` y lo tiene todo, o no pone nada y se nota.
	 */
	let {
		titulo,
		descripcion,
		imagen,
		imagenAlt,
		tipo = 'website',
		canonica,
		indexar = true,
		articulo,
		datos = []
	}: {
		/** Sin el sufijo de marca; el componente lo añade. */
		titulo?: string;
		descripcion?: string | null;
		/** Ruta del sitio o URL absoluta. Se convierte a absoluta siempre. */
		imagen?: string | null;
		imagenAlt?: string;
		tipo?: 'website' | 'article';
		/**
		 * Ruta canónica alternativa. Por defecto es la ruta actual **sin la
		 * query**: los filtros de trámites y noticias viven en la URL pero
		 * no cambian el contenido servido, así que las decenas de
		 * combinaciones deben consolidarse en una sola página indexada.
		 */
		canonica?: string;
		indexar?: boolean;
		articulo?: { publicada?: string | null; modificada?: string | null; seccion?: string };
		/** Nodos JSON-LD propios de esta página. */
		datos?: unknown[];
	} = $props();

	const url = $derived(page.url);
	const titulo_ = $derived(tituloCompleto(titulo));
	const descripcion_ = $derived(normalizarDescripcion(descripcion, DESCRIPCION_POR_DEFECTO));
	const canonica_ = $derived(absoluta(url, canonica ?? url.pathname));
	const imagen_ = $derived(absoluta(url, imagen || IMAGEN_POR_DEFECTO));

	/**
	 * Texto alternativo de la tarjeta.
	 *
	 * Las tarjetas de `/img/og/` son composiciones con el logotipo y un
	 * titular, no fotografías del contenido: describirlas con la descripción
	 * de la página mentiría sobre lo que se ve. Una fotografía de noticia sí
	 * llega con su propio `alt` desde el catálogo de medios.
	 */
	const imagenAlt_ = $derived(
		imagenAlt ||
			(imagen && !imagen.startsWith('/img/og/')
				? descripcion_
				: imagen
					? `Logotipo de la ${SITIO} sobre el título «${titulo ?? SITIO}».`
					: IMAGEN_POR_DEFECTO_ALT)
	);
	const jsonLd = $derived(datos.length ? serializar(grafo(datos)) : '');
</script>

<svelte:head>
	<title>{titulo_}</title>
	<meta name="description" content={descripcion_} />
	<link rel="canonical" href={canonica_} />

	{#if indexar}
		<!--
			`max-snippet:-1` y `max-image-preview:large` no son adorno: sin
			ellos Google recorta el fragmento y muestra una miniatura
			pequeña en los resultados de noticias municipales.
		-->
		<meta
			name="robots"
			content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
		/>
	{:else}
		<meta name="robots" content="noindex, follow" />
	{/if}

	<meta property="og:type" content={tipo} />
	<meta property="og:site_name" content={SITIO} />
	<meta property="og:locale" content="es_EC" />
	<meta property="og:title" content={titulo ?? SITIO} />
	<meta property="og:description" content={descripcion_} />
	<meta property="og:url" content={canonica_} />
	<meta property="og:image" content={imagen_} />
	<meta property="og:image:alt" content={imagenAlt_} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />

	{#if tipo === 'article'}
		{#if articulo?.publicada}
			<meta property="article:published_time" content={articulo.publicada} />
		{/if}
		{#if articulo?.modificada}
			<meta property="article:modified_time" content={articulo.modificada} />
		{/if}
		{#if articulo?.seccion}
			<meta property="article:section" content={articulo.seccion} />
		{/if}
		<meta
			property="article:publisher"
			content="https://www.facebook.com/MunicipiodeFranciscodeOrellana"
		/>
	{/if}

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:site" content="@GADMFOrellana" />
	<meta name="twitter:title" content={titulo ?? SITIO} />
	<meta name="twitter:description" content={descripcion_} />
	<meta name="twitter:image" content={imagen_} />
	<meta name="twitter:image:alt" content={imagenAlt_} />

	{#if jsonLd}
		{@html `<script type="application/ld+json">${jsonLd}<\/script>`}
	{/if}
</svelte:head>
