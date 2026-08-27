<script lang="ts">
	import { onMount } from 'svelte';

	/**
	 * Apertura de la portada: fotografía real del cantón a pantalla
	 * completa.
	 *
	 * Las tres imágenes son del propio archivo municipal — el puente
	 * atirantado sobre el Napo al anochecer, la laguna de Añangu y el
	 * mirador de la comunidad Añangu sobre el río. No son fotos de banco:
	 * el cantón se presenta con su propio paisaje, que es exactamente lo
	 * que justifica el reconocimiento "Rincón Mágico" y lo que la portada
	 * anterior escondía detrás de rectángulos de color.
	 *
	 * Se descartó vídeo de fondo a propósito. Buena parte de quien entra a
	 * este sitio lo hace desde datos móviles limitados (ver
	 * docs/arquitectura.md); el fotograma más pesado de este carrusel pesa
	 * 227 KB y el móvil sólo descarga la versión de 960 px. Un vídeo
	 * costaría veinte veces eso para decir lo mismo.
	 */
	let { totalTramites, totalNoticias }: { totalTramites: number; totalNoticias: number } = $props();

	interface Fotograma {
		archivo: string;
		lugar: string;
		detalle: string;
		/** Posición del encuadre: dónde está el motivo que no se debe recortar. */
		encuadre: string;
	}

	const fotogramas: Fotograma[] = [
		{
			archivo: 'puente-napo',
			lugar: 'Puente sobre el río Napo',
			detalle: 'Anochecer desde el malecón de El Coca',
			encuadre: '50% 42%'
		},
		{
			archivo: 'laguna-anangu',
			lugar: 'Laguna de Añangu',
			detalle: 'Comunidad kichwa Añangu, Parque Nacional Yasuní',
			encuadre: '50% 55%'
		},
		{
			archivo: 'mirador-anangu',
			lugar: 'Mirador de Añangu',
			detalle: 'El Napo visto desde el dosel de la selva',
			encuadre: '50% 60%'
		}
	];

	const DURACION = 7000;

	let actual = $state(0);
	let enPausa = $state(false);
	/** Sin JS, o con movimiento reducido, se queda el primer fotograma fijo. */
	let animado = $state(false);
	/**
	 * Los fotogramas 2 y 3 no se montan de entrada. Están posicionados sobre
	 * el viewport, así que `loading="lazy"` no los frena: el navegador los
	 * consideraría visibles y los pediría junto al primero, compitiendo con
	 * el LCP. Montarlos algo después deja pasar antes la imagen que sí se
	 * ve — y quien pide movimiento reducido no los descarga nunca, porque
	 * para esa persona el carrusel no existe.
	 */
	let montarRestantes = $state(false);

	const fotoActual = $derived(fotogramas[actual]);

	onMount(() => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		animado = true;

		const alRalenti = setTimeout(() => (montarRestantes = true), 1200);
		let temporizador: ReturnType<typeof setInterval>;

		const arrancar = () => {
			clearInterval(temporizador);
			temporizador = setInterval(() => {
				if (!enPausa) actual = (actual + 1) % fotogramas.length;
			}, DURACION);
		};

		// Con la pestaña en segundo plano no tiene sentido seguir rotando:
		// el visitante volvería a un fotograma cualquiera sin transición.
		const alCambiarVisibilidad = () => {
			if (document.hidden) clearInterval(temporizador);
			else arrancar();
		};

		arrancar();
		document.addEventListener('visibilitychange', alCambiarVisibilidad);

		return () => {
			clearTimeout(alRalenti);
			clearInterval(temporizador);
			document.removeEventListener('visibilitychange', alCambiarVisibilidad);
		};
	});

	function irA(i: number) {
		// Los controles aparecen en cuanto monta el componente, antes de que
		// se monten los fotogramas 2 y 3. Si alguien pulsa un punto en ese
		// primer segundo, la imagen tiene que existir ya.
		montarRestantes = true;
		actual = i;
	}
</script>

<svelte:head>
	<!--
		El primer fotograma es el LCP de la página. Sin preload el navegador
		lo descubre al parsear el <img>, ya con el CSS resuelto; con él sale
		en la primera tanda de peticiones.

		Se precarga con `imagesrcset`/`imagesizes`, no con dos <link> partidos
		por una media query, para que el navegador aplique aquí exactamente el
		mismo cálculo que hará luego en el <img>. Partirlo por ancho de
		pantalla falla en cuanto entra la densidad de píxeles: un móvil de
		400 px a 3x necesita 1200 px reales y pediría la variante de 1920,
		mientras la media query "es móvil, dale la de 960" habría precargado
		la equivocada — y se descargarían las dos.
	-->
	<link
		rel="preload"
		as="image"
		imagesrcset="/img/portada/puente-napo-960.webp 960w, /img/portada/puente-napo.webp 1920w"
		imagesizes="100vw"
		fetchpriority="high"
	/>
</svelte:head>

