<script lang="ts">
	import Mosaico from '$lib/components/Mosaico.svelte';
	import Pictograma, { type NombrePictograma } from '$lib/components/Pictograma.svelte';
	import { img, fechaLegible } from '$lib/api';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const principal = $derived(data.noticias[0]);
	const secundarias = $derived(data.noticias.slice(1));

	// Cifras verificadas en /datos_canton/ del sitio municipal (VII Censo).
	const cifras = [
		{ valor: '72.795', etiqueta: 'habitantes' },
		{ valor: '7.047', etiqueta: 'km² de territorio' },
		{ valor: '26°', etiqueta: 'temperatura media' },
		{ valor: '1969', etiqueta: 'cantonización' }
	];

	// Accesos por intención, con los pictogramas oficiales del municipio.
	const puertas: {
		href: string;
		titulo: string;
		texto: string;
		picto: NombrePictograma;
		fondo: string;
		tinta: string;
	}[] = [
		{
			href: '/tramites?categoria=negocios',
			titulo: 'Patentes e impuestos',
			texto: 'Permisos de funcionamiento y valores municipales.',
			picto: 'tramitesciudadanos',
			fondo: 'bg-[var(--color-selva-600)]',
			tinta: 'text-white'
		},
		{
			href: '/transparencia',
			titulo: 'Transparencia',
			texto: 'LOTAIP, ordenanzas y rendición de cuentas.',
			picto: 'rendiciondecuentas',
			fondo: 'bg-[var(--color-carbon-600)]',
			tinta: 'text-white'
		},
		{
			href: '/canton',
			titulo: 'Conoce el cantón',
			texto: 'Historia, símbolos, turismo y territorio.',
			picto: 'turismo',
			fondo: 'bg-[var(--color-achiote-500)]',
			tinta: 'text-[var(--color-carbon-900)]'
		},
		{
			href: '/noticias',
			titulo: 'Obras y noticias',
			texto: 'La gestión municipal, semana a semana.',
			picto: 'obras',
			fondo: 'bg-[var(--color-selva-800)]',
			tinta: 'text-white'
		}
	];
</script>

<svelte:head>
	<title>El Coca, entrada al Yasuní — Alcaldía de Francisco de Orellana</title>
	<meta
		name="description"
		content="El Coca, entrada al Yasuní: Rincón Mágico del Ecuador. Trámites, obras, noticias y transparencia del cantón Francisco de Orellana."
	/>
</svelte:head>

<Mosaico totalTramites={data.totalTramites} />

