<script lang="ts">
	import { img, type Cuenta } from '$lib/api';

	/**
	 * El avatar de una cuenta institucional, con el anillo de historia
	 * opcional. El anillo no es el degradado morado-naranja de Instagram: es
	 * la banda de teselas del logotipo municipal en un cono de color, así que
	 * el gesto se lee como "hay algo nuevo" sin dejar de ser Mosaico.
	 */
	let {
		cuenta,
		tamano = 44,
		conAnillo = false,
		visto = false
	}: {
		cuenta: Cuenta;
		tamano?: number;
		conAnillo?: boolean;
		visto?: boolean;
	} = $props();
</script>

<span
	class="avatar inline-flex shrink-0 items-center justify-center rounded-full"
	class:con-anillo={conAnillo}
	class:visto
	style="--tamano: {tamano}px"
>
	<span class="hueco flex items-center justify-center overflow-hidden rounded-full bg-[var(--superficie-alt)]">
		{#if cuenta.avatar}
			<img
				src={img(cuenta.avatar, 400)}
				alt=""
				width={tamano}
				height={tamano}
				loading="lazy"
				class="h-full w-full object-cover"
			/>
		{:else}
			<span class="text-[0.7em] font-bold text-[var(--texto-suave)]" aria-hidden="true">
				{cuenta.nombre.slice(0, 1)}
			</span>
		{/if}
	</span>
</span>

<style>
	.avatar {
		width: var(--tamano);
		height: var(--tamano);
	}

	.hueco {
		width: 100%;
		height: 100%;
	}

	/*
	  El anillo es un padding de 2.5px entre el cono de color y la foto —el
	  mismo truco que usa cualquier avatar de historia— con un segundo aro de
	  fondo de página para separar el color de la fotografía. Sin ese aro
	  intermedio, una foto con bordes claros se funde con el anillo y el gesto
	  desaparece.
	*/
	.con-anillo {
		padding: 2.5px;
		background: conic-gradient(
			from -45deg,
			var(--color-selva-600),
			var(--color-achiote-500) 35%,
			var(--color-selva-400) 70%,
			var(--color-selva-600) 100%
		);
	}

	.con-anillo .hueco {
		box-shadow: 0 0 0 2.5px var(--superficie);
	}

	/* Historia ya vista: el anillo se apaga a un gris neutro, como en cualquier red social. */
	.con-anillo.visto {
		background: var(--borde);
	}
</style>
