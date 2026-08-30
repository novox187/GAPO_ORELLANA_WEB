<script lang="ts">
	import HeroPortada from '$lib/components/HeroPortada.svelte';
	import PuertasIntencion from '$lib/components/PuertasIntencion.svelte';
	import CifrasCanton from '$lib/components/CifrasCanton.svelte';
	import LlamadaAsistente from '$lib/components/LlamadaAsistente.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { revelar } from '$lib/acciones/revelar';
	import { img, fechaLegible } from '$lib/api';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const principal = $derived(data.noticias[0]);
	const secundarias = $derived(data.noticias.slice(1, 5));

	/** Los seis colores de la banda del logotipo, en orden, para el riel. */
	const TESELAS = [
		'bg-[var(--color-selva-800)]',
		'bg-[var(--color-achiote-500)]',
		'bg-[var(--color-carbon-600)]',
		'bg-[var(--color-selva-600)]',
		'bg-[var(--color-selva-400)]',
		'bg-[var(--color-achiote-600)]'
	];
</script>

<Seo
	titulo="El Coca, entrada al Yasuní"
	descripcion="Trámites, obras, noticias y transparencia del cantón Francisco de Orellana (El Coca), en la Amazonía ecuatoriana. Atención ciudadana en línea."
/>

<HeroPortada />

<PuertasIntencion totalTramites={data.totalTramites} totalNoticias={data.totalNoticias} />

<LlamadaAsistente />

<CifrasCanton />

