<script lang="ts">
	import { img, type Media } from '$lib/api';

	/**
	 * El carrusel de fotos de una publicación. Scroll-snap nativo, como
	 * CarruselHistorias: nunca un manejador de arrastre propio.
	 *
	 * Con una sola foto no hay carrusel que montar: se sirve la imagen a
	 * secas, sin puntos ni contador, que no dirían nada con un solo elemento.
	 */
	let {
		imagenes,
		prioridad = false
	}: {
		imagenes: Media[];
		prioridad?: boolean;
	} = $props();

	let pista = $state<HTMLElement | null>(null);
	let actual = $state(0);

	function alDesplazar() {
		if (!pista) return;
		const ancho = pista.clientWidth;
		if (ancho > 0) actual = Math.round(pista.scrollLeft / ancho);
	}

	function irA(i: number) {
		if (!pista) return;
		pista.scrollTo({ left: i * pista.clientWidth, behavior: 'smooth' });
	}

	const proporcion = $derived(
		imagenes[0]?.ancho && imagenes[0]?.alto ? `${imagenes[0].ancho} / ${imagenes[0].alto}` : '1 / 1'
	);
</script>

{#if imagenes.length === 1}
	{@const m = imagenes[0]}
	<img
		src={img(m, 800)}
		alt={m.altPendiente ? '' : m.alt}
		class="w-full bg-[var(--superficie-alt)] object-cover"
		style="aspect-ratio: {proporcion}"
		loading={prioridad ? 'eager' : 'lazy'}
		fetchpriority={prioridad ? 'high' : 'auto'}
	/>
{:else if imagenes.length > 1}
	<div class="relative">
		<div
			bind:this={pista}
			onscroll={alDesplazar}
			class="pista flex snap-x snap-mandatory overflow-x-auto"
			style="aspect-ratio: {proporcion}"
			role="group"
			aria-roledescription="carrusel"
			aria-label="Fotografías de la publicación"
		>
			{#each imagenes as m, i (m.id)}
				<img
					src={img(m, 800)}
					alt={m.altPendiente ? '' : m.alt}
					class="h-full w-full shrink-0 snap-start bg-[var(--superficie-alt)] object-cover"
					loading={prioridad && i === 0 ? 'eager' : 'lazy'}
				/>
			{/each}
		</div>

		<p
			class="absolute top-2.5 right-2.5 rounded-full bg-black/55 px-2 py-0.5 text-[0.72rem] font-semibold text-white tabular-nums"
			aria-hidden="true"
		>
			{actual + 1}/{imagenes.length}
		</p>

		<div class="absolute inset-x-0 bottom-2.5 flex justify-center gap-2" role="tablist" aria-label="Ir a la fotografía">
			{#each imagenes as _, i (i)}
				<button
					type="button"
					role="tab"
					aria-selected={i === actual}
					aria-label="Fotografía {i + 1} de {imagenes.length}"
					onclick={() => irA(i)}
					class="dot"
					class:activo={i === actual}
				></button>
			{/each}
		</div>
	</div>
{/if}

<style>
	.pista {
		scrollbar-width: none;
	}

	.pista::-webkit-scrollbar {
		display: none;
	}

	/*
	  El punto visible es de 6px, pero el área que responde al toque es de
	  22px: el `padding` la agranda sin agrandar el punto, con
	  `background-clip` para que el color no se extienda al área invisible.
	  No llega a los 44px de un control primario porque es un atajo —el
	  carrusel también se navega arrastrando o con los botones de flecha—,
	  pero un punto de 6px sin margen de error sería inaccesible igual.
	*/
	.dot {
		width: 6px;
		height: 6px;
		padding: 8px;
		border-radius: 999px;
		background: rgb(255 255 255 / 0.55);
		background-clip: content-box;
		border: none;
		cursor: pointer;
		transition: background-color 0.15s ease-out;
	}

	.dot.activo {
		background-color: #ffffff;
	}
</style>
