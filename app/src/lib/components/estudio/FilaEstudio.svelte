<script lang="ts">
	import type { Snippet } from 'svelte';
	import IconoEstudio, { type NombreIcono } from './IconoEstudio.svelte';

	/**
	 * Una fila desplegable de la pantalla de detalles.
	 *
	 * El compositor pedía antes todos sus campos a la vez, uno debajo de
	 * otro: formato, pie, descripción, ubicación, etiquetas y participación
	 * en una sola columna. Funcionaba, pero obligaba a leer seis campos para
	 * publicar una fotografía con pie —que es lo que se hace el 90 % de las
	 * veces— y enterraba el botón de publicar al final del formulario.
	 *
	 * Plegadas, las filas dejan el pie de foto y el botón a la vista, y cada
	 * campo se abre sólo si hace falta. Lo que la fila enseña cerrada es su
	 * `resumen`: sin él, plegar sería esconder, y quien publica no sabría si
	 * ya puso la ubicación sin abrir la fila para comprobarlo.
	 */
	let {
		icono,
		rotulo,
		resumen = '',
		/** Un aviso corto a la derecha del rótulo: lo usa la descripción para lectores de pantalla cuando falta alguna. */
		alerta = '',
		abierta = $bindable(false),
		contenido
	}: {
		icono: NombreIcono;
		rotulo: string;
		resumen?: string;
		alerta?: string;
		abierta?: boolean;
		contenido: Snippet;
	} = $props();
</script>

<div class="fila" class:abierta>
	<button type="button" class="cabecera" onclick={() => (abierta = !abierta)} aria-expanded={abierta}>
		<IconoEstudio nombre={icono} tamano={20} />

		<span class="rotulo">
			{rotulo}
			{#if alerta}<em class="alerta">{alerta}</em>{/if}
		</span>

		{#if resumen && !abierta}
			<span class="resumen">{resumen}</span>
		{/if}

		<span class="galon" class:girado={abierta}>
			<IconoEstudio nombre="derecha" tamano={17} />
		</span>
	</button>

	{#if abierta}
		<div class="cuerpo">
			{@render contenido()}
		</div>
	{/if}
</div>

<style>
	.fila {
		border-bottom: 1px solid var(--borde);
	}

	.cabecera {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		min-height: 3.25rem;
		padding: 0.5rem 0;
		border: none;
		background: none;
		color: var(--texto);
		font-family: inherit;
		font-size: 0.95rem;
		text-align: left;
		cursor: pointer;
	}

	.rotulo {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.4rem;
		flex: 1;
		min-width: 0;
	}

	.alerta {
		font-style: normal;
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--acento-texto);
	}

	/* El resumen se recorta antes que el rótulo: saber QUÉ campo es importa
	   más que ver entero lo que ya lleva dentro. */
	.resumen {
		max-width: 45%;
		overflow: hidden;
		color: var(--texto-suave);
		font-size: 0.82rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.galon {
		display: grid;
		place-items: center;
		color: var(--texto-suave);
		transition: transform 0.15s var(--ease-suave, ease-out);
	}

	.galon.girado {
		transform: rotate(90deg);
	}

	.cuerpo {
		padding-bottom: 1rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.galon {
			transition: none;
		}
	}
</style>
