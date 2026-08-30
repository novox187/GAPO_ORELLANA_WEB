<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import Cabecera from '$lib/components/Cabecera.svelte';
	import Pie from '$lib/components/Pie.svelte';
	import { grafo, organizacion, serializar, sitioWeb } from '$lib/seo';

	let { children } = $props();

	/**
	 * El asistente ocupa la pantalla completa y trae su propia cabecera.
	 *
	 * Se resuelve aquí con una condición y no con un grupo de rutas porque en
	 * SvelteKit `+layout@.svelte` reinicia la herencia HASTA este archivo, que
	 * es justo el que hay que saltarse. Meter todo el sitio en un grupo
	 * `(sitio)/` para librar una sola ruta habría movido veinte carpetas.
	 */
	const pantallaCompleta = $derived(page.url.pathname.startsWith('/asistente'));

	/**
	 * Identidad de la institución y del sitio, en todas las páginas.
	 *
	 * Va en el layout y no en cada página porque describe al emisor, no al
	 * contenido: es lo que permite que un buscador entienda que las 370 URLs
	 * son de un mismo gobierno local con sus perfiles oficiales verificados,
	 * en vez de tratarlas como páginas sueltas. Las fichas propias de cada
	 * página (noticia, trámite, migas) las emite `<Seo datos={…}>`.
	 */
	const identidad = $derived(serializar(grafo([organizacion(page.url), sitioWeb(page.url)])));
</script>

<svelte:head>
	<link
		rel="preload"
		href="/fonts/archivo-var.woff2"
		as="font"
		type="font/woff2"
		crossorigin="anonymous"
	/>
	{@html `<script type="application/ld+json">${identidad}<\/script>`}
</svelte:head>

{#if pantallaCompleta}
	{@render children()}
{:else}
	<div class="flex min-h-[100dvh] flex-col">
		<Cabecera />
		<main id="contenido" class="flex-1">
			{@render children()}
		</main>
		<Pie />
	</div>
{/if}
