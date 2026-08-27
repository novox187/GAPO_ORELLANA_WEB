<script lang="ts">
	import { page } from '$app/state';
	import Marca from './Marca.svelte';
	import CambioTema from './CambioTema.svelte';

	const enlaces = [
		{ href: '/tramites', texto: 'Trámites' },
		{ href: '/noticias', texto: 'Noticias' },
		{ href: '/transparencia', texto: 'Transparencia' },
		{ href: '/canton', texto: 'El cantón' },
		{ href: '/contacto', texto: 'Contacto' }
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
	 * El menú móvil abierto la devuelve a sólida de inmediato: un panel de
	 * enlaces sobre una foto no se lee.
	 */
	const sobreFoto = $derived(rutaActual === '/' && desplazamiento < 40 && !menuAbierto);

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
				<span class="hidden sm:inline">Buscar</span>
			</a>

			<CambioTema />

			<button
				type="button"
				class="inline-flex h-11 w-11 cursor-pointer items-center justify-center lg:hidden"
				aria-expanded={menuAbierto}
				aria-controls="menu-movil"
				onclick={() => (menuAbierto = !menuAbierto)}
			>
				<span class="sr-only">{menuAbierto ? 'Cerrar menú' : 'Abrir menú'}</span>
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					{#if menuAbierto}
						<path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
					{:else}
						<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
					{/if}
				</svg>
			</button>
		</div>
	</div>

	{#if menuAbierto}
		<nav
			id="menu-movil"
			class="border-t border-[var(--borde)] bg-[var(--superficie)] lg:hidden"
			aria-label="Principal, móvil"
		>
			<ul class="contenedor flex flex-col py-1">
				{#each enlaces as e (e.href)}
					<li>
						<a
							href={e.href}
							class="flex min-h-12 items-center border-b border-[var(--borde)] font-semibold no-underline last:border-0"
							onclick={() => (menuAbierto = false)}
						>
							{e.texto}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	{/if}
</header>

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