<!-- ── Accesos por intención: teselas de color con pictograma oficial ── -->
<section class="contenedor pb-16 md:pb-24">
	<div class="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
		{#each puertas as p (p.href)}
			<a
				href={p.href}
				class="tesela-diagonal group flex flex-col justify-between gap-8 p-7 no-underline transition-[filter] duration-200 hover:brightness-110 {p.fondo} {p.tinta}"
			>
				<Pictograma nombre={p.picto} clase="h-14 w-auto opacity-95" />
				<div>
					<h2 class="display text-[1.25rem]">{p.titulo}</h2>
					<p class="mt-1.5 text-[0.88rem] leading-relaxed opacity-85">{p.texto}</p>
				</div>
			</a>
		{/each}
	</div>
</section>

<!-- ── Cifras del cantón, con el contorno del territorio como filigrana ── -->
<section class="relative overflow-hidden border-y border-[var(--borde)] bg-[var(--superficie-alt)] py-14 md:py-16">
	<Pictograma
		nombre="canton"
		clase="pointer-events-none absolute -right-10 -bottom-16 hidden h-[26rem] w-auto text-[var(--color-selva-800)] opacity-[0.06] md:block"
	/>
	<div class="contenedor relative grid grid-cols-2 gap-y-10 md:grid-cols-4">
		{#each cifras as c (c.etiqueta)}
			<div class="border-l-4 border-[var(--color-achiote-500)] pl-4">
				<p class="display text-[clamp(2.2rem,4.6vw,3.2rem)] text-[var(--color-selva-800)]">
					{c.valor}
				</p>
				<p class="mt-1 text-sm font-medium text-[var(--texto-suave)]">{c.etiqueta}</p>
			</div>
		{/each}
	</div>
</section>

<!-- ── Trámites más consultados: riel horizontal ── -->
<section class="py-16 md:py-24">
	<div class="contenedor mb-8 flex flex-wrap items-end justify-between gap-4">
		<h2 class="display text-[clamp(1.8rem,3.6vw,2.6rem)]">Lo que más se consulta</h2>
		<a
			href="/tramites"
			class="text-sm font-bold text-[var(--color-selva-800)] no-underline hover:underline"
		>
			Ver los {data.totalTramites} trámites
		</a>
	</div>

	<ul class="contenedor flex snap-x snap-mandatory gap-1.5 overflow-x-auto pb-4 [scrollbar-width:thin]">
		{#each data.destacados as t, i (t.slug)}
			<li class="w-[19rem] shrink-0 snap-start">
				<a
					href="/tramites/{t.slug}"
					class="flex h-full flex-col border border-[var(--borde)] bg-[var(--superficie-elevada)] p-6 no-underline transition-colors hover:border-[var(--color-selva-800)]"
				>
					<!-- Mini tesela: ancla cada trámite al sistema cromático de la marca -->
					<span
						class="mb-4 block h-1.5 w-10 {['bg-[var(--color-selva-800)]', 'bg-[var(--color-achiote-500)]', 'bg-[var(--color-carbon-600)]', 'bg-[var(--color-selva-600)]', 'bg-[var(--color-selva-400)]', 'bg-[var(--color-achiote-600)]'][i % 6]}"
						aria-hidden="true"
					></span>
					<span class="text-[0.68rem] font-bold tracking-[0.14em] text-[var(--texto-suave)] uppercase">
						{t.direccion.nombre}
					</span>
					<h3 class="mt-3 leading-snug font-bold text-[var(--texto)]">{t.nombre}</h3>
					<p class="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--texto-suave)]">
						{t.resumen}
					</p>
					<span class="mt-auto pt-5 text-sm font-bold text-[var(--color-selva-800)]">
						Ver requisitos
					</span>
				</a>
			</li>
		{/each}
	</ul>
</section>

<!-- ── Actualidad ── -->
{#if principal}
	<section class="contenedor pb-20 md:pb-28">
		<div class="mb-8 flex flex-wrap items-end justify-between gap-4">
			<h2 class="display text-[clamp(1.8rem,3.6vw,2.6rem)]">Actualidad</h2>
			<a
				href="/noticias"
				class="text-sm font-bold text-[var(--color-selva-800)] no-underline hover:underline"
			>
				Todas las noticias
			</a>
		</div>

		<div class="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:gap-14">
			<article>
				<a href="/noticias/{principal.slug}" class="group block no-underline">
					{#if principal.imagen}
						<div class="tesela">
							<img
								src={img(principal.imagen, 1600)}
								alt={principal.imagen.altPendiente ? '' : principal.imagen.alt}
								class="aspect-[16/10] w-full object-cover transition-transform duration-500 ease-[var(--ease-suave)] group-hover:scale-[1.02]"
								loading="lazy"
							/>
						</div>
					{/if}
					<p class="mt-5 text-xs font-semibold text-[var(--texto-suave)]">
						{fechaLegible(principal.fecha)}
					</p>
					<h3
						class="display mt-2 text-[clamp(1.4rem,2.4vw,2rem)] group-hover:text-[var(--color-selva-800)]"
					>
						{principal.titulo}
					</h3>
					<p class="mt-3 max-w-xl leading-relaxed text-[var(--texto-suave)]">{principal.resumen}</p>
				</a>
			</article>

			<ul class="flex flex-col divide-y divide-[var(--borde)]">
				{#each secundarias as n (n.slug)}
					<li class="py-5 first:pt-0">
						<a href="/noticias/{n.slug}" class="group flex gap-4 no-underline">
							{#if n.imagen}
								<img
									src={img(n.imagen, 400)}
									alt=""
									aria-hidden="true"
									class="h-20 w-28 shrink-0 object-cover"
									loading="lazy"
								/>
							{/if}
							<div>
								<p class="text-xs text-[var(--texto-suave)]">{fechaLegible(n.fecha)}</p>
								<h3 class="mt-1 leading-snug font-bold group-hover:text-[var(--color-selva-800)]">
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
