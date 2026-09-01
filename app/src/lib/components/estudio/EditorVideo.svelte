<script lang="ts">
	/**
	 * Recorte temporal de un vídeo: dónde empieza y dónde acaba.
	 *
	 * A diferencia de la fotografía, aquí NO se recodifica en el navegador:
	 * hacerlo obligaría a descomprimir y volver a comprimir el archivo entero
	 * en el teléfono de quien publica, que en un vídeo de un minuto son varios
	 * minutos de espera y un ventilador. Lo que viaja es el archivo original
	 * más los dos segundos elegidos, y el corte lo hace Cloudinary **a la
	 * entrada**: lo que queda guardado es ya sólo el trozo, no el vídeo entero
	 * con una transformación encima que cualquiera pudiera quitar de la URL.
	 *
	 * El máximo no es una limitación técnica sino editorial (ver
	 * config/cloudinary.php en el backend): una publicación municipal que
	 * necesita más de un minuto no es una publicación.
	 */
	let {
		archivo,
		segundosMaximos = 60,
		alCambiar
	}: {
		archivo: File;
		segundosMaximos?: number;
		alCambiar?: (recorte: { desde: number; hasta: number }) => void;
	} = $props();

	let video = $state<HTMLVideoElement | null>(null);
	let duracion = $state(0);
	let desde = $state(0);
	let hasta = $state(0);
	let reproduciendo = $state(false);

	/* Sigue al archivo, no al montaje: quien vuelve atrás y elige otro vídeo
	   reutiliza este componente. La URL anterior se revoca al soltarla. */
	const url = $derived(URL.createObjectURL(archivo));
	const seleccion = $derived(Math.max(0, hasta - desde));
	const excede = $derived(seleccion > segundosMaximos);

	$effect(() => {
		const actual = url;

		return () => URL.revokeObjectURL(actual);
	});

	$effect(() => {
		if (duracion > 0) alCambiar?.({ desde, hasta });
	});

	function alCargar() {
		if (!video) return;

		duracion = video.duration || 0;
		desde = 0;
		// Si el vídeo ya cabe entero, la selección es el vídeo entero; si no,
		// se propone el primer minuto en vez de dejar la decisión en el aire.
		hasta = Math.min(duracion, segundosMaximos);
	}

	/** Al mover un extremo, saltar ahí: sin ver el fotograma, elegir el corte es a ciegas. */
	function saltar(segundo: number) {
		if (video) video.currentTime = segundo;
	}

	function reloj(s: number): string {
		const m = Math.floor(s / 60);
		const r = Math.floor(s % 60);

		return `${m}:${String(r).padStart(2, '0')}`;
	}

	function alternar() {
		if (!video) return;

		if (video.paused) {
			video.currentTime = desde;
			void video.play();
		} else {
			video.pause();
		}
	}

	/** Al llegar al final del recorte, para: reproducir más allá engañaría sobre lo que se publica. */
	function alAvanzar() {
		if (video && video.currentTime >= hasta) {
			video.pause();
			video.currentTime = desde;
		}
	}
</script>

<div class="editor">
	<div class="lienzo">
		<!-- svelte-ignore a11y_media_has_caption -->
		<video
			bind:this={video}
			src={url}
			onloadedmetadata={alCargar}
			ontimeupdate={alAvanzar}
			onplay={() => (reproduciendo = true)}
			onpause={() => (reproduciendo = false)}
			playsinline
		></video>

		<button type="button" class="reproducir" onclick={alternar} aria-label={reproduciendo ? 'Pausar' : 'Reproducir el recorte'}>
			{#if reproduciendo}
				<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<rect x="6" y="5" width="4" height="14" rx="1" />
					<rect x="14" y="5" width="4" height="14" rx="1" />
				</svg>
			{:else}
				<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path d="M8 5.5v13l11-6.5z" />
				</svg>
			{/if}
		</button>
	</div>

	{#if duracion > 0}
		<div class="panel">
			<p class="resumen">
				<strong>{reloj(seleccion)}</strong>
				de {reloj(duracion)}
				{#if excede}
					<span class="excede">— pasa del máximo de {reloj(segundosMaximos)}</span>
				{/if}
			</p>

			<label class="deslizador">
				<span>Empieza en <em>{reloj(desde)}</em></span>
				<input
					type="range"
					min="0"
					max={duracion}
					step="0.1"
					bind:value={desde}
					oninput={() => {
						if (desde >= hasta) desde = Math.max(0, hasta - 1);
						saltar(desde);
					}}
				/>
			</label>

			<label class="deslizador">
				<span>Termina en <em>{reloj(hasta)}</em></span>
				<input
					type="range"
					min="0"
					max={duracion}
					step="0.1"
					bind:value={hasta}
					oninput={() => {
						if (hasta <= desde) hasta = Math.min(duracion, desde + 1);
						saltar(hasta);
					}}
				/>
			</label>

			{#if excede}
				<p class="aviso" role="alert">
					Recorta hasta {reloj(segundosMaximos)} o menos. El servidor rechaza lo que pase de ahí, y
					es mejor decidir tú qué se queda fuera.
				</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.lienzo {
		position: relative;
		background: var(--color-carbon-900);
	}

	video {
		display: block;
		width: 100%;
		max-height: 60vh;
		object-fit: contain;
	}

	.reproducir {
		position: absolute;
		left: 50%;
		bottom: 0.75rem;
		transform: translateX(-50%);
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		border: none;
		border-radius: 999px;
		background: rgb(0 0 0 / 0.55);
		color: #fff;
		cursor: pointer;
	}

	.panel {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		padding: 1rem;
	}

	.resumen {
		font-size: 0.85rem;
		color: var(--texto-suave);
	}

	.resumen strong {
		color: var(--texto);
		font-variant-numeric: tabular-nums;
	}

	.excede {
		color: var(--color-error);
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
		min-height: 32px;
		accent-color: var(--marca);
	}

	.aviso {
		font-size: 0.82rem;
		line-height: 1.5;
		color: var(--color-error);
	}
</style>
