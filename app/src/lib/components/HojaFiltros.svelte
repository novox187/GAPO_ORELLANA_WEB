<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { modal } from '$lib/acciones/modal';

	/**
	 * Hoja inferior de filtros para pantallas pequeñas.
	 *
	 * En móvil los filtros no pueden vivir sobre los resultados: en el
	 * listado anterior había que bajar más de 700 px —buscador, siete
	 * categorías, seis perfiles y un desplegable de direcciones— antes de
	 * ver el primer trámite. Aquí ocupan una hoja que se abre a demanda, y
	 * la lista empieza donde termina el titular.
	 *
	 * Sube desde abajo, no desde el lateral: el gesto acompaña al pulgar,
	 * que es donde está el botón que la abre.
	 */
	let {
		abierta,
		resultados,
		activos,
		alCerrar,
		alLimpiar,
		children
	}: {
		abierta: boolean;
		/** Cuántos trámites quedan con los filtros puestos ahora mismo. */
		resultados: number;
		/** Número de filtros aplicados, para el encabezado. */
		activos: number;
		alCerrar: () => void;
		alLimpiar: () => void;
		children: Snippet;
	} = $props();

	let botonCerrar = $state<HTMLButtonElement | null>(null);
	let reducido = $state(false);

	const msEntrada = $derived(reducido ? 0 : 300);
	const msSalida = $derived(reducido ? 0 : 190);

	$effect(() => {
		reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	});
</script>

{#if abierta}
	<div
		class="velo lg:hidden"
		aria-hidden="true"
		onclick={alCerrar}
		transition:fade={{ duration: msSalida }}
	></div>

	<div
		use:modal={{ alCerrar, focoInicial: () => botonCerrar }}
		id="hoja-filtros"
		class="hoja lg:hidden"
		role="dialog"
		aria-modal="true"
		aria-label="Filtrar trámites"
		tabindex="-1"
		transition:fly={{ y: 420, duration: msEntrada, opacity: 1, easing: cubicOut }}
	>
		<!-- Asa: dice "esto se arrastra/cierra" antes de leer nada. -->
		<div class="flex justify-center pt-2.5 pb-1" aria-hidden="true">
			<span class="block h-1 w-10 rounded-full bg-[var(--borde)]"></span>
		</div>

		<div class="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--borde)] px-5 pb-3">
			<h2 class="display text-[1.15rem]">
				Filtrar
				{#if activos > 0}
					<span class="text-[var(--texto-suave)]">({activos})</span>
				{/if}
			</h2>
			<button
				bind:this={botonCerrar}
				type="button"
				onclick={alCerrar}
				class="-mr-2.5 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center"
			>
				<span class="sr-only">Cerrar filtros</span>
				<svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
				</svg>
			</button>
		</div>

		<div class="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
			{@render children()}
		</div>

		<!--
			Pie fijo: el botón dice cuántos trámites va a mostrar, no un "OK"
			genérico. Así se puede ir ajustando filtros y ver el efecto sin
			cerrar la hoja para comprobarlo.
		-->
		<div class="pie flex shrink-0 gap-2 border-t border-[var(--borde)] px-5 pt-3">
			{#if activos > 0}
				<button
					type="button"
					onclick={alLimpiar}
					class="inline-flex min-h-[52px] shrink-0 cursor-pointer items-center border-2 border-[var(--borde)] px-5 text-[0.9rem] font-bold"
				>
					Limpiar
				</button>
			{/if}
			<button
				type="button"
				onclick={alCerrar}
				class="inline-flex min-h-[52px] flex-1 cursor-pointer items-center justify-center bg-[var(--color-achiote-500)] px-5 text-[0.95rem] font-bold text-[var(--color-carbon-900)]"
			>
				{resultados === 0
					? 'Sin resultados'
					: `Ver ${resultados} ${resultados === 1 ? 'trámite' : 'trámites'}`}
			</button>
		</div>
	</div>
{/if}

<style>
	.velo {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: rgb(6 12 8 / 0.55);
	}

	.hoja {
		position: fixed;
		inset-inline: 0;
		bottom: 0;
		z-index: 50;
		display: flex;
		flex-direction: column;
		/* Deja ver un poco de la lista detrás: recuerda de dónde salió. */
		max-height: 86dvh;
		background: var(--superficie);
		border-top: 2px solid var(--borde);
	}

	.pie {
		/* Sobre la barra de gestos del teléfono, no debajo. */
		padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
	}
</style>
