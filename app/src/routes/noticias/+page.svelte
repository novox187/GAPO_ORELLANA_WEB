<script lang="ts">
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import Migas from '$lib/components/Migas.svelte';
	import TarjetaFeed from '$lib/components/TarjetaFeed.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { indiceSeccion } from '$lib/seo';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const POR_TANDA = 9;

	let anio = $state<string | null>(null);
	let visibles = $state(POR_TANDA);
	let centinela = $state<HTMLElement | null>(null);

	// Estado inicial desde la URL, y reinicio si cambian los datos de la ruta.
	$effect(() => {
		anio = data.anioActivo;
		visibles = POR_TANDA;
	});

	const filtradas = $derived(
		anio ? data.noticias.filter((n) => n.fecha?.startsWith(anio!)) : data.noticias
	);
	const mostradas = $derived(filtradas.slice(0, visibles));

	/**
	 * El feed carga por tandas de nueve con scroll infinito, así que el
	 * rastreador sólo ve las nueve primeras en el HTML. La lista completa va
	 * en datos estructurados; sin ella, 271 de las 280 noticias dependían de
	 * que alguien las enlazara desde fuera.
	 *
	 * La canónica de `<Seo>` descarta la query, que aquí importa: el filtro
	 * por año vive en la URL pero no cambia lo que sirve el servidor, así que
	 * sin eso habría una página duplicada por cada año publicado.
	 */
	const indice = $derived(
		indiceSeccion(
			page.url,
			'Noticias del GAD Municipal de Francisco de Orellana',
			'/noticias',
			data.noticias.map((n) => ({ nombre: n.titulo, ruta: `/noticias/${n.slug}` }))
		)
	);
	const quedanMas = $derived(visibles < filtradas.length);

	function elegirAnio(nuevo: string | null) {
		anio = nuevo;
		visibles = POR_TANDA;
		const u = new URL(page.url);
		if (nuevo) u.searchParams.set('anio', nuevo);
		else u.searchParams.delete('anio');
		replaceState(u, page.state);
		// El foco se queda en el filtro; se lleva la vista al inicio del feed.
		document.getElementById('feed')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
	}

	function mostrarMas() {
		if (quedanMas) visibles += POR_TANDA;
	}

	/**
	 * Scroll infinito con IntersectionObserver, nunca con un listener de
	 * scroll. El botón "Cargar más" es el propio centinela y se mantiene
	 * enfocable: sin él, quien navega con teclado o lector de pantalla no
	 * podría pedir la siguiente tanda ni alcanzar el pie de página.
	 */
	$effect(() => {
		const nodo = centinela;
		if (!nodo) return;
		const obs = new IntersectionObserver(
			(e) => {
				if (e[0]?.isIntersecting) mostrarMas();
			},
			{ rootMargin: '600px 0px' }
		);
		obs.observe(nodo);
		return () => obs.disconnect();
	});
</script>

<Seo
	titulo={anio ? `Noticias de ${anio}` : 'Noticias del cantón'}
	descripcion="Obras, servicios y decisiones del GAD Municipal de Francisco de Orellana. {data.total} publicaciones desde {data.anios.at(-1)?.anio}."
	imagen="/img/og/noticias.jpg"
	datos={[indice]}
/>

