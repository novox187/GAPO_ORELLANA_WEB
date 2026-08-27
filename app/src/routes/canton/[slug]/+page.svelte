<script lang="ts">
	import PaginaSeccion from '$lib/components/PaginaSeccion.svelte';
	import { CANTON } from '$lib/secciones';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<PaginaSeccion
	entrada={data.entrada}
	pagina={data.pagina}
	seccionTitulo="El cantón"
	base="/canton"
	hermanas={CANTON}
/>
