<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { modal } from '$lib/acciones/modal';
	import { sesion } from '$lib/sesion.svelte';

	/**
	 * La hoja de «inicia sesión para continuar», montada una sola vez en el
	 * layout raíz y abierta desde cualquier punto del sitio con
	 * `sesion.pedirInicio()` — el botón de reaccionar, el formulario de
	 * comentario, donde sea que haga falta una cuenta ciudadana.
	 *
	 * Mismo patrón que HojaFiltros: hoja inferior en móvil, `use:modal` para
	 * el foco y el cierre con Escape.
	 */
	let modoRegistro = $state(false);
	let nombre = $state('');
	let correo = $state('');
	let password = $state('');

	let botonCerrar = $state<HTMLButtonElement | null>(null);
	let reducido = $state(false);

	const msEntrada = $derived(reducido ? 0 : 300);
	const msSalida = $derived(reducido ? 0 : 190);

	$effect(() => {
		reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	});

	// Al abrir la hoja se vuelve siempre al modo de inicio de sesión: si
	// alguien la cerró a mitad de un registro, la próxima vez empieza limpia.
	$effect(() => {
		if (sesion.hojaAbierta) {
			modoRegistro = false;
			nombre = correo = password = '';
		}
	});

	async function enviar(evento: SubmitEvent) {
		evento.preventDefault();
		if (modoRegistro) {
			await sesion.registrar(nombre, correo, password);
		} else {
			await sesion.iniciar(correo, password);
		}
	}
</script>

{#if sesion.hojaAbierta}
	<div
		class="velo"
		aria-hidden="true"
		onclick={() => sesion.cerrarHoja()}
		transition:fade={{ duration: msSalida }}
	></div>

	<div
		use:modal={{ alCerrar: () => sesion.cerrarHoja(), focoInicial: () => botonCerrar }}
		id="hoja-sesion"
		class="hoja"
		role="dialog"
		aria-modal="true"
		aria-labelledby="titulo-hoja-sesion"
		tabindex="-1"
		transition:fly={{ y: 420, duration: msEntrada, opacity: 1, easing: cubicOut }}
	>
		<div class="flex justify-center pt-2.5 pb-1" aria-hidden="true">
			<span class="block h-1 w-10 rounded-full bg-[var(--borde)]"></span>
		</div>

		<div class="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--borde)] px-5 pb-3">
			<h2 id="titulo-hoja-sesion" class="display text-[1.15rem]">
				{modoRegistro ? 'Crear cuenta' : 'Inicia sesión'}
			</h2>
			<button
				bind:this={botonCerrar}
				type="button"
				onclick={() => sesion.cerrarHoja()}
				class="-mr-2.5 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center"
			>
				<span class="sr-only">Cerrar</span>
				<svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
				</svg>
			</button>
		</div>

		<div class="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
			<p class="mb-4 text-[0.88rem] leading-relaxed text-[var(--texto-suave)]">
				{modoRegistro
					? 'Con tu cuenta puedes reaccionar y comentar en las publicaciones de la Alcaldía y las direcciones.'
					: 'Necesitas una cuenta para reaccionar o comentar.'}
			</p>

			<form onsubmit={enviar} class="space-y-3.5">
				{#if modoRegistro}
					<div>
						<label for="hs-nombre" class="mb-1 block text-[0.8rem] font-semibold">Nombre</label>
						<input
							id="hs-nombre"
							type="text"
							bind:value={nombre}
							required
							minlength="2"
							maxlength="80"
							autocomplete="name"
							class="campo"
						/>
					</div>
				{/if}

				<div>
					<label for="hs-correo" class="mb-1 block text-[0.8rem] font-semibold">Correo</label>
					<input
						id="hs-correo"
						type="email"
						bind:value={correo}
						required
						autocomplete="email"
						class="campo"
					/>
				</div>

				<div>
					<label for="hs-password" class="mb-1 block text-[0.8rem] font-semibold">Contraseña</label>
					<input
						id="hs-password"
						type="password"
						bind:value={password}
						required
						minlength="8"
						autocomplete={modoRegistro ? 'new-password' : 'current-password'}
						class="campo"
					/>
					{#if modoRegistro}
						<p class="mt-1 text-[0.75rem] text-[var(--texto-suave)]">Al menos 8 caracteres.</p>
					{/if}
				</div>

				{#if sesion.error}
					<p role="alert" class="text-[0.85rem] text-[var(--color-error)]">{sesion.error}</p>
				{/if}

				<button
					type="submit"
					aria-disabled={sesion.cargando}
					class="inline-flex min-h-12 w-full items-center justify-center bg-[var(--color-achiote-500)] px-5 text-[0.95rem] font-bold text-[var(--color-carbon-900)] disabled:opacity-60"
				>
					{#if sesion.cargando}
						Un momento…
					{:else}
						{modoRegistro ? 'Crear cuenta' : 'Iniciar sesión'}
					{/if}
				</button>
			</form>

			<p class="mt-4 text-center text-[0.85rem] text-[var(--texto-suave)]">
				{modoRegistro ? '¿Ya tienes cuenta?' : '¿Todavía no tienes cuenta?'}
				<button
					type="button"
					onclick={() => {
						modoRegistro = !modoRegistro;
						sesion.error = null;
					}}
					class="cursor-pointer font-semibold text-[var(--color-selva-800)] hover:underline"
				>
					{modoRegistro ? 'Inicia sesión' : 'Crea una'}
				</button>
			</p>
		</div>
	</div>
{/if}

<style>
	.velo {
		position: fixed;
		inset: 0;
		z-index: 60;
		background: rgb(6 12 8 / 0.55);
	}

	.hoja {
		position: fixed;
		inset-inline: 0;
		bottom: 0;
		z-index: 60;
		display: flex;
		flex-direction: column;
		max-height: 92dvh;
		background: var(--superficie);
		border-top: 2px solid var(--borde);
		padding-bottom: max(0.75rem, env(safe-area-inset-bottom));

		@media (width >= 40rem) {
			inset-inline: auto;
			right: 1.5rem;
			bottom: 1.5rem;
			left: auto;
			width: 26rem;
			border: 2px solid var(--borde);
		}
	}

	.campo {
		display: block;
		width: 100%;
		min-height: 2.75rem;
		border: 1px solid var(--borde);
		background: var(--superficie);
		color: var(--texto);
		padding-inline: 0.75rem;
		font-size: 0.92rem;
	}

	.campo:focus-visible {
		outline: 2px solid var(--foco);
		outline-offset: 1px;
	}
</style>
