<script lang="ts">
	import Bloques from './Bloques.svelte';
	import type { Bloque } from '$lib/api';
	import { itemsDeGrupo, type DocumentoResuelto } from '$lib/bloques';

	/**
	 * Un apartado del registro (un año, una categoría) como acordeón nativo
	 * `<details>` — teclado y lector de pantalla gratis, y sigue funcionando
	 * sin JS. `abierto` es de solo lectura: el padre decide el estado
	 * (incluido forzarlo abierto durante una búsqueda) y se entera de los
	 * toggles manuales del usuario vía `alCambiar`, en vez de un binding de
	 * doble vía que pelearía con ese forzado.
	 *
	 * `resultados` no nulo = modo búsqueda: se pinta una lista plana de los
	 * documentos que coinciden, ya resueltos. Nulo = modo navegación: se
	 * pintan los bloques originales del grupo tal cual, vía `Bloques`.
	 */
	let {
		id,
		titulo,
		bloques,
		resultados,
		indice,
		abierto,
		alCambiar
	}: {
		id: string;
		titulo: string;
		bloques: Bloque[];
		resultados: DocumentoResuelto[] | null;
		indice: Map<string, { url: string; tipo: string }>;
		abierto: boolean;
		alCambiar: (valor: boolean) => void;
	} = $props();

	// En búsqueda, el número refleja lo que se ve ahora mismo (los que
	// coinciden); en navegación, el total del grupo. Los apartados sin
	// documentos (contenido narrativo, como en mecanismos de participación)
	// no muestran número — no hay nada que contar.
	const cantidad = $derived(
		resultados ? resultados.length : itemsDeGrupo({ titulo, nivel: 0, bloques }, indice).length
	);
</script>

<details
	{id}
	open={abierto}
	ontoggle={(e) => alCambiar(e.currentTarget.open)}
	class="grupo border-b border-[var(--borde)]"
>
	<summary class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-4">
		<span class="display text-[1.05rem]">{titulo}</span>
		<span class="flex shrink-0 items-center gap-3">
			{#if cantidad > 0}
				<span class="cifra-tabular text-sm font-bold text-[var(--texto-suave)]">{cantidad}</span>
			{/if}
			<svg
				class="chevron h-4 w-4 shrink-0 text-[var(--texto-suave)]"
				viewBox="0 0 24 24"
				fill="none"
				aria-hidden="true"
			>
				<path
					d="m6 9 6 6 6-6"
					stroke="currentColor"
					stroke-width="2.2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</span>
	</summary>

	<div class="pb-6">
		{#if resultados}
			<ul class="space-y-1">
				{#each resultados as r (r.texto + '|' + r.url)}
					<li>
						<a
							href={r.url}
							target="_blank"
							rel="noopener"
							class="flex min-h-11 items-start gap-2.5 py-1 no-underline hover:underline"
						>
							<span
								class="mt-0.5 shrink-0 bg-[var(--superficie-alt)] px-1.5 py-0.5 text-[0.62rem] font-bold uppercase text-[var(--texto-suave)]"
							>
								{r.tipo}
							</span>
							<span class="leading-snug wrap-break-word">{r.texto}</span>
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<Bloques {bloques} {indice} />
		{/if}
	</div>
</details>

<style>
	.grupo > summary {
		list-style: none;
	}
	.grupo > summary::-webkit-details-marker {
		display: none;
	}
	.grupo > summary::marker {
		display: none;
	}
	.chevron {
		transition: transform 0.2s ease;
	}
	.grupo[open] .chevron {
		transform: rotate(180deg);
	}
	@media (prefers-reduced-motion: reduce) {
		.chevron {
			transition: none;
		}
	}
</style>
