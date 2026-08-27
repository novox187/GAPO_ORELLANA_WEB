<script lang="ts">
	import PaginaSeccion from '$lib/components/PaginaSeccion.svelte';
	import { TRANSPARENCIA } from '$lib/secciones';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<PaginaSeccion
	entrada={data.entrada}
	pagina={data.pagina}
	seccionTitulo="Transparencia"
	base="/transparencia"
	hermanas={TRANSPARENCIA}
/>
