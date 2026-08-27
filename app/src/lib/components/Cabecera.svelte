<script lang="ts">
	import { page } from '$app/state';
	import Marca from './Marca.svelte';
	import CambioTema from './CambioTema.svelte';
	import MenuMovil from './MenuMovil.svelte';
	import type { NombrePictograma } from './Pictograma.svelte';

	/**
	 * Los enlaces llevan descripción, pictograma y tinte porque el menú
	 * móvil los muestra como teselas, no como texto suelto. Los tintes son
	 * colores de la banda del logotipo, pero `achiote-400` no aparece en la
	 * lista: está reservado para marcar la sección en la que estás, y un
	 * canto amarillo en un enlace cualquiera se confundiría con él. La barra de
	 * escritorio sólo usa `href` y `texto`; el resto de campos no le
	 * estorban y evitan tener dos listas de navegación que mantener en
	 * paralelo — la fuente de verdad de qué secciones existe es una sola.
	 */
	const enlaces: {
		href: string;
		texto: string;
		descripcion: string;
		picto: NombrePictograma;
		tinte: string;
	}[] = [
		{
			href: '/tramites',
			texto: 'Trámites',
			descripcion: 'Requisitos, costos y dónde hacerlos',
			picto: 'tramitesciudadanos',
			tinte: 'var(--color-achiote-500)'
		},
		{
			href: '/noticias',
			texto: 'Noticias',
			descripcion: 'Obras y gestión, semana a semana',
			picto: 'obras',
			tinte: 'var(--color-selva-400)'
		},
		{
			href: '/transparencia',
			texto: 'Transparencia',
			descripcion: 'LOTAIP, ordenanzas y rendición de cuentas',
			picto: 'rendiciondecuentas',
			tinte: 'var(--color-selva-600)'
		},
		{
			href: '/canton',
			texto: 'El cantón',
			descripcion: 'Historia, símbolos, territorio y turismo',
			picto: 'turismo',
			tinte: 'var(--color-selva-800)'
		},
		{
			href: '/contacto',
			texto: 'Contacto',
			descripcion: 'Direcciones municipales y extensiones',
			picto: 'direcciones',
			tinte: 'var(--color-selva-500)'
		}
	];

	let menuAbierto = $state(false);
	let desplazamiento = $state(0);

	const rutaActual = $derived(page.url.pathname);

	/**
	 * En la portada la cabecera flota sobre la fotografía a pantalla
	 * completa: con fondo opaco cortaría la imagen justo donde tiene más
	 * fuerza. Al bajar 40 px recupera su fondo sólido, porque a partir de
	 * ahí navega sobre contenido claro y necesita separarse de él.
	 *
	 * Ya no hace falta descontar el menú móvil: desde que es un diálogo a
	 * pantalla completa, tapa la cabecera en vez de desplegarse bajo ella.
	 */
	const sobreFoto = $derived(rutaActual === '/' && desplazamiento < 40);

	// Al cambiar de ruta el menú tiene que cerrarse solo; si no, queda
	// abierto encima de la página nueva.
	$effect(() => {
		rutaActual;
		menuAbierto = false;
	});
</script>

<svelte:window bind:scrollY={desplazamiento} />

<a
	href="#contenido"
	class="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:m-3 focus:bg-[var(--color-carbon-900)] focus:px-4 focus:py-3 focus:text-white"
>
	Saltar al contenido
</a>

<!-- Filete de marca: la banda del logotipo, reducida a su mínima expresión -->
<div class="relative z-30 flex h-1.5" aria-hidden="true">
	<span class="flex-[3] bg-[var(--color-selva-800)]"></span>
	<span class="flex-[2] bg-[var(--color-achiote-500)]"></span>
	<span class="flex-[1] bg-[var(--color-carbon-600)]"></span>
	<span class="flex-[2] bg-[var(--color-selva-600)]"></span>
	<span class="flex-[1] bg-[var(--color-achiote-400)]"></span>
	<span class="flex-[3] bg-[var(--color-selva-400)]"></span>
</div>

