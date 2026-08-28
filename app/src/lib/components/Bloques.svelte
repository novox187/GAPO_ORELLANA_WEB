<script lang="ts">
	import type { Bloque } from '$lib/api';
	import { resolverEnlaceItem } from '$lib/bloques';

	/**
	 * Renderiza la secuencia de bloques extraída de una página municipal,
	 * preservando el orden del original. Las tablas van en un contenedor con
	 * scroll propio para que nunca desborden la página en móvil.
	 *
	 * `indice` es opcional: Transparencia lo pasa para resolver los items de
	 * lista que llegan sin URL propia (la extracción solo dejó el nombre del
	 * archivo) y para mostrar el tipo de documento como badge. Sin `indice`
	 * el comportamiento es el de siempre — enlace simple si `item.url`
	 * existe, texto plano si no — así "El cantón" no cambia en nada.
	 */
	let {
		bloques,
		indice
	}: { bloques: Bloque[]; indice?: Map<string, { url: string; tipo: string }> } = $props();
</script>

<div class="contenido">
	{#each bloques as b, i (i)}
		{#if b.tipo === 'titulo'}
			{#if (b.nivel ?? 2) <= 2}
				<h2>{b.texto}</h2>
			{:else if b.nivel === 3}
				<h3>{b.texto}</h3>
			{:else}
				<h4>{b.texto}</h4>
			{/if}
		{:else if b.tipo === 'parrafo'}
			<p>{b.texto}</p>
		{:else if b.tipo === 'lista'}
			<ul>
				{#each b.items ?? [] as it, j (j)}
					{@const enlace = resolverEnlaceItem(it, indice)}
					<li>
						{#if enlace}
							<a
								href={enlace.url}
								target={enlace.url.startsWith('http') ? '_blank' : undefined}
								rel={enlace.url.startsWith('http') ? 'noopener' : undefined}
							>
								{#if enlace.tipo}<span class="badge-tipo">{enlace.tipo}</span>{/if}
								{it.texto}
							</a>
						{:else}
							{it.texto}
						{/if}
					</li>
				{/each}
			</ul>
		{:else if b.tipo === 'tabla'}
			<div class="tabla-scroll">
				<table>
					<tbody>
						{#each b.filas ?? [] as fila, j (j)}
							<tr>
								{#each fila as celda, k (k)}
									<td>{celda}</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/each}
</div>

<style>
	.contenido :global(h2) {
		font-stretch: 110%;
		font-weight: 700;
		letter-spacing: 0.005em;
		line-height: 1.18;
		font-size: 1.4rem;
		margin: 2.25rem 0 0.75rem;
		color: var(--texto);
	}
	.contenido :global(h3) {
		font-weight: 700;
		font-size: 1.1rem;
		margin: 1.75rem 0 0.5rem;
	}
	.contenido :global(h4) {
		font-weight: 600;
		font-size: 1rem;
		margin: 1.25rem 0 0.4rem;
	}
	.contenido :global(h2:first-child),
	.contenido :global(h3:first-child) {
		margin-top: 0;
	}
	.contenido :global(p) {
		margin-bottom: 1rem;
		line-height: 1.7;
		color: var(--texto-suave);
		max-width: 65ch;
	}
	.contenido :global(ul) {
		list-style: disc;
		padding-left: 1.3rem;
		margin-bottom: 1.25rem;
		max-width: 65ch;
	}
	.contenido :global(li) {
		margin-bottom: 0.4rem;
		line-height: 1.65;
		color: var(--texto-suave);
		/* Nombres de archivo largos sin espacios (guiones bajos, no
		   separadores) desbordan el contenedor en móvil si no se
		   pueden partir dentro de la "palabra". */
		overflow-wrap: anywhere;
	}
	.contenido :global(li a) {
		color: var(--enlace);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.contenido :global(li a:hover) {
		text-decoration-thickness: 2px;
	}
	.contenido :global(.badge-tipo) {
		display: inline-block;
		margin-right: 0.4em;
		padding: 0.05em 0.4em;
		font-size: 0.68em;
		font-weight: 700;
		letter-spacing: 0.02em;
		background: var(--superficie-alt);
		color: var(--texto-suave);
		text-decoration: none;
	}
	.tabla-scroll {
		overflow-x: auto;
		margin-bottom: 1.5rem;
	}
	.contenido :global(table) {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}
	.contenido :global(td) {
		border: 1px solid var(--borde);
		padding: 0.55rem 0.7rem;
		text-align: left;
		vertical-align: top;
	}
</style>
