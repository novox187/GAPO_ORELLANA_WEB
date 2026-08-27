<script lang="ts">
	import CabeceraCanton from '$lib/components/CabeceraCanton.svelte';
	import HermanasCanton from '$lib/components/HermanasCanton.svelte';
	import { revelar } from '$lib/acciones/revelar';
	import { img } from '$lib/api';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	/**
	 * La fuente publica los nombres en mayúsculas y con el tratamiento
	 * pegado ("SR.VICTOR VICENTE RUIZ QUIÑONEZ"). Se separan el título y el
	 * nombre para poder componerlos con jerarquía tipográfica en vez de
	 * gritar la línea entera.
	 */
	const TRATAMIENTOS = /^(SR\.?A?|SRA\.?|ING\.?|TLGO\.?|LCDO\.?|LCDA\.?|AB\.?|DR\.?A?|MSC\.?|ECON\.?|ARQ\.?)\s*/i;

	function partir(nombre: string) {
		const m = nombre.match(TRATAMIENTOS);
		const tratamiento = m ? m[0].trim().replace(/\.$/, '.') : '';
		const resto = m ? nombre.slice(m[0].length) : nombre;
		return { tratamiento, nombre: resto.trim() };
	}
</script>

<svelte:head>
	<title>Concejo Municipal — El cantón — Francisco de Orellana</title>
	<meta
		name="description"
		content="Los {data.concejales.length} concejales del Gobierno Autónomo Descentralizado Municipal de Francisco de Orellana."
	/>
</svelte:head>

<CabeceraCanton
	titulo="Concejo Municipal"
	entradilla="El órgano legislativo del cantón: aprueba las ordenanzas, fiscaliza la gestión y representa a la ciudadanía."
	picto={data.entrada.picto}
	fondo={data.entrada.fondo}
	tinta={data.entrada.tinta}
/>

<div class="contenedor py-10 md:py-14">
	<h2 class="display text-[1.35rem] md:text-[1.6rem]">
		{data.concejales.length} concejales
	</h2>
	<p class="mt-2 max-w-xl text-[0.9rem] leading-relaxed text-[var(--texto-suave)]">
		Las sesiones del Concejo se convocan públicamente; las convocatorias y las ordenanzas
		aprobadas están en Transparencia.
	</p>

	<ul class="mt-7 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.concejales as c, i (c.nombre)}
			{@const p = partir(c.nombre)}
			<li>
				<article
					use:revelar={{ retraso: (i % 3) * 70 }}
					class="revelable flex h-full flex-col border border-[var(--borde)] bg-[var(--superficie-elevada)]"
				>
					{#if c.foto}
						<img
							src={img(c.foto, 400)}
							alt="Retrato de {p.nombre}"
							class="aspect-[4/3] w-full bg-[var(--superficie-alt)] object-cover object-top"
							loading={i < 3 ? 'eager' : 'lazy'}
							decoding="async"
						/>
					{/if}
					<div class="flex flex-1 flex-col justify-between gap-3 p-5">
						<div>
							{#if p.tratamiento}
								<span class="text-[0.68rem] font-bold tracking-[0.14em] text-[var(--texto-suave)] uppercase">
									{p.tratamiento}
								</span>
							{/if}
							<h3 class="mt-1 text-[1rem] leading-snug font-bold">{p.nombre}</h3>
						</div>
						<span class="h-1 w-10 bg-[var(--color-achiote-500)]" aria-hidden="true"></span>
					</div>
				</article>
			</li>
		{/each}
	</ul>

	<div class="mt-9 flex flex-wrap gap-1.5">
		<a
			href="/transparencia/convocatorias"
			class="inline-flex min-h-12 items-center bg-[var(--color-achiote-500)] px-5 text-[0.9rem] font-bold text-[var(--color-carbon-900)] no-underline"
		>
			Convocatorias a sesión
		</a>
		<a
			href="/transparencia/ordenanzas"
			class="inline-flex min-h-12 items-center border-2 border-[var(--borde)] px-5 text-[0.9rem] font-bold no-underline"
		>
			Ordenanzas aprobadas
		</a>
	</div>
</div>

<HermanasCanton actual="concejo" />
