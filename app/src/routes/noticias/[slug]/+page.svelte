<script lang="ts">
	import Migas from '$lib/components/Migas.svelte';
	import { img, fechaLegible } from '$lib/api';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const n = $derived(data.noticia);

	const parrafos = $derived(n.cuerpo.split(/\n{2,}/).filter((p) => p.trim().length > 0));
	// La primera imagen encabeza el artículo; el resto va en galería al pie.
	// Dedupe por id: la extracción colapsa medios idénticos por hash.
	const galeria = $derived(
		[...new Map(n.imagenes.slice(1).map((g) => [g.id, g])).values()]
	);
</script>

<svelte:head>
	<title>{n.titulo} — Alcaldía de Francisco de Orellana</title>
	<meta name="description" content={n.resumen} />
	<meta property="og:type" content="article" />
	<meta property="og:title" content={n.titulo} />
	<meta property="og:description" content={n.resumen} />
	{#if n.imagen}<meta property="og:image" content={img(n.imagen, 1600)} />{/if}
</svelte:head>

<article class="contenedor py-10 md:py-14">
	<Migas
		tramos={[
			{ texto: 'Inicio', href: '/' },
			{ texto: 'Noticias', href: '/noticias' },
			{ texto: n.titulo }
		]}
	/>

	<header class="mx-auto max-w-3xl">
		<p class="text-sm font-semibold text-[var(--color-selva-800)]">{fechaLegible(n.fecha)}</p>
		<h1 class="display mt-2 text-[clamp(1.7rem,3.8vw,2.7rem)]">{n.titulo}</h1>
	</header>

	{#if n.imagen}
		<figure class="tesela mx-auto mt-8 max-w-4xl">
			<img
				src={img(n.imagen, 1600)}
				alt={n.imagen.altPendiente ? '' : n.imagen.alt}
				class="w-full object-cover"
				fetchpriority="high"
			/>
		</figure>
	{/if}

	<div class="mx-auto mt-8 max-w-3xl">
		{#each parrafos as p, i (i)}
			<p class="mb-5 leading-[1.75] text-[var(--texto-suave)]">{p}</p>
		{/each}

		{#if galeria.length}
			<h2 class="display mt-12 mb-4 text-xl">Galería</h2>
			<ul class="grid grid-cols-2 gap-1.5 md:grid-cols-3">
				{#each galeria as g (g.id)}
					<li class="tesela">
						<img
							src={img(g, 800)}
							alt={g.altPendiente ? '' : g.alt}
							class="aspect-square w-full object-cover"
							loading="lazy"
						/>
					</li>
				{/each}
			</ul>
		{/if}

	</div>

	<!-- Navegación entre noticias contiguas -->
	<nav
		class="mx-auto mt-12 grid max-w-3xl gap-1.5 sm:grid-cols-2"
		aria-label="Otras noticias"
	>
		{#if data.anterior}
			<a
				href="/noticias/{data.anterior.slug}"
				rel="prev"
				class="group border border-[var(--borde)] p-5 no-underline transition-colors hover:border-[var(--marca)]"
			>
				<span class="text-xs font-bold tracking-wider text-[var(--texto-suave)] uppercase">
					Anterior
				</span>
				<span
					class="mt-1.5 block leading-snug font-semibold group-hover:text-[var(--color-selva-800)]"
				>
					{data.anterior.titulo}
				</span>
			</a>
		{/if}
		{#if data.siguiente}
			<a
				href="/noticias/{data.siguiente.slug}"
				rel="next"
				class="group border border-[var(--borde)] p-5 no-underline transition-colors hover:border-[var(--marca)] sm:col-start-2 sm:text-right"
			>
				<span class="text-xs font-bold tracking-wider text-[var(--texto-suave)] uppercase">
					Siguiente
				</span>
				<span
					class="mt-1.5 block leading-snug font-semibold group-hover:text-[var(--color-selva-800)]"
				>
					{data.siguiente.titulo}
				</span>
			</a>
		{/if}
	</nav>
</article>
