<script lang="ts">
	import { page } from '$app/state';
	import Pictograma from '$lib/components/Pictograma.svelte';
	import Seo from '$lib/components/Seo.svelte';

	const esNoEncontrado = $derived(page.status === 404);
</script>

<Seo
	titulo={esNoEncontrado ? 'Página no encontrada' : `Error ${page.status}`}
	descripcion="La página solicitada no está disponible en el sitio del GAD Municipal de Francisco de Orellana."
	indexar={false}
/>

<div class="contenedor flex min-h-[60vh] items-center py-16">
	<div class="grid w-full items-center gap-10 md:grid-cols-[1fr_auto]">
		<div>
			<p class="display text-[clamp(3rem,10vw,6rem)] text-[var(--color-selva-800)]">
				{page.status}
			</p>
			<h1 class="display mt-2 text-[clamp(1.5rem,3.4vw,2.2rem)]">
				{esNoEncontrado ? 'Esta página no existe' : 'Algo salió mal'}
			</h1>
			<p class="mt-4 max-w-md leading-relaxed text-[var(--texto-suave)]">
				{page.error?.message ??
					'No pudimos completar la solicitud. Intenta de nuevo en unos minutos.'}
			</p>

			<div class="mt-8 flex flex-wrap gap-1.5">
				<a
					href="/"
					class="inline-flex min-h-12 items-center bg-[var(--color-selva-800)] px-6 font-semibold text-white no-underline transition-[filter] hover:brightness-110"
				>
					Ir al inicio
				</a>
				<a
					href="/buscar"
					class="inline-flex min-h-12 items-center border border-[var(--borde)] px-6 font-semibold no-underline transition-colors hover:border-[var(--marca)]"
				>
					Buscar
				</a>
			</div>
		</div>

		<div
			class="tesela-diagonal hidden aspect-square w-56 items-center justify-center bg-[var(--color-carbon-600)] p-10 text-white md:flex"
		>
			<Pictograma nombre="cultura" clase="h-full w-auto" />
		</div>
	</div>
</div>
