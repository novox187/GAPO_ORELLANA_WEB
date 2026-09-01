<script lang="ts">
	import { page } from '$app/state';
	import Migas from '$lib/components/Migas.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import Insignia from '$lib/components/Insignia.svelte';
	import CarruselFotos from '$lib/components/CarruselFotos.svelte';
	import BarraAcciones from '$lib/components/BarraAcciones.svelte';
	import HiloComentarios from '$lib/components/HiloComentarios.svelte';
	import { img, fechaRelativa, fechaLegible, social, type Comentario } from '$lib/api';
	import { registrar } from '$lib/metricas';
	import { noticia, tarjeta as recorteTarjeta } from '$lib/seo';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const p = $derived(data.publicacion);
	const perfil = $derived(`/noticias/perfil/${p.cuenta.alias}`);

	/**
	 * Abrir la ficha es una visita, distinta de la impresión del feed: una
	 * cosa es que la publicación pasara por delante y otra que alguien
	 * decidiera entrar. El panel del estudio enseña las dos por separado
	 * porque significan cosas distintas.
	 */
	$effect(() => {
		registrar({ tipo: 'visita', recurso: 'publicacion', id: p.slug, origen: 'ficha' });
	});

	const parrafos = $derived(
		p.tipo === 'nota' ? p.cuerpo.split(/\n{2,}/).filter((t) => t.trim().length > 0) : []
	);

	let comentarios = $state<Comentario[]>(data.comentarios);
	let cursorComentarios = $state<number | null>(data.siguienteCursorComentarios);
	let cargandoComentarios = $state(false);
	$effect(() => {
		comentarios = data.comentarios;
		cursorComentarios = data.siguienteCursorComentarios;
	});

	async function masComentarios() {
		if (cargandoComentarios || cursorComentarios === null) return;
		cargandoComentarios = true;
		try {
			const pagina = await social.comentarios(fetch, p.slug, cursorComentarios);
			comentarios = [...comentarios, ...pagina.data];
			cursorComentarios = pagina.meta.siguiente_cursor;
		} finally {
			cargandoComentarios = false;
		}
	}

	/**
	 * La fotografía recortada a 1200×630 para servir de tarjeta al
	 * compartir. Sin foto propia, la genérica de la sección.
	 */
	const tarjeta = $derived(recorteTarjeta(p.imagen ? img(p.imagen, 1600) : null) ?? '/img/og/noticias.jpg');
	const tituloOg = $derived(p.tipo === 'nota' ? p.titulo : p.pie);
</script>

<Seo
	titulo={tituloOg}
	descripcion={p.tipo === 'nota' ? p.resumen : p.pie}
	imagen={tarjeta}
	imagenAlt={p.imagen && !p.imagen.altPendiente ? p.imagen.alt : undefined}
	tipo="article"
	articulo={{ publicada: p.fecha, modificada: p.fecha, seccion: 'Noticias municipales' }}
	datos={p.tipo === 'nota'
		? [noticia(page.url, { slug: p.slug, titulo: p.titulo, resumen: p.resumen, fecha: p.fecha, imagen: tarjeta })]
		: []}
/>

<article class="contenedor py-8 md:py-12">
	<Migas
		tramos={[
			{ texto: 'Inicio', href: '/' },
			{ texto: 'Noticias', href: '/noticias' },
			{ texto: tituloOg || 'Publicación' }
		]}
	/>

	<div class="mx-auto max-w-xl">
		<header class="flex items-center gap-2.5 px-3 py-2.5">
			<a href={perfil} class="shrink-0"><Avatar cuenta={p.cuenta} tamano={34} /></a>
			<div class="min-w-0 flex-1">
				<p class="flex min-w-0 items-center gap-1 text-[0.88rem] leading-tight">
					<a href={perfil} class="truncate font-bold text-[var(--texto)] no-underline hover:underline">
						{p.cuenta.nombre}
					</a>
					{#if p.cuenta.verificada}<Insignia tamano={14} />{/if}
				</p>

				{#if p.ubicacion}
					<p class="truncate text-[0.74rem] leading-tight text-[var(--texto-suave)]">{p.ubicacion.nombre}</p>
				{/if}
			</div>
		</header>

		{#if p.imagenes.length}
			<CarruselFotos imagenes={p.imagenes} prioridad />
		{/if}

		<BarraAcciones publicacion={p} />

		<div class="px-3 pt-1.5">
			{#if p.tipo === 'nota'}
				<h1 class="display text-[1.3rem]">{p.titulo}</h1>
				<div class="mt-3">
					{#each parrafos as texto, i (i)}
						<p class="mb-4 leading-[1.75] text-[var(--texto-suave)]">{texto}</p>
					{/each}
				</div>
			{:else if p.pie}
				<p class="leading-relaxed">
					<a href={perfil} class="font-bold text-[var(--texto)] no-underline hover:underline">{p.cuenta.alias}</a>
					{p.pie}
				</p>
			{/if}

			<!--
				Las direcciones etiquetadas. Sólo cuentas municipales, nunca
				personas: etiquetar a un vecino en una fotografía oficial es
				publicar su nombre junto a su cara sin que lo haya pedido.
			-->
			{#if p.etiquetadas?.length}
				<p class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8rem] text-[var(--texto-suave)]">
					<span>Con</span>
					{#each p.etiquetadas as e (e.alias)}
						<a
							href="/noticias/perfil/{e.alias}"
							class="font-semibold text-[var(--enlace)] no-underline hover:underline"
						>
							{e.nombre}
						</a>
					{/each}
				</p>
			{/if}

			<time
				datetime={p.fecha ?? undefined}
				title={fechaLegible(p.fecha)}
				class="mt-2 block text-[0.72rem] tracking-wide text-[var(--texto-suave)] uppercase"
			>
				{fechaRelativa(p.fecha)}
			</time>
		</div>

		<div class="mt-2 border-t border-[var(--borde)]">
			<HiloComentarios
				slug={p.slug}
				{comentarios}
				total={p.comentarios_contador}
				permiteComentarios={p.permite_comentarios}
			/>

			{#if cursorComentarios !== null}
				<div class="px-3 pb-4">
					<button
						type="button"
						onclick={masComentarios}
						aria-disabled={cargandoComentarios}
						class="text-[0.85rem] font-semibold text-[var(--color-selva-800)] hover:underline"
					>
						{cargandoComentarios ? 'Cargando…' : 'Ver más comentarios'}
					</button>
				</div>
			{/if}
		</div>
	</div>

	<nav class="mx-auto mt-8 max-w-xl text-center">
		<a
			href={perfil}
			class="inline-flex min-h-11 items-center gap-2 border border-[var(--borde)] px-5 text-[0.9rem] font-semibold no-underline transition-colors hover:border-[var(--marca)]"
		>
			Ver más de {p.cuenta.nombre}
		</a>
	</nav>
</article>
