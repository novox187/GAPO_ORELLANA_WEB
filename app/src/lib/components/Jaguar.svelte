<script lang="ts">
	import Pictograma from '$lib/components/Pictograma.svelte';

	/**
	 * El jaguar, mascota del asistente.
	 *
	 * No es un avatar decorativo traído de un banco de imágenes: es el
	 * pictograma oficial del municipio, el mismo que está en la banda del
	 * logotipo. Que el asistente tenga la cara de un animal del cantón —y no
	 * un robot o una chispa— dice de quién es esta herramienta.
	 *
	 * Va suelto, sin la tesela de fondo que sí usa el resto del sitio: dentro
	 * de la conversación un cuadrado de color leía como un logotipo pegado a
	 * cada mensaje, y lo que hace falta es una cara. El verde lo lleva ahora el
	 * propio trazo.
	 */
	let {
		tamano = 'md',
		pensando = false
	}: { tamano?: 'sm' | 'md' | 'lg'; pensando?: boolean } = $props();

	// `pensando` cubre todo el rato que el asistente trabaja —buscar y
	// redactar—, no sólo el instante de la búsqueda. Recuperar tarda 20 ms;
	// si la animación se limitara a eso, no se vería nunca.

	const CAJA = { sm: 'h-7 w-7', md: 'h-9 w-9', lg: 'h-20 w-20' };
</script>

<!--
	selva-800 y no el 600: sobre fondo claro el 600 se queda en 3,1:1 y no
	llega al 4,5:1. En oscuro se invierte, y ahí el 800 es el que no se ve.
-->
<span
	class="grid shrink-0 place-items-center text-selva-800 dark:text-selva-400 {CAJA[tamano]}"
	class:pensando
	aria-hidden="true"
>
	<Pictograma nombre="cultura" clase="h-full w-full" />
</span>

<style>
	/* Mientras trabaja, respira: se ensancha y vuelve, como quien toma aire.
	   Un 10 % de escala se nota sin llegar a ser un juguete saltando, y 2,4 s
	   es el ritmo de una respiración tranquila — no de un cronómetro. La
	   opacidad acompaña muy poco: si parpadeara, parecería que falla algo. */
	.pensando {
		animation: respirar 2.4s ease-in-out infinite;
		transform-origin: center;
	}

	@keyframes respirar {
		0%,
		100% {
			transform: scale(1);
			opacity: 0.92;
		}
		50% {
			transform: scale(1.1);
			opacity: 1;
		}
	}

	/* Sin movimiento, la espera se señala bajando la opacidad: quien pidió no
	   ver animaciones sigue necesitando saber que el asistente está ocupado. */
	@media (prefers-reduced-motion: reduce) {
		.pensando {
			animation: none;
			opacity: 0.65;
		}
	}
</style>
