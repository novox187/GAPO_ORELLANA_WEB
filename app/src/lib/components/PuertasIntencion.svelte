<script lang="ts">
	import Pictograma, { type NombrePictograma } from './Pictograma.svelte';
	import { revelar } from '$lib/acciones/revelar';

	/**
	 * Las cuatro puertas de entrada por intención.
	 *
	 * Aquí la marca vuelve a mandar: son teselas planas de color del
	 * logotipo, con sus pictogramas propios de fauna y lugares. La
	 * diferencia con la portada anterior no es el sistema, es la escala —
	 * el pictograma pasa de un icono de 56 px arrinconado a una figura que
	 * se sale de la tesela, y la retícula deja de ser cuatro columnas
	 * iguales. Cuatro cajas del mismo tamaño no tienen jerarquía, y sin
	 * jerarquía no hay dónde mirar primero.
	 *
	 * La tinta de cada tesela no es una preferencia: sobre achiote-500 y
	 * selva-600 el texto blanco se queda en 1.4:1 y 3.1:1, por debajo del
	 * mínimo AA de 4.5:1, así que esas dos van con tinta carbón (6.6:1 y
	 * más). Blanco sólo sobre selva-800 (4.8:1) y carbón-600 (8.9:1).
	 * Ningún par se elige por gusto — ver docs/accesibilidad.md.
	 */
	let { totalTramites, totalNoticias }: { totalTramites: number; totalNoticias: number } = $props();

	interface Puerta {
		href: string;
		indice: string;
		titulo: string;
		texto: string;
		pie: string;
		picto: NombrePictograma;
		fondo: string;
		tinta: string;
		/** Colocación en la retícula asimétrica de 12 columnas. */
		area: string;
	}

	// $derived: los conteos llegan por props y la retícula debe rehacerse si
	// cambian (p. ej. al navegar de vuelta con datos ya frescos en caché).
	const puertas: Puerta[] = $derived([
		{
			href: '/tramites',
			indice: '01',
			titulo: 'Hacer un trámite',
			texto: 'Patentes, permisos de construcción, agua potable y certificados. Organizados por lo que necesitas hacer, no por la dirección que lo atiende.',
			pie: `${totalTramites} trámites con requisitos y costos`,
			picto: 'tramitesciudadanos',
			fondo: 'bg-[var(--color-achiote-500)]',
			tinta: 'text-[var(--color-carbon-900)]',
			area: 'lg:col-span-7'
		},
		{
			href: '/transparencia',
			indice: '02',
			titulo: 'Transparencia',
			texto: 'LOTAIP, ordenanzas, rendición de cuentas y plan de contratación.',
			pie: 'Información pública obligatoria',
			picto: 'rendiciondecuentas',
			fondo: 'bg-[var(--color-selva-800)]',
			tinta: 'text-white',
			area: 'lg:col-span-5'
		},
		{
			href: '/noticias',
			indice: '03',
			titulo: 'Obras y noticias',
			texto: 'La gestión municipal, semana a semana.',
			pie: `${totalNoticias} publicaciones`,
			picto: 'obras',
			fondo: 'bg-[var(--color-carbon-600)]',
			tinta: 'text-white',
			area: 'lg:col-span-5'
		},
		{
			href: '/canton',
			indice: '04',
			titulo: 'Conoce el cantón',
			texto: 'Historia y símbolos, el Concejo, la alcaldía, los lugares por visitar y las rutas turísticas de los tres ríos.',
			pie: 'Territorio, cultura y turismo',
			picto: 'turismo',
			fondo: 'bg-[var(--color-selva-600)]',
			tinta: 'text-[var(--color-carbon-900)]',
			area: 'lg:col-span-7'
		}
	]);
</script>

<section class="contenedor py-14 md:py-20" aria-labelledby="titulo-puertas">
	<div class="mb-7 flex flex-wrap items-end justify-between gap-4 md:mb-9">
		<h2 id="titulo-puertas" class="display text-[clamp(1.7rem,3.4vw,2.5rem)]">
			¿Qué necesitas hacer?
		</h2>
		<p class="max-w-sm text-[0.88rem] leading-relaxed text-[var(--texto-suave)]">
			Cuatro puertas de entrada. Si sabes exactamente qué buscas, el buscador te lleva directo a la
			ficha.
		</p>
	</div>

	<div class="grid gap-1.5 lg:grid-cols-12">
		{#each puertas as p, i (p.href)}
			<a
				href={p.href}
				use:revelar={{ retraso: i * 90 }}
				class="puerta revelable tesela-diagonal group relative flex min-h-[15rem] flex-col justify-between overflow-hidden p-6 no-underline sm:p-8 md:min-h-[18.5rem] {p.fondo} {p.tinta} {p.area}"
			>
				<!--
					El pictograma se sale de la tesela por la esquina. Es el mismo
					recurso que usa el logotipo impreso del municipio, donde las
					figuras tampoco caben enteras dentro de su cuadro.
				-->
				<Pictograma
					nombre={p.picto}
					clase="puerta-picto pointer-events-none absolute -right-8 -bottom-10 h-[15rem] w-auto opacity-[0.16] md:-right-10 md:-bottom-14 md:h-[19rem]"
				/>

				<span
					class="relative text-[0.72rem] font-bold tracking-[0.2em] opacity-70 cifra-tabular"
					aria-hidden="true"
				>
					{p.indice}
				</span>

				<div class="relative mt-10">
					<h3 class="display text-[clamp(1.45rem,3vw,2.15rem)] leading-[1.1]">{p.titulo}</h3>
					<p class="mt-2.5 max-w-lg text-[0.9rem] leading-relaxed opacity-90">{p.texto}</p>

					<span class="mt-6 flex items-center gap-3 text-[0.8rem] font-bold">
						<span class="flecha inline-flex h-9 w-9 shrink-0 items-center justify-center border-2 border-current">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
								<path
									d="M5 12h14m-6-6 6 6-6 6"
									stroke="currentColor"
									stroke-width="2.6"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</span>
						<span class="opacity-80">{p.pie}</span>
					</span>
				</div>
			</a>
		{/each}
	</div>
</section>

<style>
	/*
	   El hover mueve dos cosas y ninguna toca el layout: el pictograma
	   avanza y crece, la flecha se desplaza. Nada de animar width/height ni
	   márgenes — la tesela mantiene su caja exacta y la retícula no tiembla.
	*/
	.puerta :global(.puerta-picto) {
		transition:
			transform 0.55s var(--ease-cine),
			opacity 0.35s ease-out;
	}

	.puerta:hover :global(.puerta-picto),
	.puerta:focus-visible :global(.puerta-picto) {
		opacity: 0.26;
		transform: scale(1.09) translate3d(-1.5%, -3%, 0);
	}

	.flecha {
		transition: transform 0.3s var(--ease-cine);
	}

	.puerta:hover .flecha,
	.puerta:focus-visible .flecha {
		transform: translateX(5px);
	}

	@media (prefers-reduced-motion: reduce) {
		.puerta :global(.puerta-picto),
		.flecha {
			transition: none;
		}
		.puerta:hover :global(.puerta-picto),
		.puerta:focus-visible :global(.puerta-picto) {
			transform: none;
		}
		.puerta:hover .flecha,
		.puerta:focus-visible .flecha {
			transform: none;
		}
	}
</style>
