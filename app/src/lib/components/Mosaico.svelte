<script lang="ts">
	import Pictograma from './Pictograma.svelte';

	/**
	 * Héroe en mosaico. Extiende a la página el sistema del logotipo
	 * municipal: teselas planas de color con pictogramas lineales de fauna
	 * y lugares del cantón. Retícula 4x3 exacta en escritorio (12 unidades
	 * para 12 celdas), sin huecos.
	 */
	let { totalTramites }: { totalTramites: number } = $props();
</script>

<svelte:head>
	<!--
		Un fondo CSS lo descubre el navegador tarde (no lo ve el preload
		scanner), lo que penalizaría el LCP en escritorio. El preload con
		media query lo adelanta allí sin afectar al móvil.
	-->
	<link
		rel="preload"
		as="image"
		href="/img/napo-amanecer.jpg"
		media="(min-width: 1024px)"
	/>
</svelte:head>

<section class="contenedor pt-5 pb-14 md:pt-7 md:pb-20">
	<div class="grid gap-1.5 sm:grid-cols-2 lg:h-[34rem] lg:grid-cols-4 lg:grid-rows-3">
		<!-- Titular -->
		<div
			class="tesela-diagonal flex flex-col justify-between bg-[var(--color-selva-800)] p-6 text-white sm:col-span-2 sm:p-7 md:p-9 lg:row-span-2"
		>
			<!--
				Distinción oficial, no una descripción propia: el Ministerio de
				Turismo entregó el reconocimiento Rincón Mágico "El Coca, Entrada
				al Yasuní" el 20 de junio de 2025, en el parque Bocana del
				Payamino (ver /noticias/…-rincon-magico-…-108).
			-->
			<p class="text-[0.7rem] font-bold tracking-[0.22em] text-[var(--color-achiote-400)] uppercase">
				Rincón Mágico del Ecuador
			</p>
			<div>
				<!--
					El salto sólo desde sm: en móvil forzarlo dejaba "Yasuní" huérfano
					en una tercera línea.
				-->
				<!-- A tamaño de cartel el titular sí admite apretarse; en móvil no. -->
				<h1
					class="display text-[clamp(1.65rem,4.4vw,3.6rem)] lg:leading-[1.06] lg:tracking-[-0.02em] lg:[font-stretch:115%]"
				>
					El Coca,<br class="hidden sm:inline" />
					entrada al Yasuní
				</h1>
				<p class="mt-3.5 max-w-md text-[0.92rem] leading-relaxed text-white/85 sm:text-[0.96rem]">
					A las puertas de uno de los parques más megadiversos del planeta. Aquí están los trámites,
					obras y noticias del cantón.
				</p>
			</div>
		</div>

		<!-- Jaguar: fauna emblemática -->
		<div
			class="tesela-diagonal hidden items-center justify-center bg-[var(--color-carbon-600)] p-6 text-white lg:col-start-3 lg:row-start-1 lg:flex"
		>
			<Pictograma nombre="cultura" etiqueta="Jaguar, fauna del cantón" clase="h-full w-auto max-h-28" />
		</div>

		<!-- Contorno del cantón -->
		<div
			class="tesela-diagonal hidden items-center justify-center bg-[var(--color-selva-400)] p-6 text-white lg:col-start-4 lg:row-start-1 lg:flex"
		>
			<Pictograma nombre="canton" etiqueta="Contorno del cantón" clase="h-full w-auto max-h-28" />
		</div>

		<!--
			Fotografía real del río, sólo en escritorio.

			Va como fondo CSS dentro de una media query, no como <img> oculto:
			un <img> con display:none se descarga igual en la mayoría de
			navegadores, y serían 172 KB que el móvil paga por una imagen que
			nunca ve. Con este enfoque no llega a pedirla.
		-->
		<div
			class="tesela foto-rio hidden lg:col-span-2 lg:col-start-3 lg:row-start-2 lg:block"
			role="img"
			aria-label="Amanecer sobre el río Napo, con el puente de El Coca al fondo"
		></div>

		<!-- Acción primaria -->
		<a
			href="/tramites"
			class="tesela-diagonal group flex items-center justify-between gap-4 bg-[var(--color-achiote-500)] p-7 text-[var(--color-carbon-900)] no-underline transition-[filter] duration-200 hover:brightness-95 lg:col-start-1 lg:row-start-3 lg:flex-col lg:items-start lg:justify-between"
		>
			<span>
				<span class="display block text-[1.5rem] leading-tight">Hacer un<br />trámite</span>
				<span class="mt-1.5 block text-[0.82rem] font-semibold opacity-70">
					{totalTramites} disponibles
				</span>
			</span>
			<span class="inline-flex shrink-0 items-center gap-2 text-sm font-bold">
				Empezar
				<svg
					width="17"
					height="17"
					viewBox="0 0 24 24"
					fill="none"
					aria-hidden="true"
					class="transition-transform duration-200 group-hover:translate-x-1"
				>
					<path
						d="M5 12h14m-6-6 6 6-6 6"
						stroke="currentColor"
						stroke-width="2.4"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</span>
		</a>

		<!-- Chontacuro: el sabor amazónico -->
		<div
			class="tesela-diagonal hidden items-center justify-center bg-[var(--color-selva-600)] p-6 text-white lg:col-start-2 lg:row-start-3 lg:flex"
		>
			<Pictograma
				nombre="emprendedores"
				etiqueta="Chontacuro, gastronomía amazónica"
				clase="h-full w-auto max-h-24"
			/>
		</div>

		<!-- Puente del Napo -->
		<div
			class="tesela-diagonal hidden items-center justify-center bg-[var(--color-selva-800)] px-8 text-white lg:col-span-2 lg:col-start-3 lg:row-start-3 lg:flex"
		>
			<Pictograma
				nombre="gacetamunicipal"
				etiqueta="Puente sobre el río Napo"
				clase="w-full max-w-sm"
			/>
		</div>

		<!-- Franja de identidad en móvil -->
		<div class="grid grid-cols-4 gap-1.5 sm:col-span-2 lg:hidden">
			{#each [{ n: 'cultura', bg: 'bg-[var(--color-carbon-600)]' }, { n: 'canton', bg: 'bg-[var(--color-selva-400)]' }, { n: 'emprendedores', bg: 'bg-[var(--color-selva-600)]' }, { n: 'turismo', bg: 'bg-[var(--color-selva-800)]' }] as t (t.n)}
				<div class="tesela-diagonal flex aspect-square items-center justify-center p-3.5 text-white {t.bg}">
					<Pictograma nombre={t.n as never} clase="h-full w-auto" />
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	/* La imagen sólo se declara dentro de la media query: por debajo de
	   1024px el navegador nunca la solicita. */
	@media (min-width: 1024px) {
		.foto-rio {
			background-image: url('/img/napo-amanecer.jpg');
			background-size: cover;
			background-position: center;
		}
	}
</style>
