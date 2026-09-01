<script lang="ts">
	import { img, type Cuenta } from '$lib/api';
	import IconoEstudio from './IconoEstudio.svelte';

	/**
	 * Qué otras cuentas municipales aparecen en esta publicación.
	 *
	 * **Sólo cuentas, nunca personas**, y la ausencia es la decisión: etiquetar
	 * a un vecino en una fotografía oficial es publicar su nombre junto a su
	 * cara en un sitio de gobierno sin que él lo haya pedido. Entre
	 * direcciones, en cambio, es justo lo que hace falta — una obra que firman
	 * Obras Públicas y Agua Potable aparece en los dos perfiles.
	 */
	let {
		cuentas,
		propia,
		seleccionadas = $bindable<string[]>([]),
		mostrarEtiqueta = true
	}: {
		cuentas: Cuenta[];
		propia: string;
		seleccionadas?: string[];
		/** A `false` dentro de una `FilaEstudio`, que ya pone el rótulo y el icono. */
		mostrarEtiqueta?: boolean;
	} = $props();

	let busqueda = $state('');

	const disponibles = $derived(
		cuentas
			.filter((c) => c.alias !== propia && !seleccionadas.includes(c.alias))
			.filter((c) => c.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()))
			.slice(0, 6)
	);

	const elegidas = $derived(seleccionadas.map((a) => cuentas.find((c) => c.alias === a)).filter(Boolean) as Cuenta[]);
</script>

<div class="campo">
	{#if mostrarEtiqueta}
		<span class="etiqueta">
			<IconoEstudio nombre="etiqueta" tamano={17} />
			Etiquetar direcciones
		</span>
	{/if}

	{#if elegidas.length}
		<ul class="elegidas">
			{#each elegidas as c (c.alias)}
				<li>
					<span class="mini">
						{#if c.avatar}<img src={img(c.avatar, 400)} alt="" />{/if}
					</span>
					{c.nombre}
					<button
						type="button"
						onclick={() => (seleccionadas = seleccionadas.filter((a) => a !== c.alias))}
						aria-label="Quitar a {c.nombre}"
					>
						<IconoEstudio nombre="cerrar" tamano={14} />
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	{#if seleccionadas.length < 10}
		<input
			type="search"
			bind:value={busqueda}
			placeholder="Buscar una dirección…"
			aria-label="Buscar una dirección para etiquetar"
		/>

		{#if busqueda.trim() && disponibles.length}
			<ul class="resultados">
				{#each disponibles as c (c.alias)}
					<li>
						<button
							type="button"
							onclick={() => {
								seleccionadas = [...seleccionadas, c.alias];
								busqueda = '';
							}}
						>
							<span class="mini">
								{#if c.avatar}<img src={img(c.avatar, 400)} alt="" />{/if}
							</span>
							{c.nombre}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	{:else}
		<p class="tope">Diez es el máximo por publicación.</p>
	{/if}

	<p class="nota">
		Sólo cuentas municipales. A las personas no se las etiqueta: su nombre junto a su cara en un sitio
		de gobierno tiene que pedirlo cada una.
	</p>
</div>

<style>
	.campo {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.etiqueta {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--texto-suave);
	}

	.elegidas {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.elegidas li {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.25rem 0.35rem 0.25rem 0.25rem;
		border: 1px solid var(--borde);
		font-size: 0.78rem;
	}

	.elegidas button {
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border: none;
		background: none;
		color: var(--texto-suave);
		cursor: pointer;
	}

	input {
		min-height: 2.6rem;
		padding-inline: 0.75rem;
		border: 1px solid var(--borde);
		background: var(--superficie);
		color: var(--texto);
		font-family: inherit;
		font-size: 0.88rem;
	}

	.resultados {
		border: 1px solid var(--borde);
		background: var(--superficie-elevada);
	}

	.resultados button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		min-height: 42px;
		padding: 0.4rem 0.6rem;
		border: none;
		background: none;
		color: var(--texto);
		font-family: inherit;
		font-size: 0.85rem;
		text-align: left;
		cursor: pointer;
	}

	.resultados button:hover {
		background: var(--superficie-alt);
	}

	.mini {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 22px;
		height: 22px;
		overflow: hidden;
		border-radius: 999px;
		background: var(--superficie-alt);
	}

	.mini img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.nota,
	.tope {
		font-size: 0.75rem;
		line-height: 1.5;
		color: var(--texto-suave);
	}
</style>
