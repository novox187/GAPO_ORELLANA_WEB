<script lang="ts" module>
	export type NombreIcono =
		| 'perfil'
		| 'crear'
		| 'historia'
		| 'estadisticas'
		| 'ajustes'
		| 'salir'
		| 'atras'
		| 'cerrar'
		| 'imagen'
		| 'video'
		| 'texto'
		| 'sticker'
		| 'encuesta'
		| 'pregunta'
		| 'ubicacion'
		| 'etiqueta'
		| 'fijar'
		| 'borrador'
		| 'recortar'
		| 'filtros'
		| 'basura'
		| 'mas'
		| 'dibujar'
		| 'emoji'
		| 'deshacer'
		| 'lupa-mas'
		| 'lupa-menos'
		| 'derecha'
		| 'texto-alternativo';
</script>

<script lang="ts">
	/**
	 * Los iconos de interfaz del estudio.
	 *
	 * Familia propia y no los pictogramas municipales, por el mismo reparto
	 * que ya decidió el panel: el pictograma —jaguar, chontacuro, puente del
	 * Napo— es identidad y está dibujado para verse a 96 px; a 22 px su trazo
	 * fino se convierte en una mancha. Aquí hacen falta iconos que se
	 * reconozcan de un vistazo en una barra: rejilla de 24, grosor 1,9,
	 * `currentColor`.
	 *
	 * Y no son caracteres sueltos (✕, ↑): esos cambian de forma según la
	 * fuente del sistema, no heredan tamaño ni color, y un lector de pantalla
	 * los lee como el símbolo que son.
	 */
	let { nombre, tamano = 22 }: { nombre: NombreIcono; tamano?: number } = $props();
</script>

<svg
	width={tamano}
	height={tamano}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.9"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#if nombre === 'perfil'}
		<circle cx="12" cy="8.5" r="3.7" />
		<path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
	{:else if nombre === 'crear'}
		<rect x="3.5" y="3.5" width="17" height="17" rx="3" />
		<path d="M12 8.5v7M8.5 12h7" />
	{:else if nombre === 'historia'}
		<circle cx="12" cy="12" r="8.5" stroke-dasharray="3.4 2.6" />
		<path d="M12 9v6M9 12h6" />
	{:else if nombre === 'estadisticas'}
		<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
	{:else if nombre === 'ajustes'}
		<circle cx="12" cy="12" r="3.2" />
		<path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3" />
	{:else if nombre === 'salir'}
		<path d="M15 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H15M18.5 12H10M15.5 8.5 19 12l-3.5 3.5" />
	{:else if nombre === 'atras'}
		<path d="M19 12H5M11 6l-6 6 6 6" />
	{:else if nombre === 'cerrar'}
		<path d="m6 6 12 12M18 6 6 18" />
	{:else if nombre === 'imagen'}
		<rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
		<circle cx="9" cy="10" r="1.6" />
		<path d="m4.5 17 4.2-4.2a2 2 0 0 1 2.8 0L19 20" />
	{:else if nombre === 'video'}
		<rect x="2.5" y="6" width="13" height="12" rx="2.5" />
		<path d="m15.5 10.5 6-3v9l-6-3z" />
	{:else if nombre === 'texto'}
		<path d="M5 6h14M12 6v13M9 19h6" />
	{:else if nombre === 'sticker'}
		<path d="M20.5 12a8.5 8.5 0 1 0-8.5 8.5c1.6 0 4-2 5.8-3.8 1.8-1.8 2.7-3.7 2.7-4.7Z" />
		<path d="M12.5 20.3c0-3.2 1-4.3 4.2-4.3" />
	{:else if nombre === 'encuesta'}
		<rect x="3.5" y="5" width="17" height="5.5" rx="2" />
		<rect x="3.5" y="13.5" width="11" height="5.5" rx="2" />
	{:else if nombre === 'pregunta'}
		<path d="M4.5 6.5A2 2 0 0 1 6.5 4.5h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4 3.5V16.5H6.5a2 2 0 0 1-2-2Z" />
		<path d="M10.4 8.8a1.8 1.8 0 1 1 2.4 1.7c-.5.2-.8.6-.8 1.1M12 13.9v.1" />
	{:else if nombre === 'ubicacion'}
		<path d="M12 21s6.5-5.6 6.5-10.2a6.5 6.5 0 1 0-13 0C5.5 15.4 12 21 12 21Z" />
		<circle cx="12" cy="10.6" r="2.3" />
	{:else if nombre === 'etiqueta'}
		<path d="M12 4.5H5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
		<circle cx="12" cy="11" r="2.4" />
		<path d="M8 17.5a4.2 4.2 0 0 1 8 0" />
	{:else if nombre === 'fijar'}
		<path d="M12 15.5V21M8 4.5h8l-1 6 2.5 2v1.5h-11V12.5l2.5-2z" />
	{:else if nombre === 'borrador'}
		<path d="M4 20h16M6 16.5 16.2 6.3a2 2 0 0 1 2.8 2.8L8.8 19.3l-4 1z" />
	{:else if nombre === 'recortar'}
		<path d="M6.5 2.5v15h15M2.5 6.5h15v15" />
	{:else if nombre === 'filtros'}
		<circle cx="9" cy="9" r="5.5" />
		<circle cx="15" cy="15" r="5.5" />
	{:else if nombre === 'basura'}
		<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5" />
	{:else if nombre === 'mas'}
		<path d="M12 5v14M5 12h14" />
	{:else if nombre === 'dibujar'}
		<path d="M4 20 4.6 16.4 15.3 5.7a1.8 1.8 0 0 1 2.5 0l1.5 1.5a1.8 1.8 0 0 1 0 2.5L8.6 20.4 4 21Z" />
		<path d="M13.6 7.4 17.6 11.4" />
	{:else if nombre === 'emoji'}
		<circle cx="12" cy="12" r="8.5" />
		<circle cx="9" cy="10.2" r="1" fill="currentColor" stroke="none" />
		<circle cx="15" cy="10.2" r="1" fill="currentColor" stroke="none" />
		<path d="M8.3 14a4.4 4.4 0 0 0 7.4 0" />
	{:else if nombre === 'deshacer'}
		<path d="M7 8H4.5V5.5" />
		<path d="M4.7 8.3A7.5 7.5 0 1 1 4 13" />
	{:else if nombre === 'lupa-mas'}
		<circle cx="10.5" cy="10.5" r="6.5" />
		<path d="M10.5 7.7v5.6M7.7 10.5h5.6" />
		<path d="m20 20-4.3-4.3" />
	{:else if nombre === 'lupa-menos'}
		<circle cx="10.5" cy="10.5" r="6.5" />
		<path d="M7.7 10.5h5.6" />
		<path d="m20 20-4.3-4.3" />
	{:else if nombre === 'derecha'}
		<path d="m9.5 5 7 7-7 7" />
	{:else if nombre === 'texto-alternativo'}
		<rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
		<path d="M7.5 15.5 10 9l2.5 6.5M8.3 13.6h3.4" />
		<path d="M16.5 15.5V9M14.6 11.4a1.9 1.9 0 0 1 1.9-1.9" />
	{/if}
</svg>
