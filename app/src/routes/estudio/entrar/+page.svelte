<script lang="ts">
	import { goto } from '$app/navigation';
	import Marca from '$lib/components/Marca.svelte';
	import { sesionEstudio } from '$lib/sesionEstudio.svelte';

	/**
	 * Entrar al estudio con la cuenta del panel: la misma persona, el mismo
	 * rol, otra interfaz. No hay registro — las cuentas del personal las crea
	 * quien administra el sitio, no se piden desde un formulario público.
	 */
	let correo = $state('');
	let password = $state('');

	async function enviar(evento: SubmitEvent) {
		evento.preventDefault();

		if (await sesionEstudio.entrar(correo, password)) {
			await goto('/estudio');
		}
	}
</script>

<div class="caja">
	<Marca alto="h-12" />

	<h1 class="display">Estudio</h1>
	<p class="intro">
		Publicaciones e historias de la Alcaldía y las direcciones. Entra con la misma cuenta del panel.
	</p>

	<form onsubmit={enviar}>
		<label>
			<span>Correo</span>
			<input type="email" bind:value={correo} required autocomplete="username" class="campo" />
		</label>

		<label>
			<span>Contraseña</span>
			<input
				type="password"
				bind:value={password}
				required
				autocomplete="current-password"
				class="campo"
			/>
		</label>

		{#if sesionEstudio.error}
			<p role="alert" class="error">{sesionEstudio.error}</p>
		{/if}

		<button type="submit" aria-disabled={sesionEstudio.cargando}>
			{sesionEstudio.cargando ? 'Un momento…' : 'Entrar'}
		</button>
	</form>

	<p class="pista">
		¿No tienes cuenta? Las crea quien administra el sitio, desde el panel. No hay registro abierto:
		esto publica en nombre del municipio.
	</p>
</div>

<style>
	.caja {
		width: 100%;
		max-width: 22rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	h1 {
		font-size: 1.9rem;
		margin-top: 0.75rem;
	}

	.intro {
		font-size: 0.9rem;
		line-height: 1.5;
		color: var(--texto-suave);
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		margin-top: 1.25rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: 0.82rem;
		font-weight: 600;
	}

	.campo {
		min-height: 2.9rem;
		padding-inline: 0.75rem;
		border: 1px solid var(--borde);
		background: var(--superficie);
		color: var(--texto);
		font-size: 0.95rem;
		font-family: inherit;
	}

	.campo:focus-visible {
		outline: 2px solid var(--foco);
		outline-offset: 1px;
	}

	button {
		min-height: 3rem;
		border: none;
		background: var(--color-achiote-500);
		color: var(--color-carbon-900);
		font-family: inherit;
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
	}

	button[aria-disabled='true'] {
		opacity: 0.6;
		cursor: progress;
	}

	.error {
		font-size: 0.85rem;
		color: var(--color-error);
	}

	.pista {
		margin-top: 1.25rem;
		font-size: 0.78rem;
		line-height: 1.5;
		color: var(--texto-suave);
	}
</style>
