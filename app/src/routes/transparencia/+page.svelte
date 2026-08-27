<script lang="ts">
	import IndiceSeccion from '$lib/components/IndiceSeccion.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Transparencia — Alcaldía de Francisco de Orellana</title>
	<meta
		name="description"
		content="LOTAIP, ordenanzas, rendición de cuentas y contratación pública del cantón Francisco de Orellana."
	/>
</svelte:head>

<IndiceSeccion
	titulo="Transparencia"
	descripcion="Información pública del municipio: lo que la ley obliga a publicar y lo que la ciudadanía tiene derecho a revisar."
	base="/transparencia"
	entradas={data.entradas}
/>
