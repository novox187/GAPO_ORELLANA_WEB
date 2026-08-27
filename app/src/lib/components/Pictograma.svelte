<script lang="ts" module>
	/**
	 * Pictogramas oficiales del municipio. Son los mismos SVG que publica
	 * orellana.gob.ec en /static/img/icons/ — arte lineal propio de fauna,
	 * flora y lugares del cantón (jaguar, chontacuro, puente del Napo,
	 * contorno del cantón), no iconos de catálogo.
	 *
	 * Se pasaron a currentColor para que hereden el color del contexto.
	 */
	const fuentes = import.meta.glob('$lib/pictogramas/*.svg', {
		query: '?raw',
		import: 'default',
		eager: true
	}) as Record<string, string>;

	const porNombre: Record<string, string> = Object.fromEntries(
		Object.entries(fuentes).map(([ruta, svg]) => [
			ruta.split('/').pop()!.replace('.svg', ''),
			svg
		])
	);

	export type NombrePictograma =
		| 'cultura'
		| 'emprendedores'
		| 'gacetamunicipal'
		| 'canton'
		| 'turismo'
		| 'obras'
		| 'tramitesciudadanos'
		| 'normativa'
		| 'direcciones'
		| 'concejomunicipal'
		| 'rendiciondecuentas'
		| 'institucionesadscritas';
</script>

<script lang="ts">
	let {
		nombre,
		clase = '',
		etiqueta = ''
	}: { nombre: NombrePictograma; clase?: string; etiqueta?: string } = $props();

	const svg = $derived(porNombre[nombre] ?? '');
</script>

<span
	class="inline-block [&>svg]:h-full [&>svg]:w-full {clase}"
	role={etiqueta ? 'img' : undefined}
	aria-label={etiqueta || undefined}
	aria-hidden={etiqueta ? undefined : 'true'}
>
	{@html svg}
</span>
