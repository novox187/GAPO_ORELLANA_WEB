<script lang="ts">
	import { page } from '$app/state';
	import { grafo, migas, serializar } from '$lib/seo';

	/** Migas de pan con la ruta real de navegación; cada tramo es un enlace vivo. */
	let {
		tramos,
		actual
	}: {
		tramos: { texto: string; href?: string }[];
		/**
		 * Nombre de la página actual, sólo para los datos estructurados.
		 *
		 * Algunas páginas cierran el rastro visible un nivel antes a
		 * propósito —en un trámite, el último tramo sería el mismo texto que
		 * el titular que viene justo debajo—. La lista que lee el buscador sí
		 * tiene que llegar hasta el final, o el resultado muestra "Inicio ›
		 * Trámites › Agua y ambiente" para una página que se llama "Servicio
		 * de Agua Potable".
		 */
		actual?: string;
	} = $props();

	/**
	 * Las mismas migas, en datos estructurados.
	 *
	 * Se emiten aquí y no en cada página a propósito: la ruta ya está escrita
	 * en este componente, y duplicarla en el `<Seo>` de veinte rutas es la
	 * forma segura de que un día el rastro visible y el declarado dejen de
	 * coincidir. Con esto, Google muestra "Inicio › Trámites › Patente" bajo
	 * el resultado en vez de la URL cruda.
	 */
	const datos = $derived(
		serializar(grafo([migas(page.url, actual ? [...tramos, { texto: actual }] : tramos)]))
	);
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${datos}<\/script>`}
</svelte:head>

<nav aria-label="Ruta de navegación" class="mb-6 text-sm text-[var(--texto-suave)]">
	<ol class="flex flex-wrap items-center gap-x-1 gap-y-1">
		{#each tramos as t, i (t.texto)}
			<li class="flex items-center gap-x-1">
				{#if t.href}
					<!--
						min-h-6: el enlace medía 20 px de alto y en un teléfono se
						queda por debajo del mínimo de 24×24 que pide WCAG 2.5.8.
						La caja crece sin mover el texto ni la línea base.
					-->
					<a href={t.href} class="inline-flex min-h-6 items-center no-underline hover:underline"
						>{t.texto}</a
					>
				{:else}
					<span aria-current="page" class="inline-flex min-h-6 items-center text-[var(--texto)]"
						>{t.texto}</span
					>
				{/if}
				{#if i < tramos.length - 1}
					<span aria-hidden="true" class="mx-1 opacity-40">/</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>
