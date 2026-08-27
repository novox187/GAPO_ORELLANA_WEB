<script lang="ts">
	import Migas from '$lib/components/Migas.svelte';
	import Pictograma from '$lib/components/Pictograma.svelte';
	import HermanasCanton from '$lib/components/HermanasCanton.svelte';
	import { img } from '$lib/api';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Alcaldía — {data.nombre} — Francisco de Orellana</title>
	<meta
		name="description"
		content="{data.nombre}, {data.cargo}. Principios, misión y visión del Gobierno Autónomo Descentralizado Municipal de Francisco de Orellana."
	/>
</svelte:head>

<div class="contenedor py-8 md:py-12">
	<Migas
		tramos={[
			{ texto: 'Inicio', href: '/' },
			{ texto: 'El cantón', href: '/canton' },
			{ texto: 'Alcaldía' }
		]}
	/>
</div>

<!-- ── Retrato oficial y presentación ── -->
<section class="contenedor pb-16 md:pb-24">
	<div class="grid gap-1.5 lg:grid-cols-[minmax(0,26rem)_1fr]">
		{#if data.retrato}
			<div class="tesela bg-[var(--superficie-alt)]">
				<img
					src={img(data.retrato, 800)}
					alt="{data.nombre}, {data.cargo}"
					class="aspect-[4/5] w-full object-cover object-top lg:aspect-auto lg:h-full"
					fetchpriority="high"
				/>
			</div>
		{/if}

		<div
			class="tesela-diagonal flex flex-col justify-between gap-10 bg-[var(--color-selva-800)] p-8 text-white md:p-12"
		>
			<p class="text-[0.7rem] font-bold tracking-[0.22em] text-[var(--color-achiote-400)] uppercase">
				Alcaldía de Francisco de Orellana
			</p>

			<div>
				<h1 class="display text-[clamp(2rem,5vw,4rem)]">{data.nombre}</h1>
				{#if data.cargo}
					<p class="mt-3 text-[1.05rem] text-white/80">{data.cargo}</p>
				{/if}
			</div>

			<div class="flex flex-wrap gap-1.5">
				<a
					href="/canton/concejo"
					class="inline-flex min-h-11 items-center bg-[var(--color-achiote-500)] px-5 text-sm font-bold text-[var(--color-carbon-900)] no-underline transition-[filter] hover:brightness-95"
				>
					Concejo Municipal
				</a>
				<a
					href="/contacto"
					class="inline-flex min-h-11 items-center border border-white/30 px-5 text-sm font-bold text-white no-underline transition-colors hover:bg-white/10"
				>
					Atención ciudadana
				</a>
			</div>
		</div>
	</div>
</section>

<!-- ── Misión y visión ── -->
{#if data.mision || data.vision}
	<section class="contenedor pb-16 md:pb-24">
		<div class="grid gap-1.5 md:grid-cols-2">
			{#if data.mision}
				<article class="tesela-diagonal bg-[var(--color-carbon-600)] p-8 text-white md:p-10">
					<Pictograma nombre="canton" clase="h-10 w-auto opacity-90" />
					<h2 class="display mt-6 text-[1.5rem]">Misión</h2>
					<p class="mt-3 leading-relaxed text-white/85">{data.mision}</p>
				</article>
			{/if}
			{#if data.vision}
				<article class="tesela-diagonal bg-[var(--color-selva-600)] p-8 text-white md:p-10">
					<Pictograma nombre="turismo" clase="h-10 w-auto opacity-90" />
					<h2 class="display mt-6 text-[1.5rem]">Visión</h2>
					<p class="mt-3 leading-relaxed text-white/85">{data.vision}</p>
				</article>
			{/if}
		</div>
	</section>
{/if}

<!-- ── Principios rectores ── -->
{#if data.principios.length}
	<section class="border-y border-[var(--borde)] bg-[var(--superficie-alt)] py-16 md:py-24">
		<div class="contenedor">
			<header class="mb-10 max-w-2xl">
				<h2 class="display text-[clamp(1.7rem,3.6vw,2.5rem)]">Principios rectores</h2>
				{#if data.intro}
					<p class="mt-3 leading-relaxed text-[var(--texto-suave)]">{data.intro}</p>
				{/if}
			</header>

			<ol class="grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
				{#each data.principios as p, i (p.nombre + i)}
					<li class="border-t-2 border-[var(--color-achiote-500)] pt-4">
						<span class="text-[0.72rem] font-bold tabular-nums text-[var(--texto-suave)]">
							{String(i + 1).padStart(2, '0')}
						</span>
						{#if p.nombre}
							<h3 class="display mt-1 text-[1.15rem] text-[var(--marca-titulo)]">
								{p.nombre}
							</h3>
						{/if}
						<p class="mt-2 text-[0.92rem] leading-relaxed text-[var(--texto-suave)]">
							{p.descripcion}
						</p>
					</li>
				{/each}
			</ol>
		</div>
	</section>
{/if}

<!-- ── Imágenes de apoyo ── -->
{#if data.apoyo.length}
	<section class="contenedor py-16 md:py-24">
		<ul class="grid gap-1.5 sm:grid-cols-3">
			{#each data.apoyo as im (im.id)}
				<li class="tesela">
					<!-- Apoyo visual: sin contenido informativo propio, alt vacío a propósito. -->
					<img
						src={img(im, 800)}
						alt=""
						class="aspect-[4/3] w-full object-cover"
						loading="lazy"
					/>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<HermanasCanton actual="alcaldia" />
