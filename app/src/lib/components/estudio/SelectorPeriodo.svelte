<script lang="ts">
	/**
	 * 7, 30 o 90 días. Tres opciones fijas y no un calendario libre, por dos
	 * motivos que no son de interfaz:
	 *
	 * - Una ventana mayor que la retención del crudo daría un alcance
	 *   calculado sobre datos ya podados, es decir, mal.
	 * - Un rango arbitrario es un `count(distinct)` sobre la tabla entera a
	 *   petición de cualquiera.
	 *
	 * El backend acota igual (ver MetricaController::dias); esto sólo evita
	 * ofrecer lo que allí se rechaza.
	 */
	let { dias = $bindable(7) }: { dias?: number } = $props();

	const opciones = [
		{ valor: 7, texto: '7 días' },
		{ valor: 30, texto: '30 días' },
		{ valor: 90, texto: '90 días' }
	];
</script>

<div class="selector" role="group" aria-label="Periodo">
	{#each opciones as o (o.valor)}
		<button
			type="button"
			class:activo={dias === o.valor}
			aria-pressed={dias === o.valor}
			onclick={() => (dias = o.valor)}
		>
			{o.texto}
		</button>
	{/each}
</div>

<style>
	.selector {
		display: inline-flex;
		padding: 3px;
		gap: 2px;
		background: var(--superficie-alt);
		border: var(--canto);
		border-radius: var(--radius-md);
	}

	button {
		min-height: 34px;
		padding-inline: 0.85rem;
		border: none;
		border-radius: calc(var(--radius-md) - 2px);
		background: none;
		color: var(--texto-suave);
		font-family: inherit;
		font-size: 0.82rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			background-color var(--transicion),
			color var(--transicion);
	}

	button:hover:not(.activo) {
		color: var(--texto);
	}

	/* El activo es una pastilla que se levanta sobre la pista, como cualquier
	   control segmentado: el estado se lee por elevación, no sólo por color. */
	button.activo {
		background: var(--superficie-elevada);
		color: var(--texto);
		box-shadow: var(--elev-1);
	}

	@media (prefers-reduced-motion: reduce) {
		button {
			transition: none;
		}
	}
</style>
