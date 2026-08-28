<script lang="ts">
	import PaginaTransparencia from '$lib/components/PaginaTransparencia.svelte';
	import { TRANSPARENCIA } from '$lib/secciones';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<PaginaTransparencia
	entrada={data.entrada}
	pagina={data.pagina}
	seccionTitulo="Transparencia"
	base="/transparencia"
	hermanas={TRANSPARENCIA}
/>
