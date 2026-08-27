<script lang="ts">
	import CabeceraCanton from '$lib/components/CabeceraCanton.svelte';
	import HermanasCanton from '$lib/components/HermanasCanton.svelte';
	import Pictograma from '$lib/components/Pictograma.svelte';
	import { revelar, contar } from '$lib/acciones/revelar';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	/**
	 * Las cuatro cifras que resumen el cantón, extraídas del propio texto
	 * de esta página. Se sacan arriba porque son lo que casi todo el mundo
	 * viene a buscar; el desarrollo completo sigue debajo, sin recortar.
	 */
	const RESUMEN = [
		{ valor: 72795, texto: '72.795', etiqueta: 'habitantes' },
		{ valor: 7047, texto: '7.047', sufijo: ' km²', etiqueta: 'de superficie' },
		{ valor: 26, texto: '26', sufijo: ' °C', etiqueta: 'temperatura media' },
		{ valor: 1969, texto: '1969', agrupar: false, etiqueta: 'cantonización' }
	];

	/** Los campos que llevan listas son las parroquias: van aparte. */
	const conListas = $derived(data.campos.filter((c) => c.listas.length));
	const simples = $derived(data.campos.filter((c) => !c.listas.length));
</script>

<svelte:head>
	<title>Datos del cantón — El cantón — Francisco de Orellana</title>
	<meta
		name="description"
		content="Territorio, población, clima, límites, parroquias y economía del cantón Francisco de Orellana."
	/>
</svelte:head>

<CabeceraCanton
	titulo="Datos del cantón"
	entradilla="Territorio, población, clima y parroquias de Francisco de Orellana, en la Amazonía ecuatoriana."
	picto={data.entrada.picto}
	fondo={data.entrada.fondo}
	tinta={data.entrada.tinta}
/>

<!-- ══ Resumen en cifras ═════════════════════════════════════════════ -->
<section class="resumen" aria-label="El cantón en cifras">
	<Pictograma
		nombre="canton"
		clase="pointer-events-none absolute -right-16 top-1/2 hidden h-[26rem] w-auto -translate-y-1/2 text-[var(--color-selva-400)] opacity-[0.07] lg:block"
	/>
	<dl class="contenedor relative grid grid-cols-2 gap-x-6 gap-y-8 py-10 md:py-12 lg:grid-cols-4">
		{#each RESUMEN as c, i (c.etiqueta)}
			<div use:revelar={{ retraso: i * 80 }} class="revelable flex flex-col border-l-[3px] border-[var(--color-achiote-500)] pl-4">
				<dt class="order-2 mt-2 text-[0.82rem] font-bold text-white">{c.etiqueta}</dt>
				<dd class="display cifra-tabular order-1 text-[clamp(1.9rem,5vw,3rem)] leading-none text-white">
					<span use:contar={{ hasta: c.valor, agrupar: c.agrupar }}>{c.texto}</span
					>{#if c.sufijo}<span class="text-[0.5em] text-[var(--color-achiote-400)]">{c.sufijo}</span>{/if}
				</dd>
			</div>
		{/each}
	</dl>
</section>

<div class="contenedor py-10 md:py-14">
	{#if data.presentacion.length}
		<div class="max-w-2xl">
			{#each data.presentacion as p (p)}
				<p class="text-[1rem] leading-relaxed md:text-[1.05rem]">{p}</p>
			{/each}
		</div>
	{/if}

	<!-- ══ Ficha de datos ════════════════════════════════════════════ -->
	<h2 class="display mt-12 mb-5 text-[1.35rem] md:text-[1.6rem]">Ficha del territorio</h2>
	<dl class="grid gap-px border border-[var(--borde)] bg-[var(--borde)] sm:grid-cols-2">
		{#each simples as c (c.etiqueta)}
			<div class="bg-[var(--superficie-elevada)] p-5">
				<dt class="text-[0.7rem] font-bold tracking-[0.12em] text-[var(--texto-suave)] uppercase">
					{c.etiqueta}
				</dt>
				{#each c.parrafos as p (p)}
					<dd class="mt-2 text-[0.92rem] leading-relaxed">{p}</dd>
				{/each}
			</div>
		{/each}
	</dl>

	<!-- ══ Parroquias ════════════════════════════════════════════════ -->
	{#each conListas as c (c.etiqueta)}
		<section class="mt-12">
			<h2 class="display mb-3 text-[1.35rem] md:text-[1.6rem]">{c.etiqueta}</h2>
			{#each c.parrafos as p (p)}
				<p class="mb-5 max-w-2xl leading-relaxed text-[var(--texto-suave)]">{p}</p>
			{/each}

			<!--
				La fuente reparte las parroquias en dos listas sueltas. Se
				presentan juntas como teselas numeradas: son doce, y en una
				lista con viñetas de una columna se leen como un párrafo largo.
			-->
			<ul class="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
				{#each c.listas.flat() as it, i (it.texto + i)}
					<li
						class="flex items-center gap-3 border border-[var(--borde)] bg-[var(--superficie-elevada)] p-4"
					>
						<!--
							`--indice` está calibrado para el número gigante del riel
							de trámites, donde el mínimo aplicable es 3:1 por ser texto
							grande. Aquí el mismo token se queda en 3.25:1 sobre 11,5 px,
							que ya es texto normal y exige 4.5:1.
						-->
						<span
							class="cifra-tabular shrink-0 text-[0.72rem] font-bold text-[var(--texto-suave)]"
							aria-hidden="true"
						>
							{String(i + 1).padStart(2, '0')}
						</span>
						<span class="min-w-0 text-[0.92rem] leading-snug font-semibold">
							{it.texto.replace(/\s*:\s*$/, '')}
						</span>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>

<HermanasCanton actual="datos-canton" />

<style>
	.resumen {
		position: relative;
		overflow: hidden;
		background: #16170f;
	}
</style>
