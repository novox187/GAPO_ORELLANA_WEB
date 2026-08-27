<script lang="ts">
	import Pictograma from './Pictograma.svelte';
	import { CANTON } from '$lib/secciones';

	/**
	 * Pie de navegación lateral: a dónde ir después desde cualquier página
	 * de la sección. Sin esto, el final de una sub-página es un callejón sin
	 * salida y la única vía es el botón de atrás.
	 */
	let { actual, cuantas = 4 }: { actual: string; cuantas?: number } = $props();

	const otras = $derived(CANTON.filter((e) => e.slug !== actual).slice(0, cuantas));
</script>

<section class="contenedor border-t border-[var(--borde)] py-12 md:py-16">
	<h2 class="display mb-5 text-[1.3rem]">Sigue conociendo el cantón</h2>
	<ul class="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
		{#each otras as e (e.slug)}
			<li>
				<a
					href="/canton/{e.slug}"
					class="hermana tesela-diagonal group flex h-full min-h-[8.5rem] flex-col justify-between gap-6 p-5 no-underline {e.fondo} {e.tinta}"
				>
					<Pictograma nombre={e.picto} clase="h-9 w-auto opacity-90" />
					<span class="display text-[1.02rem] leading-snug">{e.titulo}</span>
				</a>
			</li>
		{/each}
	</ul>
</section>

<style>
	.hermana {
		transition: filter 0.2s ease-out;
	}
	.hermana:hover,
	.hermana:focus-visible {
		filter: brightness(1.08);
	}
	@media (prefers-reduced-motion: reduce) {
		.hermana {
			transition: none;
		}
	}
</style>
