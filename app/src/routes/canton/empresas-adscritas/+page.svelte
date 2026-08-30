<script lang="ts">
	import CabeceraCanton from '$lib/components/CabeceraCanton.svelte';
	import HermanasCanton from '$lib/components/HermanasCanton.svelte';
	import { revelar } from '$lib/acciones/revelar';
	import { img } from '$lib/api';
	import Seo from '$lib/components/Seo.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	/** Los seis colores de la banda del logotipo, para el canto de cada ficha. */
	const TINTES = [
		'var(--color-selva-800)',
		'var(--color-achiote-500)',
		'var(--color-selva-600)',
		'var(--color-carbon-600)',
		'var(--color-selva-400)'
	];
</script>

<Seo
	titulo="Empresas adscritas"
	descripcion="Las entidades adscritas al Municipio de Francisco de Orellana: Cuerpo de Bomberos, MACCO, Terminal Terrestre y más."
	imagen="/img/og/canton.jpg"
/>

<CabeceraCanton
	titulo="Empresas adscritas"
	entradilla="Las entidades que dependen del municipio y prestan servicios propios: emergencias, cultura, transporte y protección de derechos."
	picto={data.entrada.picto}
	fondo={data.entrada.fondo}
	tinta={data.entrada.tinta}
/>

<div class="contenedor py-10 md:py-14">
	<ul class="flex flex-col gap-1.5">
		{#each data.entidades as e, i (e.nombre)}
			<li>
				<article
					use:revelar={{ retraso: (i % 3) * 70 }}
					class="ficha revelable relative border border-[var(--borde)] bg-[var(--superficie-elevada)] lg:grid lg:grid-cols-[19rem_1fr]"
					style="--tinte: {TINTES[i % TINTES.length]}"
				>
					<span class="canto" aria-hidden="true"></span>

					{#if e.imagen}
						<img
							src={img(e.imagen, 800)}
							alt=""
							class="aspect-[570/253] w-full bg-[var(--superficie-alt)] object-cover lg:aspect-auto lg:h-full"
							loading={i < 2 ? 'eager' : 'lazy'}
							decoding="async"
						/>
					{/if}

					<div class="min-w-0 py-5 pr-5 pl-6 sm:py-6 sm:pr-6 sm:pl-7">
						<h2 class="display text-[clamp(1.1rem,2.6vw,1.45rem)] leading-snug">{e.nombre}</h2>
						{#each e.texto.split('\n\n') as parrafo (parrafo)}
							<p class="mt-2.5 max-w-2xl text-[0.9rem] leading-relaxed text-[var(--texto-suave)]">
								{parrafo}
							</p>
						{/each}
					</div>
				</article>
			</li>
		{/each}
	</ul>
</div>

<HermanasCanton actual="empresas-adscritas" />

<style>
	.canto {
		position: absolute;
		inset-block: 0;
		left: 0;
		z-index: 1;
		width: 4px;
		background: var(--tinte);
	}
</style>