<section class="hero" aria-label="El cantón Francisco de Orellana">
	<!-- ── Capa 1: los fotogramas ── -->
	<div class="lienzo" aria-hidden="true">
		{#each fotogramas as f, i (f.archivo)}
			{#if i === 0 || montarRestantes}
				<img
					src="/img/portada/{f.archivo}.webp"
					srcset="/img/portada/{f.archivo}-960.webp 960w, /img/portada/{f.archivo}.webp 1920w"
					sizes="100vw"
					alt=""
					width="1920"
					height="900"
					class="fotograma"
					class:activo={i === actual}
					class:deriva={animado && i === actual && !enPausa}
					style:object-position={f.encuadre}
					loading={i === 0 ? 'eager' : 'lazy'}
					fetchpriority={i === 0 ? 'high' : 'low'}
					decoding={i === 0 ? 'sync' : 'async'}
				/>
			{/if}
		{/each}
	</div>

	<div class="velo-hero" aria-hidden="true"></div>

	<!-- ── Capa 2: el contenido ── -->
	<div class="contenedor relative flex flex-1 flex-col justify-end pb-7 md:pb-9">
		<div class="flex gap-4 pt-6 sm:gap-5 md:gap-7 md:pt-14">
			<span class="filete-vertical mt-2 shrink-0 self-stretch" aria-hidden="true"></span>

			<div class="min-w-0 flex-1">
				<!--
					Distinción oficial, no una descripción propia: el Ministerio de
					Turismo entregó el reconocimiento Rincón Mágico "El Coca, Entrada
					al Yasuní" el 20 de junio de 2025, en el parque Bocana del
					Payamino.
				-->
				<p
					class="flex items-center gap-2.5 text-[0.68rem] font-bold tracking-[0.24em] text-[var(--color-achiote-400)] uppercase md:text-[0.74rem]"
				>
					<span class="h-px w-8 bg-[var(--color-achiote-400)]"></span>
					Rincón Mágico del Ecuador
				</p>

				<h1 class="titular-cartel mt-4 text-white">
					<span class="block text-[clamp(3.1rem,11vw,8.75rem)]">El Coca</span>
					<span
						class="mt-1 block text-[clamp(1.1rem,3.4vw,2.4rem)] font-normal tracking-[-0.01em] text-white/80 [font-stretch:100%]"
					>
						entrada al Yasuní
					</span>
				</h1>

				<p class="mt-4 max-w-lg text-[0.95rem] leading-relaxed text-white/85 md:mt-5 md:text-[1.06rem]">
					A las puertas de uno de los parques más megadiversos del planeta. Aquí están los
					trámites, las obras y las noticias del cantón.
				</p>

				<!--
					El buscador es la acción primaria de la portada, no un adorno del
					encabezado: quien entra a un sitio municipal casi siempre viene a
					por una cosa concreta ("patente", "agua potable"), y hacerle
					adivinar bajo qué dirección se tramita es justamente el problema
					del sitio actual.
				-->
				<form
					action="/buscar"
					method="GET"
					role="search"
					class="mt-6 flex w-full max-w-xl flex-col gap-1.5 sm:mt-7 sm:flex-row"
				>
					<label for="busqueda-portada" class="sr-only">
						Buscar trámites, noticias y documentos del municipio
					</label>
					<input
						id="busqueda-portada"
						name="q"
						type="search"
						autocomplete="off"
						placeholder="Buscar un trámite, una obra, un documento…"
						class="min-h-[54px] flex-1 border-2 border-white/25 bg-black/45 px-4 text-[0.98rem] text-white backdrop-blur-sm placeholder:text-white/55 focus:border-[var(--color-achiote-400)] focus:outline-none"
					/>
					<button
						type="submit"
						class="inline-flex min-h-[54px] shrink-0 cursor-pointer items-center justify-center gap-2 bg-[var(--color-achiote-500)] px-6 text-[0.95rem] font-bold text-[var(--color-carbon-900)] transition-[filter] duration-200 hover:brightness-95"
					>
						<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
							<circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2.4" />
							<path
								d="m20 20-3.6-3.6"
								stroke="currentColor"
								stroke-width="2.4"
								stroke-linecap="round"
							/>
						</svg>
						Buscar
					</button>
				</form>

				<ul
					class="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] sm:mt-4 sm:flex-wrap sm:overflow-visible sm:pb-0"
				>
					<li class="mr-1 shrink-0 text-[0.78rem] font-semibold text-white/55">Lo más buscado:</li>
					{#each [{ t: 'Patente municipal', q: 'patente' }, { t: 'Agua potable', q: 'agua potable' }, { t: 'Permiso de construcción', q: 'permiso construcción' }] as a (a.q)}
						<li>
							<a
								href="/buscar?q={encodeURIComponent(a.q)}"
								class="inline-flex min-h-9 shrink-0 items-center border border-white/25 px-3 text-[0.8rem] font-semibold whitespace-nowrap text-white/90 no-underline transition-colors hover:border-white hover:bg-white hover:text-[var(--color-carbon-900)]"
							>
								{a.t}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		</div>

		<!-- ── Capa 3: pie del héroe — dato vivo, crédito de foto y controles ── -->
		<div
			class="mt-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-t border-white/20 pt-4 sm:mt-8 sm:pt-5 md:mt-10"
		>
			<!--
				La tercera cifra sólo aparece a partir de sm. En un móvil de
				360 px, con los controles del carrusel compartiendo la fila,
				tres columnas dejaban ~57 px por etiqueta y las palabras se
				cortaban. Trámites y noticias son las dos que un vecino del
				cantón viene a mirar; el directorio de extensiones vive en
				/contacto, que está en la navegación.
			-->
			<dl class="grid flex-1 grid-cols-2 gap-x-5 sm:flex sm:flex-none sm:flex-wrap sm:items-center sm:gap-x-7 md:gap-x-10">
				{#each [{ v: totalTramites, e: 'trámites en línea', c: 'trámites', movil: true }, { v: totalNoticias, e: 'noticias publicadas', c: 'noticias', movil: true }, { v: '104', e: 'extensiones de contacto', c: 'extensiones', movil: false }] as d (d.e)}
					<div class="min-w-0 sm:flex sm:items-baseline sm:gap-2" class:oculto-movil={!d.movil}>
						<dt class="sr-only">{d.e}</dt>
						<dd class="display cifra-tabular text-[1.4rem] text-white sm:text-[1.6rem] md:text-[1.9rem]">
							{d.v}
						</dd>
						<span
							class="mt-0.5 block text-[0.62rem] leading-tight font-semibold tracking-wide text-white/60 uppercase sm:mt-0 sm:text-[0.72rem]"
							aria-hidden="true"
						>
							<span class="sm:hidden">{d.c}</span>
							<span class="hidden sm:inline">{d.e}</span>
						</span>
					</div>
				{/each}
			</dl>

			<div class="flex items-center gap-4">
				<p class="hidden text-right text-[0.72rem] leading-tight text-white/60 sm:block">
					<span class="block font-bold text-white/85">{fotoActual.lugar}</span>
					{fotoActual.detalle}
				</p>

				{#if animado}
					<div class="flex items-center gap-1">
						<button
							type="button"
							onclick={() => (enPausa = !enPausa)}
							class="inline-flex h-11 w-11 cursor-pointer items-center justify-center text-white/75 transition-colors hover:text-white"
							aria-label={enPausa ? 'Reanudar el paso de fotografías' : 'Pausar el paso de fotografías'}
						>
							{#if enPausa}
								<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
									<path d="M7 4.5 20 12 7 19.5z" />
								</svg>
							{:else}
								<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
									<path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z" />
								</svg>
							{/if}
						</button>

						{#each fotogramas as f, i (f.archivo)}
							<button
								type="button"
								onclick={() => irA(i)}
								class="group inline-flex h-11 w-6 cursor-pointer items-center justify-center"
								aria-label="Ver: {f.lugar}"
								aria-current={i === actual ? 'true' : undefined}
							>
								<span
									class="block h-[3px] w-full transition-colors {i === actual
										? 'bg-[var(--color-achiote-400)]'
										: 'bg-white/35 group-hover:bg-white/70'}"
								></span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!--
		Indicador de scroll: una línea que baja, no una flecha rebotando. Va
		en el margen exterior de la retícula, no centrada: en el centro se
		cruzaba con la barra de cifras del pie.
	-->
	<span class="cue" aria-hidden="true"><span class="cue-linea"></span></span>
</section>

<style>
	.hero {
		position: relative;
		isolation: isolate;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		min-height: 100dvh;
		/*
		   La cabecera es sticky y ocupa sitio en el flujo. El margen negativo
		   mete la fotografía por debajo para que llegue al borde superior de
		   la pantalla; el padding devuelve el espacio al contenido para que
		   el titular no quede tapado por la barra.
		*/
		margin-top: calc(-1 * var(--alto-cabecera));
		padding-top: var(--alto-cabecera);
		background: #060c08;
		overflow: hidden;
	}

	.lienzo {
		position: absolute;
		inset: 0;
		z-index: -1;
	}

	.fotograma {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0;
		/*
		   Fundido largo (1.6 s) porque es un cambio de escena, no un cambio
		   de estado de interfaz: aquí las reglas de 150-300 ms no aplican.
		*/
		transition: opacity 1.6s var(--ease-cine);
		will-change: opacity, transform;
	}

	.fotograma.activo {
		opacity: 1;
	}

	.fotograma.deriva {
		animation: deriva 20s linear both;
	}

	.cue {
		position: absolute;
		right: 1.5rem;
		bottom: 0;
		display: none;
		width: 1px;
		height: 54px;
		overflow: hidden;
		background: rgb(255 255 255 / 0.18);
	}

	/* Sólo donde hay margen exterior suficiente para que no pise el contenido. */
	@media (width >= 90rem) {
		.cue {
			display: block;
		}
	}

	.cue-linea {
		display: block;
		width: 100%;
		height: 100%;
		background: var(--color-achiote-400);
		animation: descender 2.6s var(--ease-cine) infinite;
	}

	.oculto-movil {
		display: none;
	}

	@media (width >= 40rem) {
		.oculto-movil {
			display: flex;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.fotograma {
			transition: none;
		}
		.cue {
			display: none;
		}
	}
</style>
