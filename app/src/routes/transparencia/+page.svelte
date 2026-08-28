<script lang="ts">
	import IndiceTransparencia from '$lib/components/IndiceTransparencia.svelte';
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

<IndiceTransparencia entradas={data.entradas} cifras={data.cifras} />
