<script lang="ts">
	import CabeceraCanton from '$lib/components/CabeceraCanton.svelte';
	import HermanasCanton from '$lib/components/HermanasCanton.svelte';
	import { img } from '$lib/api';
	import Seo from '$lib/components/Seo.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<Seo
	titulo="Rutas turísticas"
	descripcion="Recorridos turísticos por el cantón Francisco de Orellana y sus comunidades, pensados para hacer en un día."
	imagen="/img/og/canton.jpg"
/>

<CabeceraCanton
	titulo="Rutas turísticas"
	entradilla="Recorridos por el cantón y sus comunidades, pensados para hacer en un día."
	picto={data.entrada.picto}
	fondo={data.entrada.fondo}
	tinta={data.entrada.tinta}
	imagen={data.entrada.imagen ?? ''}
	alt=""
/>

<div class="contenedor py-10 md:py-14">
	{#if data.mapa}
		<!--
			El municipio publica la ruta como una sola infografía. Se muestra
			a tamaño útil y no recortada: en el diseño anterior caía dentro de
			una rejilla de miniaturas cuadradas donde el texto del mapa era
			ilegible.
		-->
		<figure class="mx-auto max-w-2xl">
			<div class="tesela border border-[var(--borde)] bg-white p-3 sm:p-5">
				<img
					src={img(data.mapa, 800)}
					alt="Mapa de la ruta turística por el cantón Francisco de Orellana"
					class="w-full object-contain"
					fetchpriority="high"
				/>
			</div>
			<figcaption class="mt-3 text-[0.85rem] leading-relaxed text-[var(--texto-suave)]">
				Recorrido sugerido publicado por la Dirección de Turismo.
			</figcaption>
		</figure>
	{/if}

	<!--
		La página de rutas del municipio no trae más que el mapa. En vez de
		dejar un final vacío, se enlaza a los lugares concretos, que es lo
		que alguien que llega aquí está buscando de verdad.
	-->
	<section class="mt-12 border-t border-[var(--borde)] pt-10">
		<h2 class="display text-[1.35rem] md:text-[1.6rem]">Los lugares de la ruta, uno a uno</h2>
		<p class="mt-2 max-w-xl leading-relaxed text-[var(--texto-suave)]">
			Cada parada tiene su ficha con la ubicación exacta, cómo llegar y qué se puede hacer allí.
		</p>
		<a
			href="/canton/lugares"
			class="mt-5 inline-flex min-h-12 items-center gap-2 bg-[var(--color-achiote-500)] px-5 text-[0.92rem] font-bold text-[var(--color-carbon-900)] no-underline"
		>
			Ver los lugares por visitar
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<path
					d="M5 12h14m-6-6 6 6-6 6"
					stroke="currentColor"
					stroke-width="2.6"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</a>
	</section>
</div>

<HermanasCanton actual="rutas" />