<!-- ══ Trámites más consultados: riel horizontal, numerado como un índice ══ -->
<section class="py-16 md:py-24" aria-labelledby="titulo-tramites">
	<div class="contenedor mb-8 flex flex-wrap items-end justify-between gap-4 md:mb-10">
		<div>
			<p class="text-[0.7rem] font-bold tracking-[0.2em] text-[var(--acento-texto)] uppercase">
				Atajo directo
			</p>
			<h2 id="titulo-tramites" class="display mt-2 text-[clamp(1.8rem,4vw,2.8rem)]">
				Lo que más se consulta
			</h2>
		</div>
		<a
			href="/tramites"
			class="inline-flex min-h-11 items-center gap-2 border-b-2 border-[var(--marca)] text-[0.9rem] font-bold text-[var(--enlace)] no-underline"
		>
			Ver los {data.totalTramites} trámites
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
	</div>

	<!--
		Riel con desbordamiento horizontal, no carrusel: se desplaza con el
		dedo, con la rueda y con el teclado (cada tarjeta es un enlace, así
		que Tab la trae sola al viewport). Sin controles propios que
		duplicarían lo que el navegador ya hace bien.
	-->
	<ul class="contenedor flex snap-x snap-mandatory gap-1.5 overflow-x-auto pb-4 [scrollbar-width:thin]">
		{#each data.destacados as t, i (t.slug)}
			<li class="w-[18rem] shrink-0 snap-start sm:w-[21rem]">
				<a
					href="/tramites/{t.slug}"
					class="tarjeta group flex h-full flex-col border border-[var(--borde)] bg-[var(--superficie-elevada)] p-6 no-underline sm:p-7"
				>
					<div class="flex items-start justify-between gap-4">
						<span
							class="display cifra-tabular text-[2.6rem] leading-none text-[var(--indice)] transition-colors duration-300"
							aria-hidden="true"
						>
							{String(i + 1).padStart(2, '0')}
						</span>
						<span class="mt-2 block h-1.5 w-10 shrink-0 {TESELAS[i % 6]}" aria-hidden="true"></span>
					</div>

					<span
						class="mt-6 text-[0.66rem] font-bold tracking-[0.14em] text-[var(--texto-suave)] uppercase"
					>
						{t.direccion.nombre}
					</span>
					<h3 class="mt-2.5 text-[1.05rem] leading-snug font-bold text-[var(--texto)]">
						{t.nombre}
					</h3>
					<p class="mt-2 line-clamp-3 text-[0.86rem] leading-relaxed text-[var(--texto-suave)]">
						{t.resumen}
					</p>

					<span class="mt-auto flex items-center gap-2 pt-6 text-[0.85rem] font-bold text-[var(--enlace)]">
						Ver requisitos
						<svg
							width="15"
							height="15"
							viewBox="0 0 24 24"
							fill="none"
							aria-hidden="true"
							class="flecha-tarjeta"
						>
							<path
								d="M5 12h14m-6-6 6 6-6 6"
								stroke="currentColor"
								stroke-width="2.6"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</span>
				</a>
			</li>
		{/each}
	</ul>
</section>

<!-- ══ Actualidad ══ -->
{#if principal}
	<section class="contenedor pb-16 md:pb-24" aria-labelledby="titulo-actualidad">
		<div class="mb-8 flex flex-wrap items-end justify-between gap-4 border-t border-[var(--borde)] pt-10 md:mb-10">
			<div>
				<p class="flex items-center gap-2 text-[0.7rem] font-bold tracking-[0.2em] text-[var(--acento-texto)] uppercase">
					<span class="punto inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-selva-600)]"></span>
					Al día
				</p>
				<h2 id="titulo-actualidad" class="display mt-2 text-[clamp(1.8rem,4vw,2.8rem)]">
					Actualidad del cantón
				</h2>
			</div>
			<a
				href="/noticias"
				class="inline-flex min-h-11 items-center gap-2 border-b-2 border-[var(--marca)] text-[0.9rem] font-bold text-[var(--enlace)] no-underline"
			>
				Todas las noticias
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
		</div>

		<div class="grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-14">
			<article use:revelar class="revelable">
				<a href="/noticias/{principal.slug}" class="grupo-nota group block no-underline">
					{#if principal.imagen}
						<div class="tesela">
							<img
								src={img(principal.imagen, 1600)}
								alt={principal.imagen.altPendiente ? '' : principal.imagen.alt}
								class="foto-nota aspect-[16/10] w-full object-cover"
								loading="lazy"
								decoding="async"
							/>
						</div>
					{/if}
					<p class="mt-5 flex items-center gap-3 text-xs font-semibold text-[var(--texto-suave)]">
						<span class="h-1 w-6 bg-[var(--color-achiote-500)]" aria-hidden="true"></span>
						{fechaLegible(principal.fecha)}
					</p>
					<h3
						class="display mt-2.5 text-[clamp(1.4rem,2.6vw,2.1rem)] transition-colors group-hover:text-[var(--enlace)]"
					>
						{principal.titulo}
					</h3>
					<p class="mt-3 max-w-xl leading-relaxed text-[var(--texto-suave)]">{principal.resumen}</p>
				</a>
			</article>

			<ul class="flex flex-col divide-y divide-[var(--borde)]">
				{#each secundarias as n, i (n.slug)}
					<li use:revelar={{ retraso: 120 + i * 80 }} class="revelable py-5 first:pt-0">
						<a href="/noticias/{n.slug}" class="grupo-nota group flex gap-4 no-underline">
							{#if n.imagen}
								<div class="tesela h-20 w-28 shrink-0 sm:h-24 sm:w-32">
									<img
										src={img(n.imagen, 400)}
										alt=""
										aria-hidden="true"
										class="foto-nota h-full w-full object-cover"
										loading="lazy"
										decoding="async"
									/>
								</div>
							{/if}
							<div class="min-w-0">
								<p class="text-xs text-[var(--texto-suave)]">{fechaLegible(n.fecha)}</p>
								<h3 class="mt-1 leading-snug font-bold transition-colors group-hover:text-[var(--enlace)]">
									{n.titulo}
								</h3>
							</div>
						</a>
					</li>
				{/each}
			</ul>
		</div>
	</section>
{/if}

<!-- ══ Cierre: el cantón detrás del trámite ══ -->
<section class="cierre" aria-labelledby="titulo-cierre">
	<img
		src="/img/portada/mirador-anangu.webp"
		srcset="/img/portada/mirador-anangu-960.webp 960w, /img/portada/mirador-anangu.webp 1920w"
		sizes="100vw"
		alt=""
		width="1920"
		height="905"
		class="cierre-foto"
		loading="lazy"
		decoding="async"
	/>
	<div class="cierre-velo" aria-hidden="true"></div>

	<div class="contenedor relative grid gap-8 py-16 md:py-24 lg:grid-cols-[1.1fr_1fr] lg:items-end lg:gap-16">
		<div use:revelar class="revelable">
			<p class="text-[0.7rem] font-bold tracking-[0.22em] text-[var(--color-achiote-400)] uppercase">
				Conoce el cantón
			</p>
			<h2 id="titulo-cierre" class="titular-cartel mt-4 text-[clamp(2rem,5.4vw,3.9rem)] text-white">
				Tres ríos, siete mil<br class="hidden sm:inline" /> kilómetros de selva
			</h2>
			<p class="mt-5 max-w-lg leading-relaxed text-white/80">
				El Napo, el Coca y el Payamino se juntan aquí. Alrededor, las comunidades kichwa de Añangu,
				Yana Rumi y Pompeya, el centro de rescate Coca Zoo y la puerta al Parque Nacional Yasuní.
			</p>
		</div>

		<ul use:revelar={{ retraso: 140 }} class="revelable grid gap-1.5 sm:grid-cols-2">
			{#each [{ h: '/canton/lugares', t: 'Lugares por visitar', d: 'Supay Kucha, Amaru Yaya, Yasuní Land' }, { h: '/canton/rutas', t: 'Rutas turísticas', d: 'Recorridos por el cantón' }, { h: '/canton/historia-simbolos', t: 'Historia y símbolos', d: 'Escudo, bandera e himno' }, { h: '/canton/coca-antiguo', t: 'El Coca antiguo', d: 'Sesenta años en fotografías' }] as e (e.h)}
				<li>
					<a
						href={e.h}
						class="enlace-cierre flex h-full flex-col justify-between gap-6 border border-white/20 p-5 no-underline"
					>
						<span class="text-[0.98rem] leading-snug font-bold text-white">{e.t}</span>
						<span class="text-[0.78rem] leading-snug text-white/75">{e.d}</span>
					</a>
				</li>
			{/each}
		</ul>
	</div>
</section>

<style>
	/* ── Riel de trámites ── */
	.tarjeta {
		transition:
			border-color 0.25s ease-out,
			transform 0.25s var(--ease-cine);
	}

	.tarjeta:hover,
	.tarjeta:focus-visible {
		border-color: var(--marca);
		transform: translateY(-3px);
	}

	/* El número del índice se enciende con la tarjeta: era gris de borde. */
	.tarjeta:hover .display,
	.tarjeta:focus-visible .display {
		color: var(--marca);
	}

	.flecha-tarjeta {
		transition: transform 0.25s var(--ease-cine);
	}

	.tarjeta:hover .flecha-tarjeta,
	.tarjeta:focus-visible .flecha-tarjeta {
		transform: translateX(4px);
	}

	/* ── Fotografías de noticia ── */
	.foto-nota {
		transition: transform 0.6s var(--ease-cine);
	}

	.grupo-nota:hover .foto-nota,
	.grupo-nota:focus-visible .foto-nota {
		transform: scale(1.04);
	}

	/* ── Punto "al día" ── */
	.punto {
		animation: pulso 2.4s ease-in-out infinite;
	}

	/* ── Banda de cierre ── */
	.cierre {
		position: relative;
		isolation: isolate;
		overflow: hidden;
		background: #0a1410;
	}

	.cierre-foto {
		position: absolute;
		inset: 0;
		z-index: -1;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: 50% 42%;
	}

	.cierre-velo {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background:
			linear-gradient(
				100deg,
				rgb(6 14 10 / 0.92) 0%,
				rgb(6 14 10 / 0.78) 30%,
				rgb(6 14 10 / 0.42) 62%,
				rgb(6 14 10 / 0.26) 100%
			),
			linear-gradient(to top, rgb(6 14 10 / 0.55) 0%, transparent 45%);
	}

	.enlace-cierre {
		background: rgb(6 14 10 / 0.6);
		backdrop-filter: blur(3px);
		transition:
			background-color 0.25s ease-out,
			border-color 0.25s ease-out;
	}

	.enlace-cierre:hover,
	.enlace-cierre:focus-visible {
		background: rgb(6 14 10 / 0.85);
		border-color: var(--color-achiote-400);
	}

	@media (prefers-reduced-motion: reduce) {
		.tarjeta,
		.flecha-tarjeta,
		.foto-nota,
		.enlace-cierre {
			transition: none;
		}
		.tarjeta:hover,
		.tarjeta:focus-visible {
			transform: none;
		}
		.grupo-nota:hover .foto-nota,
		.grupo-nota:focus-visible .foto-nota {
			transform: none;
		}
		.punto {
			animation: none;
		}
	}
</style>
