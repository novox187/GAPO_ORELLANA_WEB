<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import Cabecera from '$lib/components/Cabecera.svelte';
	import Pie from '$lib/components/Pie.svelte';
	import HojaSesion from '$lib/components/HojaSesion.svelte';
	import { grafo, organizacion, serializar, sitioWeb } from '$lib/seo';
	import { sesion } from '$lib/sesion.svelte';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	// Sincroniza el estado global de sesión con lo que trajo `+layout.ts`.
	// Se repite en cada navegación porque el ciudadano puede haber cerrado
	// sesión en otra pestaña, o la cuenta puede haberse bloqueado entre una
	// carga y la siguiente.
	$effect(() => {
		sesion.ciudadano = data.ciudadano;
	});

	/**
	 * El asistente, el visor de historias y el estudio ocupan la pantalla
	 * completa y traen su propia cabecera (o ninguna, en el caso del visor).
	 *
	 * El estudio se suma aquí por lo mismo que los otros dos, y con un motivo
	 * propio: quien publica abre esta herramienta cada día para llegar a lo
	 * suyo en un gesto, y la navegación municipal —Trámites, Transparencia,
	 * El cantón— le pondría delante cinco secciones que no va a usar.
	 *
	 * Se resuelve aquí con una condición y no con un grupo de rutas porque en
	 * SvelteKit `+layout@.svelte` reinicia la herencia HASTA este archivo, que
	 * es justo el que hay que saltarse. Meter todo el sitio en un grupo
	 * `(sitio)/` para librar una sola ruta habría movido veinte carpetas.
	 */
	const pantallaCompleta = $derived(
		page.url.pathname.startsWith('/asistente') ||
			page.url.pathname.startsWith('/noticias/historias/') ||
			page.url.pathname.startsWith('/estudio')
	);

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

<HojaSesion />
