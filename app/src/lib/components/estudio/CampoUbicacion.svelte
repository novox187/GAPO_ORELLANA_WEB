<script lang="ts">
	import IconoEstudio from './IconoEstudio.svelte';

	/**
	 * Dónde se tomó la fotografía.
	 *
	 * Campo libre con sugerencias, no un desplegable cerrado: la lista sale
	 * de los lugares turísticos ya publicados en el sitio, y una obra pasa en
	 * un barrio que no está en ninguna lista de atractivos. Cerrarlo obligaría
	 * a etiquetar «Malecón» una minga que fue en la 6 de Diciembre.
	 *
	 * Se guarda el nombre tal cual se escribe, no una referencia: una
	 * publicación de hace dos años tiene que seguir diciendo dónde se tomó
	 * aunque la página de lugares se reescriba entera.
	 */
	let {
		valor = $bindable(''),
		sugerencias = [],
		mostrarEtiqueta = true
	}: {
		valor?: string;
		sugerencias?: string[];
		/** A `false` dentro de una `FilaEstudio`, que ya pone el rótulo y el icono. */
		mostrarEtiqueta?: boolean;
	} = $props();

	let abierto = $state(false);

	const filtradas = $derived(
		valor.trim() === ''
			? sugerencias.slice(0, 8)
			: sugerencias
					.filter((s) => s.toLowerCase().includes(valor.trim().toLowerCase()))
					.slice(0, 8)
	);
</script>

<div class="campo">
	{#if mostrarEtiqueta}
		<label class="etiqueta" for="ubicacion">
			<IconoEstudio nombre="ubicacion" tamano={17} />
			Ubicación
		</label>
	{:else}
		<label class="sr-only" for="ubicacion">Ubicación</label>
	{/if}

	<input
		id="ubicacion"
		type="text"
		bind:value={valor}
		maxlength="120"
		placeholder="Malecón del Coca, Dayuma, comunidad Yana Rumi…"
		autocomplete="off"
		onfocus={() => (abierto = true)}
		onblur={() => setTimeout(() => (abierto = false), 150)}
	/>

	{#if abierto && filtradas.length}
		<ul class="sugerencias">
			{#each filtradas as s (s)}
				<li>
					<button type="button" onclick={() => ((valor = s), (abierto = false))}>{s}</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.campo {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.etiqueta {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--texto-suave);
	}

	input {
		min-height: 2.75rem;
		padding-inline: 0.75rem;
		border: 1px solid var(--borde);
		background: var(--superficie);
		color: var(--texto);
		font-family: inherit;
		font-size: 0.9rem;
	}

	input:focus-visible {
		outline: 2px solid var(--foco);
		outline-offset: 1px;
	}

	.sugerencias {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		z-index: 10;
		max-height: 13rem;
		overflow-y: auto;
		border: 1px solid var(--borde);
		background: var(--superficie-elevada);
		box-shadow: 0 8px 24px rgb(0 0 0 / 0.12);
	}

	.sugerencias button {
		display: block;
		width: 100%;
		min-height: 40px;
		padding: 0.5rem 0.75rem;
		border: none;
		background: none;
		color: var(--texto);
		font-family: inherit;
		font-size: 0.85rem;
		text-align: left;
		cursor: pointer;
	}

	.sugerencias button:hover {
		background: var(--superficie-alt);
	}
</style>
