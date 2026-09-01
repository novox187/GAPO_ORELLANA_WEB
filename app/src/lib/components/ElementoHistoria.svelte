<script lang="ts">
	import type { ElementoHistoria } from '$lib/estudio';

	/**
	 * Pinta UN elemento sobre una historia: texto, sticker, encuesta o caja de
	 * preguntas.
	 *
	 * Vive fuera de la carpeta del estudio a propósito: lo usan el compositor
	 * —donde se arrastra y se coloca— y el visor público —donde se lee y se
	 * vota—. Con dos implementaciones, lo que se compone y lo que se ve
	 * acabarían separándose, y quien compone dejaría de poder confiar en la
	 * previsualización.
	 *
	 * La posición es fracción del lienzo (0..1), nunca píxeles: una historia
	 * se compone en un teléfono de 390 px y se ve en uno de 320 o en un
	 * escritorio de 1200. Ver la migración `crear_elementos_de_historia`.
	 */
	let {
		elemento,
		votar,
		responder,
		enviando = false,
		estatico = false
	}: {
		elemento: ElementoHistoria;
		/** Presente sólo en el visor público, cuando se puede votar. */
		votar?: (opcion: number) => void;
		responder?: (texto: string) => void;
		enviando?: boolean;
		/**
		 * Sin colocarse a sí mismo.
		 *
		 * En el visor, el elemento se posiciona solo con su x/y/escala/giro.
		 * En el compositor, quien lo coloca es el asa que se arrastra, y si
		 * además se colocara él quedaría posicionado dos veces: el recuadro de
		 * selección aparecía a un lado del sticker en vez de alrededor. Un
		 * `transform: none` en CSS no arreglaba nada, porque el estilo en
		 * línea gana siempre.
		 */
		estatico?: boolean;
	} = $props();

	const c = $derived(elemento.contenido as Record<string, never>);
	const resultados = $derived(elemento.resultados ?? null);
	const miOpcion = $derived(elemento.mi_respuesta?.opcion ?? null);
	const totalVotos = $derived(resultados ? resultados.reduce((s, v) => s + v, 0) : 0);

	let borrador = $state('');
	let enviada = $state(false);

	const ROTULOS: Record<string, string> = {
		'atencion-hoy': 'Atención hoy',
		cerrado: 'Cerrado',
		'obra-en-marcha': 'Obra en marcha',
		'convocatoria-abierta': 'Convocatoria abierta',
		'plazo-por-vencer': 'Plazo por vencer',
		gratuito: 'Gratuito',
		nuevo: 'Nuevo',
		ubicacion: 'Ubicación',
		fecha: 'Fecha',
		'atencion-ciudadana': 'Atención ciudadana'
	};

	/** [x0,y0,x1,y1,…] guardado en la base de datos -> «x0,y0 x1,y1 …» que entiende `<polyline>`. */
	function puntosSvg(plano: number[]): string {
		const pares: string[] = [];

		for (let i = 0; i < plano.length - 1; i += 2) {
			pares.push(`${plano[i]},${plano[i + 1]}`);
		}

		return pares.join(' ');
	}

	function porcentaje(i: number): number {
		if (!resultados || totalVotos === 0) return 0;

		return Math.round((resultados[i] / totalVotos) * 100);
	}

	function enviar(evento: SubmitEvent) {
		evento.preventDefault();

		if (!borrador.trim() || !responder) return;

		responder(borrador.trim());
		borrador = '';
		enviada = true;
	}
</script>

<div
	class="elemento {elemento.tipo}"
	class:estatico
	style={estatico
		? undefined
		: `left: ${elemento.x * 100}%; top: ${elemento.y * 100}%; transform: translate(-50%, -50%) scale(${elemento.escala}) rotate(${elemento.rotacion}deg)`}
