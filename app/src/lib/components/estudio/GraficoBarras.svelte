<script lang="ts">
	import { numero } from './viz';

	/**
	 * Barras horizontales para un reparto: parroquias, tramos de edad,
	 * dispositivos.
	 *
	 * Horizontales y no verticales porque las etiquetas son nombres largos
	 * («San José de Guayusa», «Puerto Francisco de Orellana») y en vertical
	 * habría que girarlas o recortarlas. Un nombre de parroquia girado
	 * noventa grados no lo lee nadie.
	 *
	 * Todas las barras del mismo color. Oscurecer las más grandes sería
	 * pintar dos veces el mismo dato —la longitud ya lo dice— y gastar el
	 * único canal libre que queda en información que ya está.
	 */
	let {
		titulo,
		filas,
		unidad = 'personas',
		vacio = 'Sin datos todavía.'
	}: {
		titulo: string;
		filas: { etiqueta: string; total: number; porcentaje: number }[];
		unidad?: string;
		vacio?: string;
	} = $props();

	const maximo = $derived(Math.max(1, ...filas.map((f) => f.total)));
</script>

<figure class="grafico">
	<figcaption class="titulo">{titulo}</figcaption>

	{#if filas.length === 0}
		<p class="vacio">{vacio}</p>
	{:else}
		<ul class="filas">
			{#each filas as f (f.etiqueta)}
				<li>
					<span class="etiqueta">{f.etiqueta}</span>
					<span class="pista">
						<!-- El ancho es proporción del máximo, no del total: comparar
						     alturas relativas es lo que hace una barra. -->
						<span class="barra" style="width: {Math.max((f.total / maximo) * 100, 1.5)}%"></span>
					</span>
					<span class="valor">
						{numero(f.total)}
						<span class="suave">{f.porcentaje.toLocaleString('es-EC', { maximumFractionDigits: 1 })} %</span>
					</span>
				</li>
			{/each}
		</ul>

		<p class="pie">
			{numero(filas.reduce((s, f) => s + f.total, 0))}
			{unidad} en total
		</p>
	{/if}
</figure>

<style>
	.grafico {
		margin: 0;
	}

	.titulo {
		font-size: 0.95rem;
		font-weight: 700;
		margin-bottom: 0.75rem;
	}

	.filas {
		display: flex;
		flex-direction: column;
		/* El hueco de 6px es lo que separa una barra de la siguiente: la
		   separación la hace el fondo, no un borde alrededor de la barra. */
		gap: 0.375rem;
	}

	.filas li {
		display: grid;
		grid-template-columns: minmax(6.5rem, 11rem) 1fr auto;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.82rem;
	}

	.etiqueta {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.pista {
		display: block;
		height: 14px;
		background: var(--superficie-alt);
		border-radius: 2px;
	}

	.barra {
		display: block;
		height: 100%;
		background: var(--viz-acento);
		/* Cuadrada contra la base, redondeada en la punta: la esquina viva
		   marca de dónde arranca la medida. */
		border-radius: 2px 4px 4px 2px;
		transition: width 0.35s var(--ease-suave);
	}

	.valor {
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.valor .suave {
		color: var(--texto-suave);
		margin-left: 0.35rem;
	}

	.pie,
	.vacio {
		margin-top: 0.6rem;
		font-size: 0.8rem;
		color: var(--texto-suave);
	}

	@media (prefers-reduced-motion: reduce) {
		.barra {
			transition: none;
		}
	}
</style>
