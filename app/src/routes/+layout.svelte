<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import Cabecera from '$lib/components/Cabecera.svelte';
	import Pie from '$lib/components/Pie.svelte';

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
</script>

<svelte:head>
	<link
		rel="preload"
		href="/fonts/archivo-var.woff2"
		as="font"
		type="font/woff2"
		crossorigin="anonymous"
	/>
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
