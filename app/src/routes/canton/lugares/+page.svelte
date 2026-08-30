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
	titulo="Lugares por visitar"
	descripcion="Los {data.lugares.length} lugares por visitar del cantón Francisco de Orellana: Supay Kucha, Amaru Yaya, Yasuní Land, la laguna de Añangu y más."
	imagen="/img/og/canton.jpg"
/>

<CabeceraCanton
	titulo="Lugares por visitar"
	entradilla="Lagunas, comunidades kichwa y reservas a menos de una hora de El Coca. Cada ficha dice dónde está y cómo llegar."
	picto={data.entrada.picto}
	fondo={data.entrada.fondo}
	tinta={data.entrada.tinta}
	imagen={data.entrada.imagen ?? ''}
	alt=""
/>

<!--
	Índice de salto. Con diez lugares en una columna de móvil, la lista
	entera mide varias pantallas; esto deja elegir destino sin recorrerla.
	Es scroll horizontal, no un desplegable, para que se vean todos los
	nombres de un vistazo.
-->
<nav class="indice" aria-label="Ir a un lugar">
	<ul class="contenedor flex gap-1.5 overflow-x-auto py-3 [scrollbar-width:none]">
		{#each data.lugares as l (l.nombre)}
			<li class="shrink-0">
				<a
					href="#{encodeURIComponent(l.nombre)}"
					class="salto inline-flex min-h-10 items-center border border-[var(--borde)] px-3 text-[0.82rem] font-semibold whitespace-nowrap no-underline"
				>
					{l.nombre}
				</a>
			</li>
		{/each}
	</ul>
</nav>

<div class="contenedor py-10 md:py-14">
	<p class="mb-6 text-sm font-semibold text-[var(--texto-suave)]">
		{data.lugares.length} lugares en el cantón
	</p>

	<ul class="flex flex-col gap-1.5">
		{#each data.lugares as l, i (l.nombre)}
			<li id={encodeURIComponent(l.nombre)} class="destino-ancla">
				<article
					use:revelar={{ retraso: (i % 3) * 70 }}
					class="revelable grid gap-0 border border-[var(--borde)] bg-[var(--superficie-elevada)] sm:grid-cols-[13rem_1fr] lg:grid-cols-[17rem_1fr]"
				>
					{#if l.imagen}
						<!--
							La postal de la campaña ya lleva el nombre del lugar
							rotulado encima, así que aquí es imagen decorativa: el
							nombre va como texto real, que es lo que lee un buscador
							y un lector de pantalla.
						-->
						<img
							src={img(l.imagen, 400)}
							alt=""
							class="foto aspect-[4/3] w-full object-cover sm:aspect-auto sm:h-full"
							loading={i < 2 ? 'eager' : 'lazy'}
							decoding="async"
						/>
					{/if}

					<div class="min-w-0 p-5 sm:p-6 md:p-7">
						<span
							class="cifra-tabular text-[0.7rem] font-bold tracking-[0.16em] text-[var(--texto-suave)]"
							aria-hidden="true"
						>
							{String(i + 1).padStart(2, '0')}
						</span>
						<h2 class="display mt-1.5 text-[clamp(1.2rem,3vw,1.65rem)] leading-snug">
							{l.nombre}
						</h2>

						{#if l.ubicacion}
							<p class="mt-3 flex items-start gap-2.5 text-[0.88rem] leading-relaxed">
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									aria-hidden="true"
									class="mt-0.5 shrink-0 text-[var(--marca)]"
								>
									<path
										d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z"
										stroke="currentColor"
										stroke-width="2"
										stroke-linejoin="round"
									/>
									<circle cx="12" cy="10" r="2.4" stroke="currentColor" stroke-width="2" />
								</svg>
								<span>
									<span class="sr-only">Ubicación: </span>
									{l.ubicacion}
								</span>
							</p>
						{/if}

						{#if l.atractivos}
							<p class="mt-3 max-w-2xl text-[0.9rem] leading-relaxed text-[var(--texto-suave)]">
								{l.atractivos}
							</p>
						{/if}
					</div>
				</article>
			</li>
		{/each}
	</ul>
</div>

<HermanasCanton actual="lugares" />

<style>
	.indice {
		position: sticky;
		top: var(--alto-barra);
		z-index: 20;
		background: var(--superficie);
		border-bottom: 1px solid var(--borde);
	}

	.salto {
		background: var(--superficie-elevada);
		color: var(--texto);
		transition: border-color 0.18s ease-out;
	}

	.salto:hover,
	.salto:focus-visible {
		border-color: var(--marca);
	}

	/*
	   El ancla tiene que quedar por debajo de la cabecera y del índice, que
	   son pegajosos; sin esto el salto deja el título tapado.
	*/
	.destino-ancla {
		scroll-margin-top: calc(var(--alto-barra) + 4rem);
	}

	.foto {
		transition: transform 0.5s var(--ease-cine);
	}

	@media (prefers-reduced-motion: reduce) {
		.salto,
		.foto {
			transition: none;
		}
	}
</style>
