<script lang="ts">
	import { sesion } from '$lib/sesion.svelte';

	/**
	 * Declarar parroquia y año de nacimiento.
	 *
	 * Opcional, reversible y explícito. Es lo único que da contenido al
	 * gráfico de audiencia del estudio: el municipio NO deduce la parroquia de
	 * la conexión ni la edad del comportamiento, y esa renuncia se paga en
	 * cobertura —el panel dice sobre cuánta gente está hablando— a cambio de
	 * no perfilar a nadie sin decírselo.
	 *
	 * Por eso el texto explica para qué sirve antes de pedir nada. Un
	 * formulario municipal que pide datos sin decir para qué es un formulario
	 * que la gente rellena mal o no rellena.
	 */
	let { parroquias }: { parroquias: string[] } = $props();

	let parroquia = $state('');
	let anio = $state('');
	let guardando = $state(false);
	let mensaje = $state<string | null>(null);
	let error = $state<string | null>(null);
	let cargado = $state(false);

	$effect(() => {
		const c = sesion.ciudadano;

		if (c && !cargado) {
			parroquia = c.parroquia ?? '';
			anio = c.anio_nacimiento ? String(c.anio_nacimiento) : '';
			cargado = true;
		}
	});

	const anioMinimo = new Date().getFullYear() - 110;
	const anioMaximo = new Date().getFullYear();

	async function enviar(evento: SubmitEvent) {
		evento.preventDefault();

		guardando = true;
		mensaje = null;
		error = null;

		try {
			const res = await fetch('/api/demografia', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					parroquia: parroquia || null,
					anio_nacimiento: anio ? Number(anio) : null
				})
			});

			const datos = await res.json().catch(() => ({}));

			if (!res.ok) {
				const primero = Object.values(datos?.errors ?? {})[0] as string[] | undefined;
				error = primero?.[0] ?? datos?.message ?? 'No se pudo guardar.';

				return;
			}

			sesion.ciudadano = datos.data;
			mensaje = parroquia || anio ? 'Guardado. Gracias.' : 'Retirado. Ya no cuentas en ningún reparto.';
		} catch {
			error = 'No se pudo conectar. Inténtalo otra vez.';
		} finally {
			guardando = false;
		}
	}
</script>

<section class="bloque">
	<h2>Ayuda a que el municipio publique mejor</h2>

	<p class="explicacion">
		Si nos dices tu parroquia y tu año de nacimiento, quien publica en la Alcaldía y las direcciones
		puede saber a qué parte del cantón está llegando y a cuál no. Se usa <strong>sólo agrupado</strong>
		—nunca aparece tu nombre en ninguna estadística— y puedes retirarlo cuando quieras dejando los dos
		campos en blanco.
	</p>

	<p class="explicacion">
		Es opcional. Nada de esto se deduce de tu conexión ni de lo que lees: si no lo declaras, no
		existe.
	</p>

	<form onsubmit={enviar}>
		<label>
			<span>Parroquia</span>
			<select bind:value={parroquia}>
				<option value="">Prefiero no decirlo</option>
				{#each parroquias as p (p)}
					<option value={p}>{p}</option>
				{/each}
			</select>
		</label>

		<label>
			<span>Año de nacimiento</span>
			<input
				type="number"
				bind:value={anio}
				min={anioMinimo}
				max={anioMaximo}
				placeholder="1994"
				inputmode="numeric"
			/>
		</label>

		{#if error}<p class="error" role="alert">{error}</p>{/if}
		{#if mensaje}<p class="exito" role="status">{mensaje}</p>{/if}

		<button type="submit" aria-disabled={guardando}>
			{guardando ? 'Guardando…' : 'Guardar'}
		</button>
	</form>
</section>

<style>
	.bloque {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 1rem;
		border: 1px solid var(--borde);
		text-align: left;
	}

	h2 {
		font-size: 0.95rem;
		font-weight: 700;
	}

	.explicacion {
		font-size: 0.82rem;
		line-height: 1.6;
		color: var(--texto-suave);
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 0.4rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.8rem;
		font-weight: 600;
	}

	select,
	input {
		min-height: 2.75rem;
		padding-inline: 0.7rem;
		border: 1px solid var(--borde);
		background: var(--superficie);
		color: var(--texto);
		font-family: inherit;
		font-size: 0.9rem;
		font-weight: 400;
	}

	button {
		min-height: 2.75rem;
		border: 1px solid var(--borde);
		background: none;
		color: var(--texto);
		font-family: inherit;
		font-size: 0.9rem;
		font-weight: 700;
		cursor: pointer;
	}

	button:hover {
		border-color: var(--marca);
	}

	.error {
		font-size: 0.82rem;
		color: var(--color-error);
	}

	.exito {
		font-size: 0.82rem;
		color: var(--marca);
	}
</style>
