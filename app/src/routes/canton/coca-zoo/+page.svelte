<script lang="ts">
	import CabeceraCanton from '$lib/components/CabeceraCanton.svelte';
	import HermanasCanton from '$lib/components/HermanasCanton.svelte';
	import { revelar } from '$lib/acciones/revelar';
	import { img } from '$lib/api';
	import Seo from '$lib/components/Seo.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<Seo
	titulo="Coca Zoo"
	descripcion="Centro de rescate y tenencia de vida silvestre Coca Zoo: 200 animales de 50 especies amazónicas en más de 50 hectáreas."
	imagen="/img/og/canton.jpg"
/>

<CabeceraCanton
	titulo="Coca Zoo"
	entradilla="Centro de rescate de fauna silvestre. Acoge animales separados de su hábitat por la caza ilegal y trabaja para reinsertarlos."
	picto={data.entrada.picto}
	fondo={data.entrada.fondo}
	tinta={data.entrada.tinta}
	imagen={data.entrada.imagen ?? ''}
	alt=""
/>

<div class="contenedor py-10 md:py-14">
	<div class="max-w-2xl">
		{#each data.parrafos as p (p)}
			<p class="mb-4 leading-relaxed md:text-[1.05rem]">{p}</p>
		{/each}
	</div>

	<dl class="mt-8 grid grid-cols-2 gap-px border border-[var(--borde)] bg-[var(--borde)] sm:grid-cols-4">
		{#each [{ v: '2008', e: 'año de creación' }, { v: '200', e: 'animales' }, { v: '50', e: 'especies' }, { v: '50 ha', e: 'de extensión' }] as c (c.e)}
			<div class="bg-[var(--superficie-elevada)] p-4">
				<dt class="text-[0.66rem] font-bold tracking-[0.12em] text-[var(--texto-suave)] uppercase">
					{c.e}
				</dt>
				<dd class="display cifra-tabular mt-1 text-[1.3rem]">{c.v}</dd>
			</div>
		{/each}
	</dl>

	{#if data.fichas.length}
		<h2 class="display mt-12 mb-2 text-[1.35rem] md:text-[1.6rem]">Especies del centro</h2>
		<p class="mb-5 max-w-2xl text-[0.9rem] leading-relaxed text-[var(--texto-suave)]">
			Fichas publicadas por el centro de rescate, con la clasificación y el hábitat de cada
			especie.
		</p>

		<ul class="grid gap-1.5 md:grid-cols-2">
			{#each data.fichas as f, i (f.media.id)}
				<li>
					<figure
						use:revelar={{ retraso: (i % 2) * 70 }}
						class="revelable border border-[var(--borde)] bg-[var(--superficie-elevada)]"
					>
						<img
							src={img(f.media, 800)}
							alt={f.especie ? `Ficha de la especie ${f.especie}` : ''}
							class="w-full bg-white object-contain"
							loading={i < 2 ? 'eager' : 'lazy'}
							decoding="async"
						/>
						{#if f.especie}
							<figcaption class="border-t border-[var(--borde)] px-4 py-3 text-[0.92rem] font-bold">
								{f.especie}
							</figcaption>
						{/if}
					</figure>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<HermanasCanton actual="coca-zoo" />
