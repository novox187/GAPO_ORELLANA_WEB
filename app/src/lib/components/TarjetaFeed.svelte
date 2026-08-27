<script lang="ts">
	import { img, fechaRelativa, fechaLegible, type NoticiaResumen } from '$lib/api';

	let { noticia, prioridad = false }: { noticia: NoticiaResumen; prioridad?: boolean } = $props();

	const enlace = $derived(`/noticias/${noticia.slug}`);

	/**
	 * La proporción sale de los metadatos de la imagen para reservar el
	 * espacio antes de que cargue: sin esto el feed daría saltos al hacer
	 * scroll (CLS). Sin metadatos se asume 3:2, la proporción dominante del
	 * archivo fotográfico municipal.
	 */
	const proporcion = $derived(
		noticia.imagen?.ancho && noticia.imagen?.alto
			? `${noticia.imagen.ancho} / ${noticia.imagen.alto}`
			: '3 / 2'
	);

	let copiado = $state(false);

	async function compartir() {
		const url = new URL(enlace, location.origin).href;
		const datos = { title: noticia.titulo, text: noticia.resumen, url };
		try {
			if (navigator.share) {
				await navigator.share(datos);
				return;
			}
			await navigator.clipboard.writeText(url);
			copiado = true;
			setTimeout(() => (copiado = false), 2200);
		} catch {
			// El usuario canceló el diálogo, o el navegador bloqueó el portapapeles.
		}
	}
</script>

<article
	class="mx-auto max-w-xl border border-[var(--borde)] bg-[var(--superficie-elevada)]"
>
	<!-- Cabecera: sello municipal + fecha -->
	<header class="flex items-center gap-3 p-3.5">
		<img
			src="/favicon.svg"
			alt=""
			aria-hidden="true"
			width="38"
			height="38"
			class="shrink-0 rounded-full"
		/>
		<div class="min-w-0">
			<p class="text-[0.86rem] leading-tight font-bold">Alcaldía de Francisco de Orellana</p>
			<time
				datetime={noticia.fecha ?? undefined}
				title={fechaLegible(noticia.fecha)}
				class="text-[0.76rem] text-[var(--texto-suave)]"
			>
				{fechaRelativa(noticia.fecha)}
			</time>
		</div>
	</header>

	<!-- Fotografía -->
	{#if noticia.imagen}
		<a href={enlace} class="block" tabindex="-1" aria-hidden="true">
			<img
				src={img(noticia.imagen, 800)}
				alt={noticia.imagen.altPendiente ? '' : noticia.imagen.alt}
				class="max-h-[75vh] w-full bg-[var(--superficie-alt)] object-cover"
				style="aspect-ratio: {proporcion}"
				loading={prioridad ? 'eager' : 'lazy'}
				fetchpriority={prioridad ? 'high' : 'auto'}
			/>
		</a>
	{/if}

	<!--
		Sólo acciones que existen de verdad. Un sitio de gobierno no puede
		mostrar botones de "me gusta" o comentarios que no hacen nada.
	-->
	<div class="flex items-center gap-1 border-b border-[var(--borde)] px-2.5 py-2">
		<button
			type="button"
			onclick={compartir}
			class="inline-flex min-h-10 items-center gap-2 px-2 text-[0.82rem] font-semibold transition-colors hover:text-[var(--color-selva-800)]"
		>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<path
					d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 15V3m0 0L8 7m4-4 4 4"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
			{copiado ? 'Enlace copiado' : 'Compartir'}
		</button>
		<a
			href={enlace}
			class="inline-flex min-h-10 items-center gap-2 px-2 text-[0.82rem] font-semibold no-underline transition-colors hover:text-[var(--color-selva-800)]"
		>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<path
					d="M4 5.5h16M4 12h16M4 18.5h10"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				/>
			</svg>
			Leer completa
		</a>
	</div>

	<!-- Texto -->
	<div class="p-4">
		<h2 class="leading-snug font-bold">
			<a href={enlace} class="no-underline hover:text-[var(--color-selva-800)]">
				{noticia.titulo}
			</a>
		</h2>
		{#if noticia.resumen}
			<p class="mt-2 line-clamp-3 text-[0.92rem] leading-relaxed text-[var(--texto-suave)]">
				{noticia.resumen}
			</p>
		{/if}
		<a
			href={enlace}
			class="mt-3 inline-block text-[0.86rem] font-bold text-[var(--color-selva-800)] no-underline hover:underline"
		>
			Leer más
		</a>
	</div>
</article>
