<script lang="ts">
	import { untrack } from 'svelte';
	import { createImageEditor, CropStencil, CropOverlay, applyColorMatrix, pluginWatermark } from '@we-are-singular/svelte-chop-chop';
	import type { createImageEditor as CrearEditor } from '@we-are-singular/svelte-chop-chop';
	import IconoEstudio from './IconoEstudio.svelte';
	import { PROPORCIONES, PRESETS_MUNICIPALES, CONTROLES_AJUSTE, pluginPresetsMunicipales, type ClaveProporcion } from './filtros';

	/**
	 * Recorte, rotación, filtro y ajuste fino de una fotografía.
	 *
	 * Es `createImageEditor` de `svelte-chop-chop` por dentro —headless: sin
	 * su barra de herramientas, sin su tema—, con el arrastre y el redimensionado
	 * resueltos por sus propios `CropStencil`/`CropOverlay` en vez de reescribir
	 * esa geometría a mano. La versión anterior de este archivo SÍ la
	 * reescribía, y esa matemática propia produjo dos fallos reales: un
	 * derivado que leía `naturalWidth` antes de tener imagen y se quedaba en
	 * `Infinity` para siempre, y un efecto que se disparaba a sí mismo. Ninguno
	 * se veía en pantalla; los dos rompían el archivo exportado. Delegar la
	 * geometría se lleva por delante esa clase entera de errores.
	 *
	 * Lo que SÍ es propio:
	 *
	 * - **La piel.** Headless se viste por variables `--chop-*`, mapeadas a
	 *   Mosaico.
	 * - **El catálogo de filtros.** Napo, Selva, Achiote… son matrices de
	 *   color compuestas en `filtros.ts` a partir de las funciones que trae el
	 *   propio paquete (`brightnessMatrix`, `saturationMatrix`…), registradas
	 *   por un plugin de una sola llamada. Los preajustes de fábrica de la
	 *   librería se llaman «clarendon», «gingham», «juno» — el catálogo de
	 *   Instagram, literalmente — y no se usan.
	 *
	 * Una matriz de color se aplica con `getImageData`/`putImageData`, no con
	 * `CanvasRenderingContext2D.filter`, así que —a diferencia de la versión
	 * anterior— esto funciona en cualquier navegador sin necesitar una
	 * comprobación de soporte ni un aviso de «filtros desactivados».
	 *
	 * Lo que NO se ofrece, a propósito: volteo horizontal o vertical. En una
	 * fotografía real —no un montaje— voltear invierte cualquier texto legible
	 * del encuadre: un rótulo de obra, una pancarta, el nombre de una calle.
	 * En un sitio que existe para no fabricar contenido municipal, ese riesgo
	 * no vale lo que cuesta un botón más. Girar 90° sí, porque sólo corrige la
	 * orientación del teléfono; no puede volver ilegible nada que antes se
	 * leyera.
	 */
	let {
		archivo,
		proporcionInicial = '1:1',
		marcaTexto = 'GAD Municipal Francisco de Orellana',
		mostrarSello = true,
		alCambiar
	}: {
		archivo: File;
		proporcionInicial?: ClaveProporcion;
		/** El texto que lleva el sello si quien publica lo activa. Normalmente el nombre de la cuenta. */
		marcaTexto?: string;
		/**
		 * Si se ofrece el interruptor del sello municipal. Va en `false` para
		 * el avatar y la portada del perfil: ésas son la identidad
		 * institucional en sí, no una fotografía de publicación, y sellarlas
		 * con su propio nombre no significa nada.
		 */
		mostrarSello?: boolean;
		/** Se llama con el recorte ya aplicado cada vez que hay uno nuevo listo. */
		alCambiar?: (blob: Blob) => void;
	} = $props();

	type Paso = 'recortar' | 'filtros' | 'ajustes';
	type Editor = ReturnType<typeof CrearEditor>;

	let paso = $state<Paso>('recortar');
	let proporcion = $state<ClaveProporcion>('1:1');

	$effect(() => {
		proporcion = proporcionInicial;
	});

	const valorProporcion = $derived(PROPORCIONES.find((p) => p.clave === proporcion)?.valor ?? 1);

	const editor: Editor = createImageEditor({
		get src() {
			return archivo;
		},
		get aspectRatio() {
			return valorProporcion;
		},
		initialCropScale: 0.92,
		/*
		 | `pluginWatermark()` no dibuja nada por sí solo: sólo hornea
		 | `editor.watermarkSettings` en el archivo exportado SI su `text` no
		 | está vacío. Con el interruptor apagado ese texto es una cadena
		 | vacía, así que incluir el plugin es inofensivo aunque
		 | `mostrarSello` sea `false` — nunca se llama a `setWatermark` con
		 | texto en ese caso.
		 */
		plugins: [pluginPresetsMunicipales(), pluginWatermark()]
	});

	/**
	 * El sello municipal: opcional y por publicación, nunca automático.
	 *
	 * Quien publica decide caso por caso si esa fotografía lo lleva — una
	 * infografía institucional puede querer el sello, una foto de una minga
	 * puede no necesitarlo. Posición, opacidad y tamaño SÍ son fijos: el
	 * sello es una marca de identidad, no algo que cada fotografía deba
	 * restylear a su gusto.
	 */
	let selloActivo = $state(false);

	$effect(() => {
		// Los valores de los que este efecto SÍ debe depender se leen aquí
		// fuera, en el cuerpo normal del efecto.
		const texto = mostrarSello && selloActivo ? marcaTexto : '';

		/*
		 | `setWatermark` hace un merge inmutable por dentro —
		 | `watermark = { ...watermark, ...ajuste }`— y esa lectura de
		 | `watermark` ocurre DENTRO de este efecto en cuanto se le llama.
		 | Svelte no distingue de qué función viene una lectura: la cuenta
		 | como dependencia de quien esté ejecutándose en ese momento. El
		 | resultado, sin `untrack`, es que este mismo efecto lee y escribe el
		 | mismo estado en una sola pasada y Svelte lo corta con «Maximum
		 | update depth exceeded» — el mismo síntoma, y la misma causa, que ya
		 | apareció una vez en el efecto de recorte de este archivo.
		 */
		untrack(() =>
			editor.setWatermark({ text: texto, position: 'bottom-right', opacity: 0.82, color: '#ffffff', fontSize: 22 })
		);
	});

	$effect(() => {
		editor.setAspectRatio(valorProporcion);
	});

	/*
	 | Al cambiar de archivo, la sesión de edición anterior no significa nada:
	 | recorte y rotación vuelven al centro (`reset`) y el filtro y los siete
	 | ajustes finos vuelven a cero (`resetFilters`). El guardia de
	 | `ultimoArchivo` evita que esto se dispare también en el montaje inicial,
	 | que es el mismo motivo por el que hacía falta en la versión anterior.
	 */
	let ultimoArchivo: File | null = null;

	$effect(() => {
		const actual = archivo;

		if (ultimoArchivo === null || ultimoArchivo === actual) {
			ultimoArchivo = actual;

			return;
		}

		ultimoArchivo = actual;
		editor.reset();
		editor.resetFilters();
	});

	let contenedor = $state<HTMLElement | undefined>();
	let lienzo = $state<HTMLCanvasElement | undefined>();

	$effect(() => {
		if (contenedor) editor.bindContainer(contenedor);
	});

	$effect(() => {
		if (lienzo) editor.bindCanvas(lienzo);
	});

	$effect(() => () => editor.destroy());

	/**
	 * Cada cambio de encuadre, rotación, filtro o ajuste produce un archivo
	 * nuevo, con freno de 200 ms: arrastrar el recuadro dispara decenas de
	 * cambios por segundo.
	 *
	 * `JSON.stringify` sobre los tres bloques de estado no es un atajo
	 * perezoso: es lo que hace que Svelte rastree cada campo que toca —recorte,
	 * rotación, cada uno de los siete ajustes— sin tener que enumerarlos aquí
	 * uno por uno y arriesgarse a olvidar alguno.
	 */
	$effect(() => {
		JSON.stringify({
			crop: editor.crop,
			transforms: editor.transforms,
			filters: editor.filters,
			marca: editor.watermarkSettings
		});

		if (!editor.ready || !alCambiar) return;

		const temporizador = setTimeout(async () => {
			try {
				const resultado = await editor.export({ format: 'image/jpeg', quality: 0.9, maxWidth: 1440 });

				if (resultado.blob) alCambiar(resultado.blob);
			} catch {
				// Un recorte imposible (imagen aún sin medir) no rompe nada: el
				// próximo cambio vuelve a intentarlo.
			}
		}, 200);

		return () => clearTimeout(temporizador);
	});

	/**
	 * Miniaturas del catálogo de filtros, generadas UNA vez por fotografía.
	 *
	 * Se recorta una copia pequeña (72px) del original y se le aplica cada
	 * matriz con `applyColorMatrix` — la misma función que usa el editor para
	 * el archivo final, así que la miniatura no miente sobre el resultado.
	 */
	let miniaturas = $state<Record<string, string>>({});

	$effect(() => {
		if (!editor.image) return;

		const base = document.createElement('canvas');
		base.width = 72;
		base.height = 72;
		const ctxBase = base.getContext('2d');
		if (!ctxBase) return;

		const img = editor.image.element;
		const lado = Math.min(img.naturalWidth ?? img.width, img.naturalHeight ?? img.height);
		const sx = ((img.naturalWidth ?? img.width) - lado) / 2;
		const sy = ((img.naturalHeight ?? img.height) - lado) / 2;
		ctxBase.drawImage(img, sx, sy, lado, lado, 0, 0, 72, 72);
		const original = ctxBase.getImageData(0, 0, 72, 72);

		const nuevas: Record<string, string> = { none: base.toDataURL('image/jpeg', 0.7) };

		for (const preset of PRESETS_MUNICIPALES) {
			const copia = new ImageData(new Uint8ClampedArray(original.data), 72, 72);
			applyColorMatrix(copia, preset.matrix);

			const lienzoPreset = document.createElement('canvas');
			lienzoPreset.width = 72;
			lienzoPreset.height = 72;
			lienzoPreset.getContext('2d')?.putImageData(copia, 0, 0);
			nuevas[preset.name] = lienzoPreset.toDataURL('image/jpeg', 0.7);
		}

		miniaturas = nuevas;
	});

	/** Vuelve los siete ajustes finos a su neutro, sin tocar el preajuste elegido. */
	function restablecerAjustes() {
		for (const c of CONTROLES_AJUSTE) editor.setFinetune(c.clave, c.neutro);
	}

	const hayAjustesActivos = $derived(CONTROLES_AJUSTE.some((c) => editor.filters[c.clave] !== c.neutro));

	const pasos: { id: Paso; texto: string; icono: 'recortar' | 'filtros' | 'ajustes' }[] = [
		{ id: 'recortar', texto: 'Recortar', icono: 'recortar' },
		{ id: 'filtros', texto: 'Filtros', icono: 'filtros' },
		{ id: 'ajustes', texto: 'Ajustes', icono: 'ajustes' }
	];
