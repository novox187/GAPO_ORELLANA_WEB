<script lang="ts">
	import type { Comentario } from '$lib/api';
	import { img, social } from '$lib/api';
	import { sesion } from '$lib/sesion.svelte';
	import Insignia from './Insignia.svelte';
	import ComentarioItem from './Comentario.svelte';

	/** Un comentario, con sus respuestas (un solo nivel) anidadas debajo. */
	let {
		comentario,
		esRespuesta = false,
		alBorrar
	}: {
		comentario: Comentario;
		esRespuesta?: boolean;
		/** Se llama tras borrar de verdad, para quitarlo de la lista sin recargar. */
		alBorrar?: (id: number) => void;
	} = $props();

	let borrando = $state(false);

	const esPropio = $derived(sesion.ciudadano?.id === comentario.ciudadano_id);

	async function borrar() {
		if (borrando) return;
		borrando = true;
		try {
			await social.borrarComentario(comentario.id);
			alBorrar?.(comentario.id);
		} catch {
			borrando = false;
		}
	}

	function fechaCorta(iso: string | null): string {
		if (!iso) return '';
		const d = new Date(iso);
		const segundos = (Date.now() - d.getTime()) / 1000;
		if (segundos < 60) return 'ahora';
		const rtf = new Intl.RelativeTimeFormat('es-EC', { numeric: 'auto' });
		const tramos: [Intl.RelativeTimeFormatUnit, number][] = [
			['year', 31536000],
			['month', 2592000],
			['week', 604800],
			['day', 86400],
			['hour', 3600],
			['minute', 60]
		];
		for (const [unidad, seg] of tramos) {
			const v = segundos / seg;
			if (v >= 1) return rtf.format(-Math.round(v), unidad);
		}
		return 'ahora';
	}
</script>

<div class="flex gap-2.5" class:pl-9={esRespuesta}>
	<span
		class="mt-0.5 flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--superficie-alt)]"
	>
		{#if comentario.autor.avatar}
			<img src={img(comentario.autor.avatar, 400)} alt="" class="h-full w-full object-cover" />
		{:else}
			<span class="text-[0.65rem] font-bold text-[var(--texto-suave)]" aria-hidden="true">
				{(comentario.autor.nombre ?? '?').slice(0, 1)}
			</span>
		{/if}
	</span>

	<div class="min-w-0 flex-1">
		<p class="text-[0.85rem] leading-snug">
			<span class="mr-1.5 inline-flex items-center gap-1 font-bold">
				{comentario.autor.nombre ?? 'Vecino'}
				{#if comentario.es_oficial}<Insignia tamano={12} />{/if}
			</span>
			{comentario.texto}
		</p>
		<p class="mt-0.5 flex items-center gap-2.5">
			<time class="text-[0.72rem] text-[var(--texto-suave)]">{fechaCorta(comentario.creado_en)}</time>
			{#if esPropio}
				<button
					type="button"
					onclick={borrar}
					aria-disabled={borrando}
					class="cursor-pointer text-[0.72rem] font-semibold text-[var(--texto-suave)] hover:text-[var(--color-error)]"
				>
					{borrando ? 'Eliminando…' : 'Eliminar'}
				</button>
			{/if}
		</p>

		{#if comentario.respuestas?.length}
			<div class="mt-2.5 space-y-2.5">
				{#each comentario.respuestas as r (r.id)}
					<ComentarioItem comentario={r} esRespuesta {alBorrar} />
				{/each}
			</div>
		{/if}
	</div>
</div>
