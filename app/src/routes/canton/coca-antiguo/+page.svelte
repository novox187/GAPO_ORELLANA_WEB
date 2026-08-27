<script lang="ts">
	import CabeceraCanton from '$lib/components/CabeceraCanton.svelte';
	import HermanasCanton from '$lib/components/HermanasCanton.svelte';
	import { revelar } from '$lib/acciones/revelar';
	import { img } from '$lib/api';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>El Coca antiguo — El cantón — Francisco de Orellana</title>
	<meta
		name="description"
		content="Archivo fotográfico recuperado de los inicios de El Coca: sesenta años de la ciudad en imágenes."
	/>
</svelte:head>

<CabeceraCanton
	titulo="El Coca antiguo"
	entradilla="Un archivo fotográfico recuperado por el municipio: cómo era la ciudad antes de ser la que es hoy."
	picto={data.entrada.picto}
	fondo={data.entrada.fondo}
	tinta={data.entrada.tinta}
	imagen={data.entrada.imagen ?? ''}
	alt=""
/>

<div class="contenedor py-10 md:py-14">
	<div class="max-w-2xl">
		{#each data.parrafos as p (p)}
			<p class="mb-4 leading-relaxed md:text-[1.05rem]">{p}</p>
		{/each}
	</div>

	{#if data.fotos.length}
		<h2 class="display mt-10 mb-2 text-[1.35rem] md:text-[1.6rem]">
			{data.fotos.length} fotografías del archivo
		</h2>
		<!--
			Estas fotografías llegaron sin descripción. En vez de inventar qué
			muestra cada una, se presentan como lo que son —un archivo
			histórico sin catalogar— y se dejan con `alt` vacío para que un
			lector de pantalla no las anuncie una por una sin poder decir nada
			útil de ellas. La nota de abajo cumple ese papel para el conjunto.
		-->
		<p class="mb-6 max-w-2xl text-[0.88rem] leading-relaxed text-[var(--texto-suave)]">
			Las imágenes son parte de una colección recuperada; están pendientes de catalogar con
			fecha y lugar.
		</p>

		<ul class="grid gap-1.5 sm:grid-cols-2">
			{#each data.fotos as f, i (f.id)}
				<li>
					<div
						use:revelar={{ retraso: (i % 2) * 70 }}
						class="revelable tesela border border-[var(--borde)] bg-[var(--superficie-alt)]"
					>
						<img
							src={img(f, 800)}
							alt={f.altPendiente ? '' : f.alt}
							class="historica aspect-[1140/642] w-full object-cover"
							loading={i < 2 ? 'eager' : 'lazy'}
							decoding="async"
						/>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<HermanasCanton actual="coca-antiguo" />
