<script lang="ts">
	/**
	 * El sello de cuenta verificada. No es el check azul genérico: es una
	 * roseta de ocho puntas —la forma clásica de un sello institucional— en
	 * el verde de marca, porque en este sitio sólo hay veintidós cuentas y
	 * las veintidós son la Alcaldía o una de sus direcciones. No hay
	 * solicitud de verificación: se es o no se es una cuenta municipal.
	 */
	let { tamano = 15 }: { tamano?: number } = $props();
</script>

<svg
	width={tamano}
	height={tamano}
	viewBox="0 0 24 24"
	fill="none"
	role="img"
	aria-label="Cuenta municipal verificada"
	class="shrink-0"
>
	<path
		d="M12 1.5 14.2 4l3.4-.6.7 3.4 3 1.8-1.5 3.1 1.5 3.1-3 1.8-.7 3.4-3.4-.6L12 22.5l-2.2-2.5-3.4.6-.7-3.4-3-1.8 1.5-3.1-1.5-3.1 3-1.8.7-3.4 3.4.6Z"
		fill="var(--color-selva-600)"
	/>
	<path
		d="m8.2 12.3 2.6 2.6 5-5.4"
		stroke="#ffffff"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
</svg>
