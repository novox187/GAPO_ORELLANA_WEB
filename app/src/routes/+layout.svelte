<script lang="ts">
	import '../app.css';
	import Cabecera from '$lib/components/Cabecera.svelte';
	import Pie from '$lib/components/Pie.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link
		rel="preload"
		href="/fonts/archivo-var.woff2"
		as="font"
		type="font/woff2"
		crossorigin="anonymous"
	/>
</svelte:head>

<div class="flex min-h-[100dvh] flex-col">
	<Cabecera />
	<main id="contenido" class="flex-1">
		{@render children()}
	</main>
	<Pie />
</div>
