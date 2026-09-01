<script lang="ts">
	import { img, social, type PublicacionResumen } from '$lib/api';

	/**
	 * Lo que este vecino guardó para después.
	 *
	 * Vive en «Mi cuenta» y no en el perfil de ninguna cuenta municipal, y esa
	 * es la decisión: guardar es privado de una persona, y quien publica lo
	 * hace en nombre de una institución. Enseñar en el perfil de la Alcaldía
	 * lo que guardó quien lleva Comunicación mezclaría dos identidades que el
	 * resto del sistema mantiene separadas a propósito.
	 */
	let guardadas = $state<PublicacionResumen[]>([]);
	let cursor = $state<number | null>(null);
	let cargando = $state(true);

	$effect(() => {
		let vigente = true;

		social
			.coleccionGuardada()
			.then((r) => {
				if (!vigente) return;
				guardadas = r.data;
				cursor = r.meta.siguiente_cursor;
			})
			.catch(() => null)
			.finally(() => vigente && (cargando = false));

		return () => {
			vigente = false;
		};
	});

	async function cargarMas() {
		if (cursor === null) return;

		const r = await social.coleccionGuardada(cursor);
		guardadas = [...guardadas, ...r.data];
		cursor = r.meta.siguiente_cursor;
	}
</script>

<section class="bloque">
	<h2>Guardado</h2>

	{#if cargando}
		<p class="nota" role="status">Cargando…</p>
	{:else if guardadas.length === 0}
		<p class="nota">
			Todavía no has guardado nada. El icono de la esquina de cada publicación la deja aquí, y sólo
			la ves tú.
		</p>
	{:else}
		<ul class="rejilla">
			{#each guardadas as p (p.id)}
				<li>
					<a href={p.url} class="tesela">
						{#if p.imagen}
							<img src={img(p.imagen, 400)} alt={p.imagen.altPendiente ? '' : p.imagen.alt} loading="lazy" />
						{/if}
						<span class="sr-only">{p.tipo === 'nota' ? p.titulo : p.pie}</span>
					</a>
				</li>
			{/each}
		</ul>

		{#if cursor !== null}
			<button type="button" onclick={cargarMas}>Cargar más</button>
		{/if}
	{/if}
</section>

<style>
	.bloque {
		padding: 1rem;
		border: 1px solid var(--borde);
		text-align: left;
	}

	h2 {
		margin-bottom: 0.6rem;
		font-size: 0.95rem;
		font-weight: 700;
	}

	.rejilla {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 2px;
	}

	.tesela {
		display: block;
		aspect-ratio: 1;
		overflow: hidden;
		background: var(--superficie-alt);
	}

	.tesela img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.nota {
		font-size: 0.82rem;
		line-height: 1.6;
		color: var(--texto-suave);
	}

	button {
		width: 100%;
		min-height: 2.5rem;
		margin-top: 0.6rem;
		border: 1px solid var(--borde);
		background: none;
		color: var(--texto);
		font-family: inherit;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
	}
</style>
