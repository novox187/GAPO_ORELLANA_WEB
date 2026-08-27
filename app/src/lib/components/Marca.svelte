<script lang="ts">
	import lockup from '$lib/marca/lockup-color.svg?raw';

	/**
	 * Logotipo OFICIAL del municipio, recortado del SVG que publica
	 * orellana.gob.ec (/static/img/header-main.svg): la marca denominativa
	 * "FRANCISCO DE ORELLANA" con la hoja inscrita en la O, sobre la barra
	 * amarilla "ALCALDÍA". No es una reinterpretación.
	 *
	 * `invertido` fuerza la variante blanca para superficies siempre
	 * oscuras (el pie). En modo oscuro del sistema la variante blanca se
	 * activa sola, porque de lo contrario "ALCALDÍA" queda en carbón sobre
	 * fondo oscuro: sus glifos sobresalen unos píxeles por encima de la
	 * barra amarilla y ese borde se vuelve invisible.
	 */
	let { invertido = false, alto = 'h-10' }: { invertido?: boolean; alto?: string } = $props();
</script>

<a
	href="/"
	class="inline-flex items-center no-underline"
	aria-label="Inicio, Alcaldía de Francisco de Orellana"
>
	<span class="marca {alto}" class:invertido>
		{@html lockup}
	</span>
	<span class="sr-only">Alcaldía de Francisco de Orellana</span>
</a>

<style>
	.marca :global(svg) {
		height: 100%;
		width: auto;
		display: block;
	}

	/*
	   Variante blanca, replicando logo-blanco.svg oficial (que declara solo
	   blanco, amarillo y verde): los tres verdes de la marca y el texto
	   "ALCALDÍA" pasan a blanco. La barra amarilla se conserva.
	*/
	.marca.invertido :global(.st1),
	.marca.invertido :global(.st5),
	.marca.invertido :global(.st10),
	.marca.invertido :global(.st-alcaldia) {
		fill: #ffffff;
	}

	@media (prefers-color-scheme: dark) {
		:global(:root:not([data-theme='light'])) .marca :global(.st1),
		:global(:root:not([data-theme='light'])) .marca :global(.st5),
		:global(:root:not([data-theme='light'])) .marca :global(.st10),
		:global(:root:not([data-theme='light'])) .marca :global(.st-alcaldia) {
			fill: #ffffff;
		}
	}

	/* Modo oscuro elegido a mano, con el sistema en claro. */
	:global(:root[data-theme='dark']) .marca :global(.st1),
	:global(:root[data-theme='dark']) .marca :global(.st5),
	:global(:root[data-theme='dark']) .marca :global(.st10),
	:global(:root[data-theme='dark']) .marca :global(.st-alcaldia) {
		fill: #ffffff;
	}
</style>
