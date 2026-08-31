<script lang="ts">
	import { page } from '$app/state';
	import VisorHistorias from '$lib/components/VisorHistorias.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const indiceInicial = $derived(Number(page.url.searchParams.get('i') ?? 0) || 0);
</script>

<VisorHistorias cuenta={data.cuenta} historias={data.historias} {indiceInicial} />
