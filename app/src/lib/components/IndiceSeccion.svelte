<script lang="ts">
	import Migas from './Migas.svelte';
	import Pictograma from './Pictograma.svelte';
	import type { EntradaSeccion } from '$lib/secciones';

	/**
	 * Índice de "El cantón" como mosaico de teselas, el mismo lenguaje del
	 * logotipo municipal: una rejilla de entradas fotográficas hacia páginas
	 * de contenido. Transparencia usa su propio índice (IndiceTransparencia)
	 * — su contenido es documental, no fotográfico, y el mosaico de teselas
	 * a pantalla completa no encajaba.
	 */
	let {
		titulo,
		descripcion,
		base,
		entradas
	}: { titulo: string; descripcion: string; base: string; entradas: EntradaSeccion[] } = $props();
</script>

<div class="contenedor py-10 md:py-14">
	<Migas tramos={[{ texto: 'Inicio', href: '/' }, { texto: titulo }]} />

	<header class="mb-10">
		<h1 class="display text-[clamp(1.9rem,4.4vw,3rem)]">{titulo}</h1>
		<p class="mt-3 max-w-2xl leading-relaxed text-[var(--texto-suave)]">{descripcion}</p>
	</header>

	<ul class="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
		{#each entradas as e (e.slug)}
			<li>
				<a
					href="{base}/{e.slug}"
					class="tesela-diagonal group flex h-full flex-col justify-between gap-10 p-7 no-underline transition-[filter] duration-200 hover:brightness-110 {e.fondo} {e.tinta}"
				>
					<Pictograma nombre={e.picto} clase="h-12 w-auto opacity-95" />
					<div>
						<h2 class="display text-[1.15rem]">{e.titulo}</h2>
						<p class="mt-1.5 text-[0.86rem] leading-relaxed opacity-85">{e.descripcion}</p>
					</div>
				</a>
			</li>
		{/each}
	</ul>
</div>
