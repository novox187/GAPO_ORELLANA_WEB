<script lang="ts">
	import Migas from './Migas.svelte';
	import Bloques from './Bloques.svelte';
	import { img, type Pagina } from '$lib/api';
	import type { EntradaSeccion } from '$lib/secciones';

	/**
	 * Página de contenido de una entrada de "El cantón": los bloques
	 * extraídos del sitio municipal, más los documentos e imágenes
	 * asociados. Transparencia usa su propio componente (PaginaTransparencia)
	 * — necesita agrupar por año/categoría y buscar entre cientos de
	 * documentos, cosa que esta plantilla genérica no resuelve.
	 */
	let {
		entrada,
		pagina,
		seccionTitulo,
		base,
		hermanas
	}: {
		entrada: EntradaSeccion;
		pagina: Pagina;
		seccionTitulo: string;
		base: string;
		hermanas: EntradaSeccion[];
	} = $props();

	const otras = $derived(hermanas.filter((h) => h.slug !== entrada.slug).slice(0, 6));

	/**
	 * Los medios se deduplican por SHA-256 durante la extracción, así que una
	 * misma foto reutilizada en la página aparece varias veces con el mismo
	 * id. Se colapsan aquí: repetir la imagen no aporta y rompía la clave del
	 * bucle.
	 */
	const galeria = $derived([...new Map(pagina.imagenes.map((im) => [im.id, im])).values()]);
</script>

<svelte:head>
	<title>{entrada.titulo} — Alcaldía de Francisco de Orellana</title>
	<meta name="description" content={entrada.descripcion} />
</svelte:head>

<div class="contenedor py-10 md:py-14">
	<Migas
		tramos={[
			{ texto: 'Inicio', href: '/' },
			{ texto: seccionTitulo, href: base },
			{ texto: entrada.titulo }
		]}
	/>

	<div class="grid gap-12 lg:grid-cols-[1fr_17rem] lg:gap-16">
		<div class="min-w-0">
			<header class="mb-8">
				<h1 class="display text-[clamp(1.8rem,4vw,2.8rem)]">{entrada.titulo}</h1>
				<p class="mt-3 max-w-2xl leading-relaxed text-[var(--texto-suave)]">
					{entrada.descripcion}
				</p>
			</header>

			{#if pagina.bloques.length}
				<Bloques bloques={pagina.bloques} />
			{:else}
				<p
					class="border-l-4 border-[var(--color-achiote-500)] bg-[var(--superficie-alt)] p-5 leading-relaxed"
				>
					El contenido de esta sección está en los documentos que acompañan a la página.
				</p>
			{/if}

			{#if galeria.length}
				<h2 class="display mt-12 mb-4 text-xl">Imágenes</h2>
				<ul class="grid grid-cols-2 gap-1.5 md:grid-cols-3">
					{#each galeria.slice(0, 18) as im (im.id)}
						<li class="tesela">
							<img
								src={img(im, 800)}
								alt={im.altPendiente ? '' : im.alt}
								class="aspect-square w-full object-cover"
								loading="lazy"
							/>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<aside class="lg:sticky lg:top-24 lg:self-start">
			{#if pagina.documentos.length}
				<h2 class="mb-3 text-sm font-bold">Documentos ({pagina.documentos.length})</h2>
				<ul class="mb-8 max-h-96 space-y-1.5 overflow-y-auto pr-1">
					{#each pagina.documentos as d (d.url)}
						<li>
							<a
								href={d.url}
								target="_blank"
								rel="noopener"
								class="flex items-start gap-2.5 border border-[var(--borde)] p-3 text-sm no-underline transition-colors hover:border-[var(--marca)]"
							>
								<span
									class="mt-0.5 shrink-0 bg-[var(--superficie-alt)] px-1.5 py-0.5 text-[0.62rem] font-bold uppercase"
								>
									{d.tipo}
								</span>
								<span class="leading-snug">{d.nombre}</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}

			{#if otras.length}
				<h2 class="mb-3 text-sm font-bold">Más en {seccionTitulo}</h2>
				<ul class="space-y-px">
					{#each otras as o (o.slug)}
						<li>
							<a
								href="{base}/{o.slug}"
								class="block border-b border-[var(--borde)] py-2.5 text-sm no-underline hover:text-[var(--color-selva-800)]"
							>
								{o.titulo}
							</a>
						</li>
					{/each}
				</ul>
			{/if}

		</aside>
	</div>
</div>