>
	{#if elemento.tipo === 'texto'}
		<p class="texto color-{c.color ?? 'papel'}" class:con-fondo={c.fondo !== false} style="text-align: {c.alineacion ?? 'centro'}">
			{c.texto}
		</p>
	{:else if elemento.tipo === 'sticker'}
		<span class="sticker">
			{ROTULOS[c.clave as string] ?? c.clave}
			{#if c.detalle}<em>{c.detalle}</em>{/if}
		</span>
	{:else if elemento.tipo === 'emoji'}
		<!--
			OpenMoji, autohospedado en /openmoji/{hexcode}.svg — el mismo
			archivo que muestra el selector del compositor, así que lo que se
			eligió es exactamente lo que se ve aquí. Sin `alt` descriptivo: es
			decoración expresiva, no información — igual que un emoji dentro de
			un mensaje de texto, que un lector de pantalla puede saltarse sin
			perder nada del contenido.
		-->
		<img class="emoji" src="/openmoji/{c.hexcode}.svg" alt="" draggable="false" />
	{:else if elemento.tipo === 'dibujo'}
		<!--
			Cada trazo es una polilínea suelta, no un `<path>` con curvas: es
			exactamente lo que dibuja Konva mientras se traza —una serie de
			puntos, sin suavizado— y reconstruirlo igual aquí es lo que hace que
			el dibujo se vea idéntico en el compositor y en el visor. El
			`viewBox` es 0 0 1 1: los puntos ya vienen en fracción del propio
			recuadro del elemento, así que no hace falta reescalarlos.
		-->
		<svg
			class="dibujo"
			style="width: {(c.ancho as number) * 100}cqw; aspect-ratio: {c.ancho} / {c.alto}"
			viewBox="0 0 1 1"
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			{#each (c.trazos as { puntos: number[]; color: string; grosor: number }[]) ?? [] as trazo, i (i)}
				<!--
					Sin `vector-effect="non-scaling-stroke"` a propósito: aquí SÍ
					debe escalar con el elemento. `grosor` se guardó como fracción
					del recuadro, no como píxeles fijos, precisamente para que un
					trazo grueso siga viéndose grueso —en la misma proporción— si
					alguien agranda el dibujo después con las asas de Konva.
				-->
				<polyline
					points={puntosSvg(trazo.puntos)}
					fill="none"
					stroke={trazo.color}
					stroke-width={trazo.grosor}
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			{/each}
		</svg>
	{:else if elemento.tipo === 'encuesta'}
		<div class="tarjeta">
			<p class="pregunta">{c.pregunta}</p>

			<ul class="opciones">
				{#each (c.opciones as unknown as string[]) ?? [] as opcion, i (opcion)}
					<li>
						<button
							type="button"
							class="opcion"
							class:mia={miOpcion === i}
							disabled={!votar || enviando}
							onclick={() => votar?.(i)}
						>
							<!-- La barra de resultado va DETRÁS del texto, no al lado:
							     así la opción no cambia de tamaño al votar y la lista no
							     salta bajo el dedo. -->
							{#if resultados}
								<span class="relleno" style="width: {porcentaje(i)}%"></span>
							{/if}
							<span class="rotulo">{opcion}</span>
							{#if resultados}
								<span class="cifra">{porcentaje(i)} %</span>
							{/if}
						</button>
					</li>
				{/each}
			</ul>

			{#if resultados}
				<p class="pie">{totalVotos} {totalVotos === 1 ? 'voto' : 'votos'}</p>
			{:else if votar}
				<p class="pie">Toca para votar</p>
			{/if}
		</div>
	{:else if elemento.tipo === 'pregunta'}
		<div class="tarjeta">
			<p class="pregunta">{c.titulo}</p>

			{#if responder && !enviada}
				<form onsubmit={enviar}>
					<label class="sr-only" for="respuesta-{elemento.id}">{c.titulo}</label>
					<input
						id="respuesta-{elemento.id}"
						bind:value={borrador}
						maxlength="500"
						placeholder={(c.marcador as string) ?? 'Escribe tu pregunta…'}
					/>
					<button type="submit" disabled={!borrador.trim() || enviando}>Enviar</button>
				</form>
			{:else if enviada}
				<p class="gracias">Enviada. Gracias.</p>
			{:else}
				<p class="marcador">{c.marcador ?? 'Escribe tu pregunta…'}</p>
			{/if}

			<!-- El aviso viaja dentro del contenido del elemento, no lo pone la
			     interfaz: quien escribe tiene que saber siempre que esto lo lee
			     el municipio y no se publica. -->
			<p class="pie">{c.aviso ?? 'Tu respuesta la lee la cuenta que publicó.'}</p>
		</div>
	{/if}
</div>

<style>
	.elemento {
		position: absolute;
		max-width: 84%;
		transform-origin: center;
	}

	/* En el compositor lo coloca el asa; aquí sólo se dibuja. */
	.elemento.estatico {
		position: static;
		max-width: none;
	}

	.texto {
		margin: 0;
		padding: 0.2em 0.45em;
		font-size: clamp(1rem, 5.2cqw, 1.6rem);
		font-weight: 700;
		font-stretch: 108%;
		line-height: 1.25;
		text-wrap: balance;
	}

	.texto.con-fondo {
		border-radius: 3px;
	}

	.color-papel {
		color: var(--color-papel);
	}
	.color-papel.con-fondo {
		background: rgb(30 31 29 / 0.55);
	}

	.color-carbon {
		color: var(--color-carbon-900);
	}
	.color-carbon.con-fondo {
		background: rgb(251 250 246 / 0.88);
	}

	.color-selva {
		color: var(--color-papel);
	}
	.color-selva.con-fondo {
		background: var(--color-selva-800);
	}

	.color-achiote {
		color: var(--color-carbon-900);
	}
	.color-achiote.con-fondo {
		background: var(--color-achiote-500);
	}

	.sticker {
		display: inline-flex;
		align-items: baseline;
		gap: 0.4em;
		padding: 0.35em 0.7em;
		background: var(--color-achiote-500);
		color: var(--color-carbon-900);
		font-size: clamp(0.7rem, 3.4cqw, 1rem);
		font-weight: 800;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		box-shadow: 0 2px 10px rgb(0 0 0 / 0.25);
	}

	.sticker em {
		font-style: normal;
		font-weight: 600;
		text-transform: none;
		letter-spacing: 0;
	}

	/*
	  El tamaño base de un emoji es un múltiplo de la unidad de contenedor
	  (`cqw`, del propio lienzo — ver `container-type` en LienzoHistoria y en
	  el visor), no un tamaño fijo en píxeles: así un emoji se ve del mismo
	  tamaño RELATIVO tanto si la historia se compone en un teléfono de 390px
	  como si se ve en un escritorio de 1200. `escala` en el elemento sigue
	  siendo lo que usa quien compone para agrandarlo o achicarlo desde ahí.
	*/
	.emoji {
		display: block;
		width: clamp(2.2rem, 16cqw, 4.5rem);
		height: auto;
		filter: drop-shadow(0 2px 6px rgb(0 0 0 / 0.35));
		user-select: none;
	}

	/*
	  Sin ancho/alto fijos en la hoja de estilos: los pone la propia fila —
	  `contenido.ancho`/`contenido.alto`, fracción del LIENZO— en el atributo
	  `style` de arriba. Es lo mismo que ya hace la posición del elemento:
	  el dato manda, el CSS sólo sabe convertirlo a unidades reales.
	*/
	.dibujo {
		display: block;
		overflow: visible;
	}

	.tarjeta {
		width: min(19rem, 78vw);
		padding: 0.9rem 0.95rem;
		border-radius: 4px;
		background: rgb(251 250 246 / 0.94);
		color: var(--color-carbon-900);
		box-shadow: 0 6px 24px rgb(0 0 0 / 0.28);
		backdrop-filter: blur(6px);
	}

	.pregunta {
		font-size: 0.92rem;
		font-weight: 700;
		line-height: 1.35;
		margin-bottom: 0.6rem;
	}

	.opciones {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.opcion {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		min-height: 42px;
		padding-inline: 0.65rem;
		overflow: hidden;
		border: 1.5px solid var(--color-carbon-900);
		border-radius: 3px;
		background: transparent;
		color: inherit;
		font-family: inherit;
		font-size: 0.85rem;
		font-weight: 600;
		text-align: left;
		cursor: pointer;
	}

	.opcion:disabled {
		cursor: default;
	}

	.opcion.mia {
		border-width: 2.5px;
	}

	.relleno {
		position: absolute;
		inset: 0 auto 0 0;
		background: var(--color-selva-400);
		opacity: 0.45;
		transition: width 0.4s var(--ease-suave);
	}

	.rotulo,
	.cifra {
		position: relative;
		z-index: 1;
	}

	.cifra {
		margin-left: auto;
		font-variant-numeric: tabular-nums;
	}

	form {
		display: flex;
		gap: 0.35rem;
	}

	form input {
		flex: 1;
		min-width: 0;
		min-height: 40px;
		padding-inline: 0.6rem;
		border: 1.5px solid var(--color-carbon-900);
		border-radius: 3px;
		background: transparent;
		color: inherit;
		font-family: inherit;
		font-size: 0.85rem;
	}

	form button {
		min-height: 40px;
		padding-inline: 0.8rem;
		border: none;
		border-radius: 3px;
		background: var(--color-carbon-900);
		color: var(--color-papel);
		font-family: inherit;
		font-size: 0.82rem;
		font-weight: 700;
		cursor: pointer;
	}

	form button:disabled {
		opacity: 0.5;
	}

	.marcador {
		padding: 0.55rem 0.6rem;
		border: 1.5px dashed var(--color-carbon-700);
		border-radius: 3px;
		font-size: 0.85rem;
		color: var(--color-carbon-700);
	}

	.gracias {
		font-size: 0.88rem;
		font-weight: 700;
	}

	.pie {
		margin-top: 0.5rem;
		font-size: 0.7rem;
		line-height: 1.4;
		color: var(--color-carbon-700);
	}

	@media (prefers-reduced-motion: reduce) {
		.relleno {
			transition: none;
		}
	}
</style>
