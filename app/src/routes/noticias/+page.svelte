<script lang="ts">
	import Migas from '$lib/components/Migas.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import CarruselHistorias from '$lib/components/CarruselHistorias.svelte';
	import PublicacionFeed from '$lib/components/PublicacionFeed.svelte';
	import { social, type PublicacionResumen } from '$lib/api';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let publicaciones = $state<PublicacionResumen[]>(data.publicaciones);
	let cursor = $state<number | null>(data.siguienteCursor);
	let cargando = $state(false);
	let centinela = $state<HTMLElement | null>(null);

	// Al navegar de vuelta a /noticias desde otra ruta, SvelteKit reutiliza
	// este componente y re-ejecuta `load`: hay que resincronizar el estado
	// local con los datos nuevos, o el feed se quedaría pegado al de la
	// visita anterior.
	$effect(() => {
		publicaciones = data.publicaciones;
		cursor = data.siguienteCursor;
	});

	async function cargarMas() {
		if (cargando || cursor === null) return;
		cargando = true;
		try {
			const pagina = await social.feed(fetch, cursor);
			publicaciones = [...publicaciones, ...pagina.data];
			cursor = pagina.meta.siguiente_cursor;
		} finally {
			cargando = false;
		}
	}

	$effect(() => {
		const nodo = centinela;
		if (!nodo) return;
		const obs = new IntersectionObserver(
			(e) => {
				if (e[0]?.isIntersecting) cargarMas();
			},
			{ rootMargin: '600px 0px' }
		);
		obs.observe(nodo);
		return () => obs.disconnect();
	});
</script>

<Seo
	titulo="Noticias"
	descripcion="Lo que publican la Alcaldía y las direcciones de Francisco de Orellana: obras, servicios y avisos, con historias y publicaciones."
	imagen="/img/og/noticias.jpg"
/>

<div class="contenedor py-8 md:py-12">
	<Migas tramos={[{ texto: 'Inicio', href: '/' }, { texto: 'Noticias' }]} />

	<div class="mx-auto max-w-xl">
		<h1 class="sr-only">Noticias</h1>

		<CarruselHistorias cuentas={data.cuentasConHistorias} />

		<div class="border-t border-[var(--borde)]">
			{#each publicaciones as p, i (p.id)}
				<PublicacionFeed publicacion={p} prioridad={i === 0} />
			{/each}
		</div>

		<div class="mt-8 text-center">
			<p class="sr-only" role="status" aria-live="polite">
				{publicaciones.length} publicaciones mostradas
			</p>

			{#if cursor !== null}
				<button
					bind:this={centinela}
					type="button"
					onclick={cargarMas}
					aria-disabled={cargando}
					class="inline-flex min-h-12 items-center justify-center border border-[var(--borde)] px-7 font-semibold transition-colors hover:border-[var(--marca)]"
				>
					{cargando ? 'Cargando…' : 'Cargar más publicaciones'}
				</button>
			{:else if publicaciones.length}
				<p class="text-sm text-[var(--texto-suave)]">Has llegado al final.</p>
			{:else}
				<p class="text-sm text-[var(--texto-suave)]">
					Todavía no hay publicaciones. Cuando la Alcaldía o una dirección publique la primera,
					aparecerá aquí.
				</p>
			{/if}
		</div>
	</div>
</div>
