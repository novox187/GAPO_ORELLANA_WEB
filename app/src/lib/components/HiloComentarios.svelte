<script lang="ts">
	import type { Comentario as TipoComentario } from '$lib/api';
	import ComentarioItem from './Comentario.svelte';
	import FormularioComentario from './FormularioComentario.svelte';

	/**
	 * El hilo de comentarios de una publicación: el formulario arriba (o la
	 * invitación a iniciar sesión) y la lista debajo. Lo nuevo se antepone
	 * sin recargar la página — es lo único que rompería el flujo de
	 * «escribo y lo veo ahí» que se espera de una red social.
	 */
	let {
		slug,
		comentarios: iniciales,
		total: totalInicial,
		permiteComentarios,
		alCambiarTotal
	}: {
		slug: string;
		comentarios: TipoComentario[];
		total: number;
		permiteComentarios: boolean;
		/** Avisa al total real cuando se publica o se borra uno — la barra de acciones lo usa para no quedarse con el número de la carga inicial. */
		alCambiarTotal?: (total: number) => void;
	} = $props();

	let comentarios = $state(iniciales);
	let total = $state(totalInicial);

	$effect(() => {
		comentarios = iniciales;
		total = totalInicial;
	});

	function alPublicar(nuevo: TipoComentario) {
		comentarios = [nuevo, ...comentarios];
		total += 1;
		alCambiarTotal?.(total);
	}

	function alBorrar(id: number) {
		// Puede ser de nivel superior o una respuesta anidada: se busca en
		// ambos niveles, que es lo único que existe —un solo nivel de hilo—.
		comentarios = comentarios
			.filter((c) => c.id !== id)
			.map((c) => (c.respuestas ? { ...c, respuestas: c.respuestas.filter((r) => r.id !== id) } : c));
		total -= 1;
		alCambiarTotal?.(total);
	}
</script>

<section id="comentarios" aria-labelledby="titulo-comentarios" class="p-4">
	<h2 id="titulo-comentarios" class="mb-3 text-[0.95rem] font-bold">
		Comentarios
		{#if total > 0}<span class="font-normal text-[var(--texto-suave)]">({total})</span>{/if}
	</h2>

	{#if permiteComentarios}
		<div class="mb-4">
			<FormularioComentario {slug} alEnviar={alPublicar} />
		</div>
	{/if}

	{#if comentarios.length}
		<div class="space-y-4">
			{#each comentarios as c (c.id)}
				<ComentarioItem comentario={c} {alBorrar} />
			{/each}
		</div>
	{:else if permiteComentarios}
		<p class="text-[0.85rem] text-[var(--texto-suave)]">Todavía no hay comentarios. Sé el primero en escribir uno.</p>
	{:else}
		<p class="text-[0.85rem] text-[var(--texto-suave)]">Los comentarios están cerrados en esta publicación.</p>
	{/if}
</section>
