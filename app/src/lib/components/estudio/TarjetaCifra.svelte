<script lang="ts">
	import { cifra as compacta, variacion, type Cifra } from '$lib/estudio';
	import { numero } from './viz';

	/**
	 * Una cifra del panel: rótulo, número, variación contra el periodo
	 * anterior y una chispa de tendencia.
	 *
	 * No es un gráfico de una sola barra. Cuando el dato es un número, la
	 * forma correcta es el número: dibujarle una barra al lado no añade nada
	 * y ocupa el sitio de la comparación, que sí lo añade.
	 *
	 * La variación puede ser nula, y entonces se dice con palabras en vez de
	 * enseñar un «+100 %». Ver InformeMetricas: sin un periodo anterior con
	 * el que comparar, el porcentaje no existe.
	 */
	let {
		rotulo,
		dato,
		serie = [],
		sufijo = '',
		ayuda = ''
	}: {
		rotulo: string;
		dato: Cifra;
		serie?: { valor: number }[];
		sufijo?: string;
		ayuda?: string;
	} = $props();

	const texto = $derived(variacion(dato.variacion));
	const sube = $derived((dato.variacion ?? 0) > 0);

	/** Chispa de tendencia: doce puntos, sin ejes ni valores. Es una silueta, no un gráfico. */
	const chispa = $derived.by(() => {
		const ultimos = serie.slice(-12).map((p) => p.valor);
		if (ultimos.length < 2) return '';

		const max = Math.max(...ultimos, 1);

		return ultimos
			.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / (ultimos.length - 1)) * 100} ${20 - (v / max) * 18}`)
			.join(' ');
	});
</script>

<div class="tarjeta">
	<p class="rotulo">
		{rotulo}
		{#if ayuda}
			<span class="ayuda" title={ayuda} aria-hidden="true">?</span>
			<span class="sr-only">{ayuda}</span>
		{/if}
	</p>

	<p class="valor" title={numero(dato.valor)}>
		{compacta(dato.valor)}{#if sufijo}<span class="sufijo">{sufijo}</span>{/if}
	</p>

	<p class="variacion" class:sube class:baja={!sube && texto !== null}>
		{#if texto}
			<span aria-hidden="true">{sube ? '▲' : '▼'}</span>
			{texto}
			<span class="suave">frente al periodo anterior</span>
		{:else}
			<span class="suave">sin periodo anterior con el que comparar</span>
		{/if}
	</p>

	{#if chispa}
		<svg viewBox="0 0 100 22" preserveAspectRatio="none" aria-hidden="true" class="chispa">
			<path d={chispa} />
		</svg>
	{/if}
</div>

<style>
	.tarjeta {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		/* Más aire vertical: la cifra es lo que se viene a leer y necesita
		   sitio alrededor para leerse como titular y no como celda. */
		padding: 1rem 1.05rem 0.85rem;
		background: var(--superficie-elevada);
		border: var(--canto);
		border-radius: var(--radius-md);
		box-shadow: var(--elev-1);
		transition:
			box-shadow var(--transicion),
			transform var(--transicion);
	}

	/* Se levanta al pasar por encima: dice que la tarjeta es una cosa, no un
	   trozo de tabla. Dos píxeles bastan; más y parece que se despega. */
	.tarjeta:hover {
		box-shadow: var(--elev-2);
		transform: translateY(-2px);
	}

	/*
	  Bloque, no flex: con flex el icono de ayuda se descolgaba al final
	  cuando el rótulo pasaba a dos líneas («Seguidores nuevos») en vez de
	  quedarse pegado a la última palabra.

	  `min-height` de dos líneas para que la cifra empiece a la misma altura
	  en toda la fila. Cuesta un poco de aire en las tarjetas de rótulo corto
	  y lo vale: una hilera de cifras a alturas distintas deja de leerse como
	  hilera.
	*/
	.rotulo {
		display: block;
		min-height: 2.1em;
		font-size: 0.72rem;
		font-weight: 600;
		line-height: 1.35;
		color: var(--texto-suave);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.ayuda {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 0.95rem;
		height: 0.95rem;
		margin-left: 0.3rem;
		vertical-align: -1px;
		border: 1px solid var(--borde);
		border-radius: 999px;
		font-size: 0.58rem;
		cursor: help;
	}

	/* La cifra sube de 1.6 a 1.9rem y estira el ancho: en un panel, el
	   número es el contenido y todo lo demás es su etiqueta. */
	.valor {
		font-size: 1.9rem;
		font-weight: 700;
		font-stretch: 112%;
		line-height: 1.02;
		letter-spacing: -0.01em;
		font-variant-numeric: tabular-nums;
	}

	.sufijo {
		font-size: 0.9rem;
		font-weight: 400;
		color: var(--texto-suave);
		margin-left: 0.15rem;
	}

	.variacion {
		font-size: 0.74rem;
		color: var(--texto-suave);
	}

	/*
	  Verde arriba y rojo abajo sólo aquí, donde el color SÍ significa
	  dirección y va acompañado de la flecha y del signo: nunca es el color
	  el único canal. En los gráficos, el color es identidad y no juicio.
	*/
	.variacion.sube {
		color: var(--color-selva-900);
	}

	.variacion.baja {
		color: var(--color-error);
	}

	:global(:root[data-theme='dark']) .variacion.sube {
		color: var(--color-selva-400);
	}

	@media (prefers-color-scheme: dark) {
		:global(:root:not([data-theme='light'])) .variacion.sube {
			color: var(--color-selva-400);
		}
	}

	.variacion .suave {
		color: var(--texto-suave);
	}

	.chispa {
		width: 100%;
		height: 22px;
		margin-top: auto;
		padding-top: 0.5rem;
	}

	.chispa path {
		fill: none;
		stroke: var(--viz-acento);
		stroke-width: 1.5;
		stroke-linecap: round;
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}

	@media (prefers-reduced-motion: reduce) {
		.tarjeta,
		.tarjeta:hover {
			transition: none;
			transform: none;
		}
	}
</style>
