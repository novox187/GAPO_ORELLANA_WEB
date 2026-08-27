<script lang="ts">
	import CabeceraCanton from '$lib/components/CabeceraCanton.svelte';
	import HermanasCanton from '$lib/components/HermanasCanton.svelte';
	import { revelar } from '$lib/acciones/revelar';
	import { img } from '$lib/api';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Historia y símbolos — El cantón — Francisco de Orellana</title>
	<meta
		name="description"
		content="La bandera, el escudo y el himno del cantón Francisco de Orellana, y el significado de cada uno de sus elementos."
	/>
</svelte:head>

<CabeceraCanton
	titulo="Historia y símbolos"
	entradilla="La bandera, el escudo y el himno del cantón, y qué significa cada uno de sus elementos."
	picto={data.entrada.picto}
	fondo={data.entrada.fondo}
	tinta={data.entrada.tinta}
/>

<div class="contenedor py-10 md:py-14">
	<ul class="flex flex-col gap-12 md:gap-16">
		{#each data.simbolos as s, i (s.nombre)}
			<li>
				<article
					use:revelar
					class="revelable grid gap-6 {s.imagen ? 'md:grid-cols-[minmax(0,22rem)_1fr] md:gap-10' : ''}"
				>
					{#if s.imagen}
						<!--
							La bandera y el escudo son el contenido, no ilustración de
							apoyo: van a tamaño grande y con fondo propio para que se
							distingan sobre cualquier tema.
						-->
						<div class="tesela self-start border border-[var(--borde)] bg-white p-5">
							<img
								src={img(s.imagen, 800)}
								alt="{s.nombre} de Francisco de Orellana"
								class="w-full object-contain"
								loading={i === 0 ? 'eager' : 'lazy'}
								decoding="async"
							/>
						</div>
					{/if}

					<div class="min-w-0">
						<span class="h-1 w-12 bg-[var(--color-achiote-500)]" aria-hidden="true"></span>
						<h2 class="display mt-4 text-[clamp(1.4rem,3.4vw,2rem)]">{s.nombre}</h2>
						{#each s.parrafos as p (p)}
							<p class="mt-3 max-w-2xl leading-relaxed text-[var(--texto-suave)]">{p}</p>
						{/each}
					</div>
				</article>
			</li>
		{/each}
	</ul>
</div>

<HermanasCanton actual="historia-simbolos" />
