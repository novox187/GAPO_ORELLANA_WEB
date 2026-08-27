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
	const rutaActual = $derived(page.url.pathname);
</script>

<a
	href="#contenido"
	class="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:m-3 focus:bg-[var(--color-carbon-900)] focus:px-4 focus:py-3 focus:text-white"
>
	Saltar al contenido
</a>

<!-- Filete de marca: la banda del logotipo, reducida a su mínima expresión -->
<div class="flex h-1.5" aria-hidden="true">
	<span class="flex-[3] bg-[var(--color-selva-800)]"></span>
	<span class="flex-[2] bg-[var(--color-achiote-500)]"></span>
	<span class="flex-[1] bg-[var(--color-carbon-600)]"></span>
	<span class="flex-[2] bg-[var(--color-selva-600)]"></span>
	<span class="flex-[1] bg-[var(--color-achiote-400)]"></span>
	<span class="flex-[3] bg-[var(--color-selva-400)]"></span>
</div>

<header class="sticky top-0 z-30 border-b border-[var(--borde)] bg-[var(--superficie)]/95 backdrop-blur">
	<div class="contenedor flex h-[68px] sm:h-[86px] items-center justify-between gap-6">
		<Marca alto="h-10 sm:h-14" />

		<nav class="hidden lg:block" aria-label="Principal">
			<ul class="flex items-center gap-0.5">
				{#each enlaces as e (e.href)}
					{@const activo = rutaActual.startsWith(e.href)}
					<li>
						<a
							href={e.href}
							aria-current={activo ? 'page' : undefined}
							class="relative inline-flex h-11 items-center px-3.5 text-[0.88rem] font-semibold no-underline transition-colors
							{activo ? 'text-[var(--color-selva-800)]' : 'text-[var(--texto-suave)] hover:text-[var(--texto)]'}"
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
				class="inline-flex h-10 items-center gap-2 border border-[var(--borde)] px-3.5 text-[0.85rem] font-semibold no-underline transition-colors hover:border-[var(--marca)] hover:text-[var(--marca)]"
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
				class="inline-flex h-11 w-11 items-center justify-center lg:hidden"
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
