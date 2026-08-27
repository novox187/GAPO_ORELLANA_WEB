<script lang="ts">
	import IndiceSeccion from '$lib/components/IndiceSeccion.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>El cantón — Alcaldía de Francisco de Orellana</title>
	<meta
		name="description"
		content="Historia, símbolos, territorio y lugares por visitar del cantón Francisco de Orellana (El Coca)."
	/>
</svelte:head>

<IndiceSeccion
	titulo="El cantón"
	descripcion="Francisco de Orellana en datos, historia y territorio: quién lo gobierna, de dónde viene y qué hay que ver."
	base="/canton"
	entradas={data.entradas}
/>