<header class="cabecera sticky top-0 z-30" class:sobre-foto={sobreFoto}>
	<div class="contenedor flex h-[68px] items-center justify-between gap-6 sm:h-[86px]">
		<Marca alto="h-10 sm:h-14" invertido={sobreFoto} />

		<nav class="hidden lg:block" aria-label="Principal">
			<ul class="flex items-center gap-0.5">
				{#each enlaces as e (e.href)}
					{@const activo = rutaActual.startsWith(e.href)}
					<li>
						<a
							href={e.href}
							aria-current={activo ? 'page' : undefined}
							class="enlace-nav relative inline-flex h-11 items-center px-3.5 text-[0.88rem] font-semibold no-underline transition-colors"
							class:activo
						>
							{e.texto}
							{#if activo}
								<span
									class="absolute inset-x-3 bottom-1.5 h-[3px] bg-[var(--color-achiote-500)]"
									aria-hidden="true"
								></span>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<div class="flex items-center gap-2">
			<a
				href="/buscar"
				class="control inline-flex h-10 items-center gap-2 border px-3.5 text-[0.85rem] font-semibold no-underline transition-colors"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2.2" />
					<path d="m20 20-3.6-3.6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
				</svg>
				<!--
					`hidden` por debajo de sm dejaba el enlace como un icono sin
					nombre: para un lector de pantalla era "enlace, /buscar" y nada
					más. Con sr-only el texto desaparece de la vista pero sigue
					anunciándose, que es justo lo que hace falta.
				-->
				<span class="sr-only sm:not-sr-only">Buscar</span>
			</a>

			<CambioTema />

			<button
				type="button"
				class="inline-flex h-11 w-11 cursor-pointer items-center justify-center lg:hidden"
				aria-expanded={menuAbierto}
				aria-controls="menu-movil"
				aria-haspopup="dialog"
				onclick={() => (menuAbierto = true)}
			>
				<span class="sr-only">Abrir menú</span>
				<!--
					Tres trazos de anchos distintos, como las teselas de la banda
					de marca: el icono ya dice de qué sitio es antes de abrirlo.
				-->
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<path d="M3 6.5h18M3 12h13M3 17.5h8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
				</svg>
			</button>
		</div>
	</div>

</header>

<MenuMovil abierto={menuAbierto} {enlaces} {rutaActual} alCerrar={() => (menuAbierto = false)} />

<style>
	.cabecera {
		background: color-mix(in srgb, var(--superficie) 95%, transparent);
		border-bottom: 1px solid var(--borde);
		backdrop-filter: blur(8px);
		transition:
			background-color 0.3s ease-out,
			border-color 0.3s ease-out;
	}

	.enlace-nav {
		color: var(--texto-suave);
	}

	.enlace-nav:hover {
		color: var(--texto);
	}

	.enlace-nav.activo {
		color: var(--marca);
	}

	.control {
		border-color: var(--borde);
	}

	.control:hover {
		border-color: var(--marca);
		color: var(--marca);
	}

	/*
	   Sobre la fotografía del héroe. La tinta pasa a blanca fija (no al
	   token de tema: el fondo aquí es la foto oscura, no la superficie del
	   sitio) y el anillo de foco al amarillo de marca, que es lo único
	   que se ve contra un velo casi negro.
	*/
	.cabecera.sobre-foto {
		background: transparent;
		border-bottom-color: transparent;
		backdrop-filter: none;
		--foco: var(--color-achiote-400);
	}

	.cabecera.sobre-foto .enlace-nav {
		color: rgb(255 255 255 / 0.82);
	}

	.cabecera.sobre-foto .enlace-nav:hover,
	.cabecera.sobre-foto .enlace-nav.activo {
		color: #ffffff;
	}

	.cabecera.sobre-foto .control {
		color: #ffffff;
		border-color: rgb(255 255 255 / 0.35);
	}

	.cabecera.sobre-foto .control:hover {
		color: var(--color-carbon-900);
		border-color: #ffffff;
		background: #ffffff;
	}

	.cabecera.sobre-foto :global(.conmutador) {
		color: #ffffff;
		border-color: rgb(255 255 255 / 0.35);
	}

	.cabecera.sobre-foto :global(.conmutador:hover) {
		color: var(--color-carbon-900);
		border-color: #ffffff;
		background: #ffffff;
	}

	.cabecera.sobre-foto button {
		color: #ffffff;
	}

	@media (prefers-reduced-motion: reduce) {
		.cabecera {
			transition: none;
		}
	}
</style>