<div class="contenedor py-8 md:py-12">
	<Migas tramos={[{ texto: 'Inicio', href: '/' }, { texto: 'Noticias' }]} />

	<!--
		Retícula de tres columnas en pantallas grandes: una franja vacía a la
		izquierda equilibra la barra de años de la derecha, de modo que el
		feed queda ópticamente centrado en lugar de desplazado.
	-->
	<div class="lg:grid lg:grid-cols-[1fr_minmax(0,36rem)_1fr] lg:gap-8">
		<div class="hidden lg:block"></div>

		<div class="min-w-0">
			<header class="mb-6">
				<h1 class="display text-[clamp(1.8rem,4vw,2.6rem)]">Noticias</h1>
				<p class="mt-2 text-[0.95rem] leading-relaxed text-[var(--texto-suave)]">
					{#if anio}
						{filtradas.length} publicaciones de {anio}.
					{:else}
						{data.total} publicaciones de la gestión municipal.
					{/if}
				</p>
			</header>

			<!--
				El filtro por año es sólo de pantallas grandes, donde hay espacio
				libre a los lados del feed. Lo único que aparece en móvil es la
				salida del filtro, y sólo si se llegó con un enlace ya filtrado:
				sin ella el visitante quedaría atrapado en un año sin manera de
				volver a verlas todas.
			-->
			{#if anio}
				<div class="mb-6 lg:hidden">
					<button
						type="button"
						onclick={() => elegirAnio(null)}
						class="inline-flex min-h-10 items-center gap-2 border border-[var(--borde)] px-4 text-[0.85rem] font-semibold transition-colors hover:border-[var(--marca)]"
					>
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
							<path
								d="m7 7 10 10M17 7 7 17"
								stroke="currentColor"
								stroke-width="2.2"
								stroke-linecap="round"
							/>
						</svg>
						Ver todas las noticias
					</button>
				</div>
			{/if}

			<div id="feed" class="flex flex-col gap-6">
				{#each mostradas as n, i (n.slug)}
					<TarjetaFeed noticia={n} prioridad={i === 0} />
				{/each}
			</div>

			<div class="mt-8 text-center">
				<p class="sr-only" role="status" aria-live="polite">
					{mostradas.length} de {filtradas.length} noticias mostradas
				</p>

				{#if quedanMas}
					<!--
						aria-disabled en vez de disabled: un botón deshabilitado pierde
						el foco del teclado justo cuando el usuario acaba de pulsarlo.
					-->
					<button
						bind:this={centinela}
						type="button"
						onclick={mostrarMas}
						class="inline-flex min-h-12 items-center justify-center border border-[var(--borde)] px-7 font-semibold transition-colors hover:border-[var(--marca)]"
					>
						Cargar más noticias
					</button>
				{:else}
					<p class="text-sm text-[var(--texto-suave)]">
						Has llegado al final: {filtradas.length}
						{filtradas.length === 1 ? 'noticia' : 'noticias'}{anio ? ` de ${anio}` : ''}.
					</p>
				{/if}
			</div>
		</div>

		<!-- Filtro por año en pantallas grandes -->
		<aside class="hidden lg:block">
			<div class="sticky top-28">
				<h2 class="mb-3 text-[0.72rem] font-bold tracking-[0.16em] text-[var(--texto-suave)] uppercase">
					Por año
				</h2>
				<ul class="space-y-px">
					<li>
						<button
							type="button"
							aria-pressed={anio === null}
							onclick={() => elegirAnio(null)}
							class="flex w-full items-baseline justify-between border-b border-[var(--borde)] py-2.5 text-left text-[0.95rem] transition-colors
							{anio === null
								? 'font-bold text-[var(--color-selva-800)]'
								: 'text-[var(--texto-suave)] hover:text-[var(--texto)]'}"
						>
							<span>Todas</span>
							<span class="text-[0.8rem] tabular-nums opacity-70">{data.total}</span>
						</button>
					</li>
					{#each data.anios as a (a.anio)}
						<li>
							<button
								type="button"
								aria-pressed={anio === a.anio}
								onclick={() => elegirAnio(a.anio)}
								class="flex w-full items-baseline justify-between border-b border-[var(--borde)] py-2.5 text-left text-[0.95rem] transition-colors
								{anio === a.anio
									? 'font-bold text-[var(--color-selva-800)]'
									: 'text-[var(--texto-suave)] hover:text-[var(--texto)]'}"
							>
								<span>{a.anio}</span>
								<span class="text-[0.8rem] tabular-nums opacity-70">{a.total}</span>
							</button>
						</li>
					{/each}
				</ul>
			</div>
		</aside>
	</div>
</div>
