<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import { sesion } from '$lib/sesion.svelte';
	import { img } from '$lib/api';

	let modoRegistro = $state(false);
	let nombre = $state('');
	let correo = $state('');
	let password = $state('');

	async function enviar(evento: SubmitEvent) {
		evento.preventDefault();
		if (modoRegistro) {
			await sesion.registrar(nombre, correo, password);
		} else {
			await sesion.iniciar(correo, password);
		}
	}
</script>

<Seo
	titulo="Mi cuenta"
	descripcion="Inicia sesión o crea una cuenta ciudadana para reaccionar y comentar en Noticias."
	indexar={false}
/>

<div class="contenedor py-10 md:py-14">
	<div class="mx-auto max-w-sm">
		{#if sesion.autenticado && sesion.ciudadano}
			<div class="text-center">
				<span
					class="mx-auto flex size-20 items-center justify-center overflow-hidden rounded-full bg-[var(--superficie-alt)]"
				>
					{#if sesion.ciudadano.avatar}
						<img src={img(sesion.ciudadano.avatar, 400)} alt="" class="h-full w-full object-cover" />
					{:else}
						<span class="text-2xl font-bold text-[var(--texto-suave)]" aria-hidden="true">
							{sesion.ciudadano.nombre.slice(0, 1)}
						</span>
					{/if}
				</span>

				<h1 class="display mt-4 text-[1.4rem]">{sesion.ciudadano.nombre}</h1>
				<p class="mt-1 text-[0.88rem] text-[var(--texto-suave)]">{sesion.ciudadano.correo}</p>

				<button
					type="button"
					onclick={() => sesion.salir()}
					class="mt-8 inline-flex min-h-11 items-center justify-center border border-[var(--borde)] px-6 text-[0.9rem] font-semibold transition-colors hover:border-[var(--marca)]"
				>
					Cerrar sesión
				</button>
			</div>
		{:else}
			<h1 class="display text-[1.6rem]">{modoRegistro ? 'Crear cuenta' : 'Inicia sesión'}</h1>
			<p class="mt-2 text-[0.9rem] leading-relaxed text-[var(--texto-suave)]">
				{modoRegistro
					? 'Con tu cuenta puedes reaccionar y comentar en las publicaciones de la Alcaldía y las direcciones.'
					: 'Usa tu correo y contraseña para reaccionar y comentar.'}
			</p>

			<form onsubmit={enviar} class="mt-6 space-y-4">
				{#if modoRegistro}
					<div>
						<label for="c-nombre" class="mb-1 block text-[0.82rem] font-semibold">Nombre</label>
						<input
							id="c-nombre"
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
					<label for="c-correo" class="mb-1 block text-[0.82rem] font-semibold">Correo</label>
					<input id="c-correo" type="email" bind:value={correo} required autocomplete="email" class="campo" />
				</div>

				<div>
					<label for="c-password" class="mb-1 block text-[0.82rem] font-semibold">Contraseña</label>
					<input
						id="c-password"
						type="password"
						bind:value={password}
						required
						minlength="8"
						autocomplete={modoRegistro ? 'new-password' : 'current-password'}
						class="campo"
					/>
					{#if modoRegistro}
						<p class="mt-1 text-[0.78rem] text-[var(--texto-suave)]">Al menos 8 caracteres.</p>
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

			<p class="mt-5 text-center text-[0.85rem] text-[var(--texto-suave)]">
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
		{/if}
	</div>
</div>

<style>
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
