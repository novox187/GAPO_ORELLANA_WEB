<script lang="ts">
	import { numero } from './viz';

	/**
	 * Columnas para una serie corta y ordenada: las veinticuatro horas del
	 * día, los siete días de la semana.
	 *
	 * Es lo que responde a la pregunta que de verdad se hace quien publica —
	 * «¿a qué hora conviene subir esto?»— y por eso destaca el máximo en vez
	 * de dejar veinticuatro columnas iguales: la respuesta es una columna
	 * concreta, no el conjunto.
	 */
	let {
		titulo,
		columnas,
		nota = ''
	}: {
		titulo: string;
		columnas: { etiqueta: string; total: number; destacar?: boolean }[];
		nota?: string;
	} = $props();

	const maximo = $derived(Math.max(1, ...columnas.map((c) => c.total)));
	const hayDatos = $derived(columnas.some((c) => c.total > 0));
	const mejor = $derived(hayDatos ? columnas.reduce((a, b) => (b.total > a.total ? b : a)) : null);
</script>

<figure class="grafico">
	<figcaption class="cabecera">
		<h3 class="titulo">{titulo}</h3>
		{#if mejor}
			<p class="destacado">Más actividad: <strong>{mejor.etiqueta}</strong></p>
		{/if}
	</figcaption>

	{#if !hayDatos}
		<p class="vacio">Sin datos todavía.</p>
	{:else}
		<ul class="columnas">
			{#each columnas as c (c.etiqueta)}
				<li>
					<span class="pista" title="{c.etiqueta}: {numero(c.total)}">
						<span
							class="columna"
							class:maxima={c === mejor}
							style="height: {Math.max((c.total / maximo) * 100, c.total > 0 ? 4 : 0)}%"
						></span>
					</span>
					<span class="etiqueta">{c.etiqueta}</span>
					<span class="sr-only">{numero(c.total)}</span>
				</li>
			{/each}
		</ul>
	{/if}

	{#if nota}
		<p class="nota">{nota}</p>
	{/if}
</figure>

<style>
	.grafico {
		margin: 0;
	}

	.cabecera {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.titulo {
		font-size: 0.95rem;
		font-weight: 700;
	}

	.destacado {
		font-size: 0.8rem;
		color: var(--texto-suave);
	}

	.columnas {
		display: flex;
		align-items: flex-end;
		/* 2px de hueco entre columnas contiguas: separa el fondo, no un borde. */
		gap: 2px;
		height: 120px;
	}

	.columnas li {
		display: flex;
		flex: 1;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		height: 100%;
		min-width: 0;
	}

	.pista {
		display: flex;
		flex: 1;
		align-items: flex-end;
		width: 100%;
		/* Tope de 24px de grosor: con siete columnas, una barra de 90px de
		   ancho deja de leerse como medida y pasa a leerse como bloque. */
		max-width: 24px;
	}

	.columna {
		display: block;
		width: 100%;
		background: var(--viz-contexto);
		border-radius: 4px 4px 2px 2px;
		transition: height 0.35s var(--ease-suave);
	}

	.columna.maxima {
		background: var(--viz-acento);
	}

	.etiqueta {
		font-size: 0.62rem;
		color: var(--texto-suave);
		white-space: nowrap;
	}

	.nota,
	.vacio {
		margin-top: 0.6rem;
		font-size: 0.8rem;
		color: var(--texto-suave);
	}

	@media (prefers-reduced-motion: reduce) {
		.columna {
			transition: none;
		}
	}
</style>
