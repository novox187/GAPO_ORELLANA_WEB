<script lang="ts">
	import type { Cobertura } from '$lib/estudio';

	/**
	 * «Desde cuándo hay datos».
	 *
	 * Es el aviso que impide el malentendido más caro de este panel: pedir
	 * noventa días la semana en que se encendió la medición y leer los
	 * números como los de un trimestre flojo. No es una nota al pie ni un
	 * icono de ayuda — va arriba, en texto, porque cambia cómo se leen todas
	 * las cifras de la pantalla.
	 */
	let { cobertura, dias }: { cobertura: Cobertura; dias: number } = $props();

	const legible = $derived(
		cobertura.midiendo_desde
			? new Date(`${cobertura.midiendo_desde}T12:00:00`).toLocaleDateString('es-EC', {
					day: 'numeric',
					month: 'long',
					year: 'numeric'
				})
			: null
	);
</script>

{#if !cobertura.midiendo_desde}
	<p class="aviso" role="status">
		<strong>Todavía no hay nada medido para esta cuenta.</strong>
		Las cifras aparecerán cuando alguien vea sus publicaciones. Un cero aquí significa «no se ha
		contado nada», no «no lo vio nadie».
	</p>
{:else if cobertura.periodo_incompleto}
	<p class="aviso" role="status">
		<strong>Se mide desde el {legible}.</strong>
		Los {dias} días que pediste empiezan antes de esa fecha, así que el periodo está incompleto: lo
		anterior no está bajo, es que no existe.
	</p>
{/if}

<style>
	.aviso {
		display: flex;
		gap: 0.7rem;
		padding: 0.85rem 1rem;
		border: var(--canto);
		border-left: 3px solid var(--color-achiote-500);
		border-radius: var(--radius-md);
		background: var(--superficie-elevada);
		box-shadow: var(--elev-1);
		font-size: 0.84rem;
		line-height: 1.6;
		color: var(--texto-suave);
	}

	.aviso strong {
		color: var(--texto);
	}
</style>
