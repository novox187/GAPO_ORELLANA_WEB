<script lang="ts">
	import Migas from './Migas.svelte';
	import Pictograma from './Pictograma.svelte';
	import { revelar, contar } from '$lib/acciones/revelar';
	import type { EntradaSeccion } from '$lib/secciones';
	import type { Resumen } from '$lib/bloques';

	/**
	 * Índice de Transparencia: un registro numerado, no el mosaico de
	 * teselas de "El cantón". Ninguna de las 9 secciones tiene fotografía
	 * propia — el lenguaje de tesela a pantalla completa nació para
	 * contenido turístico y aquí no encaja — así que el acento pasa a ser
	 * el dato: una franja de cifras reales arriba y, por fila, cuánto hay
	 * publicado de verdad en esa categoría (nunca un número inventado).
	 */
	let {
		entradas,
		cifras
	}: {
		entradas: { entrada: EntradaSeccion; resumen: Resumen }[];
		cifras: {
			categorias: number;
			documentos: number;
			anios: { min: number; max: number } | null;
		};
	} = $props();
</script>

<div class="contenedor py-10 md:py-14">
	<Migas tramos={[{ texto: 'Inicio', href: '/' }, { texto: 'Transparencia' }]} />

	<header class="mb-10 max-w-2xl">
		<h1 class="display text-[clamp(1.9rem,4.4vw,3rem)]">Transparencia</h1>
		<p class="mt-3 leading-relaxed text-[var(--texto-suave)]">
			El registro público de lo que hace el municipio con el dinero y el poder que se le
			confía: lo que la ley obliga a publicar y lo que cualquier persona tiene derecho a
			revisar.
		</p>
	</header>
</div>

<section class="banda" aria-labelledby="titulo-cifras-transparencia">
	<Pictograma
		nombre="rendiciondecuentas"
		clase="pointer-events-none absolute -right-16 top-1/2 hidden h-[34rem] w-auto -translate-y-1/2 text-[var(--color-selva-400)] opacity-[0.07] lg:block"
	/>
	<div class="contenedor relative">
		<h2 id="titulo-cifras-transparencia" class="sr-only">Transparencia en cifras</h2>
		<dl class="grid grid-cols-1 gap-x-6 gap-y-10 {cifras.anios ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}">
			<div
				use:revelar
				class="revelable flex flex-col border-l-[3px] border-[var(--color-achiote-500)] pl-4 md:pl-5"
			>
				<dt class="order-2 mt-2.5 text-[0.86rem] font-bold text-white">categorías publicadas</dt>
				<dd
					class="display cifra-tabular order-1 text-[clamp(2.4rem,5.2vw,3.9rem)] leading-none text-white"
				>
					<span use:contar={{ hasta: cifras.categorias, agrupar: false }}>{cifras.categorias}</span>
				</dd>
			</div>
			<div
				use:revelar={{ retraso: 100 }}
				class="revelable flex flex-col border-l-[3px] border-[var(--color-achiote-500)] pl-4 md:pl-5"
			>
				<dt class="order-2 mt-2.5 text-[0.86rem] font-bold text-white">documentos publicados</dt>
				<dd
					class="display cifra-tabular order-1 text-[clamp(2.4rem,5.2vw,3.9rem)] leading-none text-white"
				>
					<span use:contar={{ hasta: cifras.documentos }}>{cifras.documentos}</span>
				</dd>
			</div>
			{#if cifras.anios}
				<div
					use:revelar={{ retraso: 200 }}
					class="revelable flex flex-col border-l-[3px] border-[var(--color-achiote-500)] pl-4 md:pl-5"
				>
					<dt class="order-2 mt-2.5 text-[0.86rem] font-bold text-white">años de registro</dt>
					<dd
						class="display cifra-tabular order-1 text-[clamp(2.4rem,5.2vw,3.9rem)] leading-none text-white"
					>
						{cifras.anios.min}–{cifras.anios.max}
					</dd>
				</div>
			{/if}
		</dl>
	</div>
</section>

<div class="contenedor py-10 md:py-14">
	<ul class="divide-y divide-[var(--borde)] border-y border-[var(--borde)]">
		{#each entradas as { entrada: e, resumen: r }, i (e.slug)}
			<li use:revelar={{ retraso: i * 60 }} class="revelable">
				<a
					href="/transparencia/{e.slug}"
					class="flex items-center gap-5 py-5 no-underline transition-colors hover:bg-[var(--superficie-alt)] sm:gap-7"
				>
					<span
						class="cifra-tabular w-10 shrink-0 text-right text-[1.6rem] font-bold leading-none text-[var(--indice)] sm:w-14 sm:text-[2rem]"
					>
						{String(i + 1).padStart(2, '0')}
					</span>
					<span class="grid h-11 w-11 shrink-0 place-items-center {e.fondo} {e.tinta}">
						<Pictograma nombre={e.picto} clase="h-6 w-6" />
					</span>
					<span class="min-w-0 flex-1">
						<span class="display block text-[1.05rem] text-[var(--texto)]">{e.titulo}</span>
						<span class="mt-0.5 block text-[0.85rem] leading-snug text-[var(--texto-suave)]">
							{e.descripcion}
						</span>
					</span>
					<span
						class="hidden shrink-0 text-right text-[0.8rem] font-bold sm:block {r.cantidad === 0
							? 'text-[var(--texto-suave)]'
							: 'text-[var(--marca-titulo)]'}"
					>
						{r.cantidad > 0 ? `${r.cantidad} ${r.etiqueta}` : r.etiqueta}
					</span>
				</a>
			</li>
		{/each}
	</ul>
</div>

<style>
	.banda {
		position: relative;
		overflow: hidden;
		background: #16170f;
		padding-block: 3.5rem;
	}
	@media (width >= 48rem) {
		.banda {
			padding-block: 5rem;
		}
	}
</style>
