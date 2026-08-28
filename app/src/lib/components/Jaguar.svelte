<script lang="ts">
	import Pictograma from '$lib/components/Pictograma.svelte';

	/**
	 * El jaguar, mascota del asistente.
	 *
	 * No es un avatar decorativo traído de un banco de imágenes: es el
	 * pictograma oficial del municipio, el mismo que está en la banda del
	 * logotipo. Que el asistente tenga la cara de un animal del cantón —y no
	 * un robot o una chispa— dice de quién es esta herramienta.
	 */
	let {
		tamano = 'md',
		pensando = false
	}: { tamano?: 'sm' | 'md' | 'lg'; pensando?: boolean } = $props();

	const CAJA = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-16 w-16' };
	const ICONO = { sm: 'h-5 w-5', md: 'h-6 w-6', lg: 'h-10 w-10' };
</script>

<span
	class="tesela-jaguar grid shrink-0 place-items-center bg-selva-800 text-white {CAJA[tamano]}"
	class:pensando
	aria-hidden="true"
>
	<Pictograma nombre="cultura" clase={ICONO[tamano]} />
</span>

<style>
	/* El bisel en la esquina es la firma del logotipo municipal. */
	.tesela-jaguar {
		clip-path: polygon(0 0, 100% 0, 100% calc(100% - 0.35rem), calc(100% - 0.35rem) 100%, 0 100%);
	}

	/* Mientras piensa, respira. Un pulso lento y muy contenido: es un
	   asistente municipal, no un juguete. */
	.pensando {
		animation: respirar 2.4s ease-in-out infinite;
	}

	@keyframes respirar {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.72;
			transform: scale(0.94);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.pensando {
			animation: none;
			opacity: 0.8;
		}
	}
</style>
