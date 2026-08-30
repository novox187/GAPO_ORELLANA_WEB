<script lang="ts">
	import { page } from '$app/state';
	import IndiceTransparencia from '$lib/components/IndiceTransparencia.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { indiceSeccion } from '$lib/seo';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const indice = $derived(
		indiceSeccion(
			page.url,
			'Transparencia',
			'/transparencia',
			data.entradas.map((e) => ({
				nombre: e.entrada.titulo,
				ruta: `/transparencia/${e.entrada.slug}`
			}))
		)
	);
</script>

<Seo
	titulo="Transparencia"
	descripcion="LOTAIP, ordenanzas, rendición de cuentas y contratación pública del GAD Municipal de Francisco de Orellana: {data.cifras.documentos} documentos publicados."
	imagen="/img/og/transparencia.jpg"
	datos={[indice]}
/>

<IndiceTransparencia entradas={data.entradas} cifras={data.cifras} />
