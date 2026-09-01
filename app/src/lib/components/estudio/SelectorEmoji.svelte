<script lang="ts">
	/**
	 * El selector de emoji del compositor: busca y pinta el índice que dejó
	 * `scripts/openmoji/extraer.py` en `static/openmoji-indice.json`.
	 *
	 * OpenMoji es la contraparte abierta del catálogo de stickers: aquí no
	 * hay nada que aprobar porque un emoji no afirma nada sobre el
	 * municipio, así que el índice se sirve entero y quien compone elige
	 * libremente — al revés que en `stickers.ts`, donde la lista la fija el
	 * código.
	 *
	 * Sin virtualizar la rejilla: cada pestaña sólo pinta hasta `TANDA`
	 * emoji a la vez, con un botón «Ver más» para el resto. 2456 entradas de
	 * golpe sí notarían en un teléfono; unos pocos cientos, no.
	 */
	let { elegir }: { elegir: (hexcode: string) => void } = $props();

	interface EntradaIndice {
		hex: string;
		g: string;
		sg: string[];
		n: string;
		t: string;
	}

	const GRUPOS: { clave: string; etiqueta: string }[] = [
		{ clave: 'smileys-emotion', etiqueta: 'Caras' },
		{ clave: 'people-body', etiqueta: 'Gente' },
		{ clave: 'animals-nature', etiqueta: 'Animales' },
		{ clave: 'food-drink', etiqueta: 'Comida' },
		{ clave: 'travel-places', etiqueta: 'Lugares' },
		{ clave: 'activities', etiqueta: 'Actividades' },
		{ clave: 'objects', etiqueta: 'Objetos' },
		{ clave: 'symbols', etiqueta: 'Símbolos' },
		{ clave: 'flags', etiqueta: 'Banderas' },
		{ clave: 'extras-openmoji', etiqueta: 'Extras' },
		{ clave: 'extras-unicode', etiqueta: 'Otros' }
	];

	const TANDA = 180;

	let indice = $state<EntradaIndice[] | null>(null);
	let error = $state(false);
	let grupo = $state(GRUPOS[0].clave);
	let busqueda = $state('');
	let visibles = $state(TANDA);

	$effect(() => {
		let vigente = true;

		fetch('/openmoji-indice.json')
			.then((r) => {
				if (!r.ok) throw new Error(String(r.status));
				return r.json();
			})
			.then((datos: EntradaIndice[]) => {
				if (vigente) indice = datos;
			})
			.catch(() => {
				if (vigente) error = true;
			});

		return () => {
			vigente = false;
		};
	});

	const filtrados = $derived.by(() => {
		if (!indice) return [];

		const q = busqueda.trim().toLowerCase();

		if (q) {
			return indice.filter((e) => e.n.toLowerCase().includes(q) || e.t.toLowerCase().includes(q));
		}

		return indice.filter((e) => e.g === grupo);
	});

	$effect(() => {
		// Cambiar de pestaña o de búsqueda vuelve a empezar la tanda visible.
		void grupo;
		void busqueda;
		visibles = TANDA;
	});
</script>

<div class="selector">
	<label class="buscar">
		<span class="sr-only">Buscar emoji</span>
		<input type="search" bind:value={busqueda} placeholder="Buscar: corazón, obra, sol…" maxlength="40" />
	</label>

	{#if !busqueda.trim()}
		<div class="pestanas" role="tablist" aria-label="Categorías de emoji">
			{#each GRUPOS as g (g.clave)}
				<button
					type="button"
					role="tab"
					aria-selected={grupo === g.clave}
					class:activa={grupo === g.clave}
					onclick={() => (grupo = g.clave)}
				>
					{g.etiqueta}
				</button>
			{/each}
		</div>
	{/if}

	{#if error}
		<p class="aviso">No se pudo cargar el catálogo de emoji.</p>
	{:else if !indice}
		<p class="aviso">Cargando…</p>
	{:else if filtrados.length === 0}
		<p class="aviso">Nada con ese nombre.</p>
	{:else}
		<ul class="rejilla">
			{#each filtrados.slice(0, visibles) as e (e.hex)}
				<li>
					<button type="button" title={e.n} onclick={() => elegir(e.hex)}>
						<img src="/openmoji/{e.hex}.svg" alt={e.n} loading="lazy" draggable="false" />
					</button>
				</li>
			{/each}
		</ul>

		{#if filtrados.length > visibles}
			<button type="button" class="ver-mas" onclick={() => (visibles += TANDA)}>
				Ver más ({filtrados.length - visibles})
			</button>
		{/if}
	{/if}
</div>

<style>
	.selector {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.buscar input {
		width: 100%;
		min-height: 2.5rem;
		padding-inline: 0.65rem;
		border: 1px solid var(--borde);
		background: var(--superficie);
		color: var(--texto);
		font-family: inherit;
		font-size: 0.88rem;
	}

	.pestanas {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		overflow-x: auto;
	}

	.pestanas button {
		flex: none;
		min-height: 2rem;
		padding-inline: 0.6rem;
		border: 1px solid var(--borde);
		background: var(--superficie);
		color: var(--texto-suave);
		font-family: inherit;
		font-size: 0.72rem;
		font-weight: 600;
		white-space: nowrap;
		cursor: pointer;
	}

	.pestanas button.activa {
		border-color: var(--marca);
		color: var(--texto);
	}

	.rejilla {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(2.6rem, 1fr));
		gap: 0.3rem;
		max-height: 15rem;
		overflow-y: auto;
	}

	.rejilla button {
		display: grid;
		place-items: center;
		aspect-ratio: 1;
		border: 1px solid transparent;
		background: none;
		cursor: pointer;
	}

	.rejilla button:hover,
	.rejilla button:focus-visible {
		border-color: var(--borde);
		background: var(--superficie-alt);
	}

	.rejilla img {
		width: 1.7rem;
		height: 1.7rem;
	}

	.ver-mas {
		align-self: center;
		min-height: 2.2rem;
		padding-inline: 0.9rem;
		border: 1px solid var(--borde);
		background: none;
		color: var(--texto-suave);
		font-family: inherit;
		font-size: 0.76rem;
		font-weight: 600;
		cursor: pointer;
	}

	.aviso {
		padding: 1.2rem 0;
		color: var(--texto-suave);
		font-size: 0.82rem;
		text-align: center;
	}
</style>