</script>

<div class="editor">
	<div class="lienzo-caja" style="--proporcion: {valorProporcion}">
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			bind:this={contenedor}
			class="lienzo"
			role="application"
			aria-label="Encuadre de la fotografía. Arrástrala para moverla, usa las flechas del teclado o la rueda para acercar."
			tabindex="0"
			onkeydown={editor.handleKeyboard}
			onwheel={editor.handleWheel}
		>
			{#if editor.loading}
				<p class="cargando" role="status">Abriendo la fotografía…</p>
			{:else if editor.image}
				<canvas bind:this={lienzo} class="chop-canvas"></canvas>

				<CropStencil
					rect={editor.crop.viewport}
					aspectRatio={valorProporcion}
					active={editor.interacting}
					imageBounds={editor.imageRect}
					grid={paso === 'recortar' ? 'rule-of-thirds' : 'none'}
					transitions={true}
					onmove={editor.moveBy}
					onresize={editor.resizeBy}
					onresizestart={() => editor.setInteracting(true)}
					onresizeend={() => editor.setInteracting(false)}
				/>

				<CropOverlay rect={editor.crop.viewport} imageBounds={editor.imageRect} />
			{/if}
		</div>

		{#if editor.canUndo}
			<button type="button" class="deshacer" onclick={() => editor.undo()}>
				<IconoEstudio nombre="atras" tamano={16} />
				Deshacer
			</button>
		{/if}
	</div>

	<nav class="pasos" aria-label="Herramientas de la fotografía">
		{#each pasos as p (p.id)}
			<button type="button" class="paso" class:activo={paso === p.id} onclick={() => (paso = p.id)}>
				<IconoEstudio nombre={p.icono} tamano={19} />
				{p.texto}
			</button>
		{/each}
	</nav>

	{#if paso === 'recortar'}
		<div class="panel">
			<div class="proporciones">
				{#each PROPORCIONES as p (p.clave)}
					<button
						type="button"
						class="ficha"
						class:activa={proporcion === p.clave}
						onclick={() => (proporcion = p.clave)}
						title={p.para}
					>
						<span class="muestra-caja">
							<span class="muestra" style="aspect-ratio: {p.valor}"></span>
						</span>
						{p.nombre}
					</button>
				{/each}
			</div>

			<div class="giro">
				<button type="button" class="boton-giro" onclick={() => editor.rotate(-90)}>
					<IconoEstudio nombre="atras" tamano={17} />
					Girar a la izquierda
				</button>
				<button type="button" class="boton-giro" onclick={() => editor.rotate(90)}>
					<IconoEstudio nombre="atras" tamano={17} />
					<span class="espejo">Girar a la derecha</span>
				</button>
			</div>

			<label class="deslizador">
				<span>Acercar</span>
				<input
					type="range"
					min="1"
					max="3"
					step="0.01"
					value={editor.transforms.zoom}
					oninput={(e) => editor.setZoom(Number(e.currentTarget.value))}
				/>
			</label>

			<p class="pista">
				Arrastra el recuadro para moverlo y sus esquinas para ajustarlo. Con el teclado, las flechas
				lo mueven.
			</p>
		</div>
	{:else if paso === 'filtros'}
		<div class="panel">
			<ul class="filtros">
				<li>
					<button
						type="button"
						class="muestra-filtro"
						class:activa={editor.filters.preset === null || editor.filters.preset === 'none'}
						onclick={() => editor.applyFilter('none')}
					>
						<span class="miniatura">
							{#if miniaturas.none}<img src={miniaturas.none} alt="" />{/if}
						</span>
						Original
					</button>
				</li>
				{#each PRESETS_MUNICIPALES as p (p.name)}
					<li>
						<button
							type="button"
							class="muestra-filtro"
							class:activa={editor.filters.preset === p.name}
							onclick={() => editor.applyFilter(p.name)}
						>
							<span class="miniatura">
								{#if miniaturas[p.name]}<img src={miniaturas[p.name]} alt="" />{/if}
							</span>
							{p.label}
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{:else}
		<div class="panel">
			{#each CONTROLES_AJUSTE as c (c.clave)}
				<label class="deslizador">
					<span>{c.nombre} <em>{editor.filters[c.clave]}</em></span>
					<input
						type="range"
						min={c.min}
						max={c.max}
						step={c.paso}
						value={editor.filters[c.clave]}
						oninput={(e) => editor.setFinetune(c.clave, Number(e.currentTarget.value))}
					/>
				</label>
			{/each}

			{#if hayAjustesActivos}
				<button type="button" class="restablecer" onclick={restablecerAjustes}>
					Volver a los valores originales
				</button>
			{/if}

			{#if mostrarSello}
				<label class="sello">
					<input type="checkbox" bind:checked={selloActivo} />
					<span>
						<strong>Sello municipal</strong>
						<em>
							Estampa «{marcaTexto}» en la esquina de la fotografía. No se ve aquí en la
							vista previa —se aplica al exportar—, pero sí estará en el archivo que se sube.
						</em>
					</span>
				</label>
			{/if}
		</div>
	{/if}
</div>

<style>
	.editor {
		display: flex;
		flex-direction: column;
	}

	.lienzo-caja {
		position: relative;
	}

	/*
	  La piel de la librería, mapeada a Mosaico. Es headless y se viste por
	  estas variables, así que el recuadro y los tiradores son los del sitio y
	  no los del tema que trae de fábrica — que no se importa en ningún sitio.
	*/
	.lienzo {
		--chop-bg: var(--color-carbon-900);
		--chop-overlay: rgb(30 31 29 / 0.62);
		--chop-stencil-border: rgb(255 255 255 / 0.85);
		--chop-stencil-border-active: var(--color-achiote-400);
		--chop-handle-color: var(--color-achiote-400);
		--chop-handle-size: 12px;
		--chop-grid-color: rgb(255 255 255 / 0.35);
		--chop-border-radius: 0;
		--chop-transition-duration: 200ms;
		--chop-transition-easing: var(--ease-suave);

		position: relative;
		width: 100%;
		aspect-ratio: var(--proporcion);
		max-height: 62vh;
		background: var(--color-carbon-900);
		overflow: hidden;
		touch-action: none;
	}

	.chop-canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		z-index: 0;
		pointer-events: none;
	}

	/* Los tiradores necesitan zona de dedo aunque se vean de 12 px. */
	.lienzo :global([data-chop-handle]) {
		min-width: 44px;
		min-height: 44px;
	}

	.cargando {
		display: grid;
		place-items: center;
		height: 100%;
		color: var(--color-papel);
		font-size: 0.85rem;
	}

	.deshacer {
		position: absolute;
		top: 0.6rem;
		left: 0.6rem;
		z-index: 2;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		min-height: 34px;
		padding-inline: 0.7rem;
		border: none;
		border-radius: var(--radius-md);
		background: rgb(30 31 29 / 0.72);
		color: var(--color-papel);
		font-family: inherit;
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
		backdrop-filter: blur(4px);
	}

	.pasos {
		display: flex;
		border-bottom: var(--canto);
	}

	.paso {
		display: flex;
		flex: 1;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		min-height: 46px;
		border: none;
		background: none;
		color: var(--texto-suave);
		font-family: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		border-bottom: 2px solid transparent;
		transition:
			color var(--transicion),
			border-color var(--transicion);
	}

	.paso:hover {
		color: var(--texto);
	}

	.paso.activo {
		color: var(--texto);
		border-bottom-color: var(--texto);
	}

	.panel {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		padding: 1rem;
	}

	.proporciones {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.ficha {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		min-width: 4.2rem;
		padding: 0.5rem;
		border: 1px solid var(--borde);
		background: none;
		color: var(--texto-suave);
		font-family: inherit;
		font-size: 0.72rem;
		cursor: pointer;
		transition:
			border-color var(--transicion),
			color var(--transicion);
	}

	.ficha:hover {
		color: var(--texto);
	}

	.ficha.activa {
		border-color: var(--marca);
		color: var(--texto);
	}

	.muestra-caja {
		display: grid;
		place-items: center;
		height: 34px;
	}

	.muestra {
		display: block;
		width: 22px;
		max-height: 32px;
		border: 1.6px solid currentColor;
		border-radius: 2px;
	}

	.giro {
		display: flex;
		gap: 0.5rem;
	}

	.boton-giro {
		display: inline-flex;
		flex: 1;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		min-height: 2.5rem;
		border: 1px solid var(--borde);
		background: none;
		color: var(--texto);
		font-family: inherit;
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
	}

	.boton-giro:hover {
		border-color: var(--marca);
	}

	/* El mismo icono de «atrás» sirve para las dos direcciones: se invierte
	   por CSS en vez de cargar un segundo SVG idéntico al espejo. */
	.boton-giro:last-child :global(svg) {
		transform: scaleX(-1);
	}

	.deslizador {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: 0.8rem;
	}

	.deslizador span {
		display: flex;
		justify-content: space-between;
		color: var(--texto-suave);
	}

	.deslizador em {
		font-style: normal;
		font-variant-numeric: tabular-nums;
	}

	input[type='range'] {
		width: 100%;
		accent-color: var(--marca);
		min-height: 32px;
	}

	.filtros {
		display: flex;
		gap: 0.65rem;
		overflow-x: auto;
		padding-bottom: 0.35rem;
		scrollbar-width: none;
	}

	.filtros::-webkit-scrollbar {
		display: none;
	}

	.muestra-filtro {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		border: none;
		background: none;
		color: var(--texto-suave);
		font-family: inherit;
		font-size: 0.7rem;
		cursor: pointer;
	}

	.muestra-filtro.activa {
		color: var(--texto);
		font-weight: 700;
	}

	.miniatura {
		display: block;
		width: 62px;
		height: 62px;
		overflow: hidden;
		border: 2px solid transparent;
		background: var(--superficie-alt);
		border-radius: var(--radius-sm);
		transition: border-color var(--transicion);
	}

	.muestra-filtro.activa .miniatura {
		border-color: var(--marca);
	}

	.miniatura img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.restablecer {
		align-self: flex-start;
		border: none;
		background: none;
		color: var(--enlace);
		font-family: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		text-decoration: underline;
	}

	.pista {
		font-size: 0.8rem;
		line-height: 1.55;
		color: var(--texto-suave);
	}

	.sello {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		padding-top: 0.6rem;
		border-top: var(--canto);
		cursor: pointer;
	}

	.sello input {
		margin-top: 0.2rem;
		width: 1.05rem;
		height: 1.05rem;
		accent-color: var(--marca);
		flex-shrink: 0;
	}

	.sello span {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		font-size: 0.85rem;
	}

	.sello em {
		font-style: normal;
		font-size: 0.76rem;
		color: var(--texto-suave);
	}

	@media (prefers-reduced-motion: reduce) {
		.paso,
		.ficha,
		.miniatura {
			transition: none;
		}
	}
</style>
