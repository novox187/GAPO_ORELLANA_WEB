<script lang="ts">
	import { fechaRelativa, fechaLegible, type PublicacionResumen } from '$lib/api';
	import Avatar from './Avatar.svelte';
	import Insignia from './Insignia.svelte';
	import CarruselFotos from './CarruselFotos.svelte';
	import BarraAcciones from './BarraAcciones.svelte';
	import { observarImpresion } from '$lib/metricas';

	/**
	 * La tarjeta del feed social. Sin tarjeta, en realidad: a sangre, como
	 * Instagram — la foto ocupa todo el ancho, sin borde ni fondo elevado
	 * alrededor, y lo único que separa una publicación de la siguiente es un
	 * filete de 1px. El pie de foto va después del recuento de reacciones y
	 * antes del enlace a comentarios, en ese orden exacto: es el que hace
	 * que un feed largo se lea como un único scroll continuo y no como una
	 * pila de tarjetas sueltas.
	 */
	let { publicacion, prioridad = false }: { publicacion: PublicacionResumen; prioridad?: boolean } = $props();

	const perfil = $derived(`/noticias/perfil/${publicacion.cuenta.alias}`);

	/**
	 * La impresión se cuenta cuando la tarjeta entra DE VERDAD en pantalla:
	 * la mitad visible durante medio segundo. Sin el umbral de tiempo, pasar
	 * el dedo rápido por el feed contaría quince publicaciones vistas; sin el
	 * de área, contaría una que asoma dos píxeles por el borde. Ver
	 * `observarImpresion`.
	 */
	let tarjeta = $state<HTMLElement | null>(null);

	$effect(() => {
		if (!tarjeta) return;

		return observarImpresion(tarjeta, {
			tipo: 'impresion',
			recurso: 'publicacion',
			id: publicacion.slug,
			origen: 'feed'
		});
	});
</script>

<article bind:this={tarjeta} class="border-b border-[var(--borde)] pb-2">
	<header class="flex items-center gap-2.5 px-3 py-2.5">
		<a href={perfil} class="shrink-0">
			<Avatar cuenta={publicacion.cuenta} tamano={32} />
		</a>
		<div class="min-w-0 flex-1">
			<p class="flex min-w-0 items-center gap-1 text-[0.85rem] leading-tight">
				<a href={perfil} class="truncate font-bold text-[var(--texto)] no-underline hover:underline">
					{publicacion.cuenta.nombre}
				</a>
				{#if publicacion.cuenta.verificada}<Insignia tamano={13} />{/if}
			</p>

			{#if publicacion.ubicacion}
				<p class="truncate text-[0.72rem] leading-tight text-[var(--texto-suave)]">
					{publicacion.ubicacion.nombre}
				</p>
			{/if}
		</div>
	</header>

	{#if publicacion.imagen}
		<a href={publicacion.url} class="block" tabindex="-1" aria-hidden="true">
			<CarruselFotos imagenes={[publicacion.imagen]} {prioridad} />
		</a>
	{/if}

	<BarraAcciones {publicacion} />

	<div class="px-3 pt-1.5">
		{#if publicacion.tipo === 'nota'}
			<p class="leading-snug">
				<a href={publicacion.url} class="font-bold text-[var(--texto)] no-underline hover:underline">
					{publicacion.titulo}
				</a>
			</p>
			{#if publicacion.resumen}
				<p class="mt-0.5 line-clamp-2 text-[0.9rem] leading-relaxed text-[var(--texto-suave)]">
					{publicacion.resumen}
				</p>
			{/if}
		{:else if publicacion.pie}
			<p class="line-clamp-3 text-[0.9rem] leading-relaxed">
				<a href={perfil} class="font-bold text-[var(--texto)] no-underline hover:underline">
					{publicacion.cuenta.alias}
				</a>
				{publicacion.pie}
			</p>
		{/if}

		{#if publicacion.permite_comentarios && publicacion.comentarios_contador > 0}
			<a
				href="{publicacion.url}#comentarios"
				class="mt-1 block text-[0.85rem] text-[var(--texto-suave)] no-underline hover:underline"
			>
				Ver los {publicacion.comentarios_contador}
				{publicacion.comentarios_contador === 1 ? 'comentario' : 'comentarios'}
			</a>
		{/if}

		<time
			datetime={publicacion.fecha ?? undefined}
			title={fechaLegible(publicacion.fecha)}
			class="mt-1 block text-[0.72rem] tracking-wide text-[var(--texto-suave)] uppercase"
		>
			{fechaRelativa(publicacion.fecha)}
		</time>
	</div>
</article>
