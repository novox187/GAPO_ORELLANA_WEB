<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { img, social, type Cuenta, type ElementoHistoria, type Historia } from '$lib/api';
	import { fechaRelativa } from '$lib/api';
	import Avatar from './Avatar.svelte';
	import Insignia from './Insignia.svelte';
	import ElementoHistoriaVista from './ElementoHistoria.svelte';
	import { sesion } from '$lib/sesion.svelte';
	import { registrar } from '$lib/metricas';

	/**
	 * El visor de historias a pantalla completa.
	 *
	 * No es un diálogo modal sobre la página: ES la página
	 * (`/noticias/historias/[cuenta]`), así que una historia se puede
	 * compartir y enlazar, y el botón atrás del navegador cierra el visor
	 * como se espera. Por eso no usa `use:modal` —pensado para paneles que
	 * flotan sobre contenido de fondo— sino su propio manejo de teclado.
	 *
	 * Los requisitos que no se negocian, en orden de aparición aquí abajo:
	 * botones visibles de anterior/siguiente/cerrar (nunca sólo gestos),
	 * teclado completo, `prefers-reduced-motion` desactiva el avance
	 * automático, y sólo se precarga la diapositiva siguiente.
	 */
	let {
		cuenta,
		historias,
		indiceInicial = 0,
		segundos = 6
	}: {
		cuenta: Cuenta;
		historias: Historia[];
		indiceInicial?: number;
		/** Cuánto dura cada diapositiva. Lo decide el super admin, no este componente. */
		segundos?: number;
	} = $props();

	let indice = $state(0);
	let pausado = $state(false);
	let reducido = $state(false);
	let progreso = $state(0); // 0–100 de la diapositiva actual
	let contenedor = $state<HTMLElement | null>(null);

	const actual = $derived(historias[indice]);

	/**
	 * Mis respuestas a los elementos de esta historia, por id de elemento.
	 *
	 * Se piden aparte y sólo con sesión: la lectura del visor es pública —y
	 * por eso se cachea— y no puede saber quién mira. Es el mismo patrón de
	 * `misReacciones`.
	 */
	type MiRespuesta = { opcion?: number; texto?: string } | null;

	let mias = $state<Record<number, { mi_respuesta: MiRespuesta; resultados: number[] | null; total: number }>>({});
	let enviando = $state(false);

	/**
	 * Con una encuesta o una caja de preguntas delante, el avance automático
	 * se detiene. Seis segundos bastan para mirar una fotografía y no para
	 * leer una pregunta, decidir y tocar: sin esto, la diapositiva se iría
	 * justo cuando alguien iba a contestar, que es la forma más eficaz de que
	 * una consulta municipal no reciba respuestas.
	 */
	const esperandoRespuesta = $derived(
		(actual?.elementos ?? []).some((e) => e.tipo === 'encuesta' || e.tipo === 'pregunta')
	);

	const elementosActuales = $derived.by(() =>
		(actual?.elementos ?? []).map((e) => {
			const propia = mias[e.id];

			return propia
				? { ...e, resultados: propia.resultados, mi_respuesta: propia.mi_respuesta, respuestas_contador: propia.total }
				: e;
		})
	);

	async function votar(elemento: ElementoHistoria, opcion: number) {
		if (!sesion.autenticado) {
			sesion.pedirInicio();

			return;
		}

		if (enviando) return;
		enviando = true;

		try {
			const { data } = await social.votarEncuesta(elemento.id, opcion);
			mias = { ...mias, [elemento.id]: { mi_respuesta: data.mi_respuesta, resultados: data.resultados, total: data.total } };
		} catch {
			// El error se traga: en un visor a pantalla completa no hay sitio
			// para un cartel, y el botón se queda como estaba.
		} finally {
			enviando = false;
		}
	}

	async function responder(elemento: ElementoHistoria, texto: string) {
		if (!sesion.autenticado) {
			sesion.pedirInicio();

			return;
		}

		if (enviando) return;
		enviando = true;

		try {
			const { data } = await social.responderPregunta(elemento.id, texto);
			mias = { ...mias, [elemento.id]: { mi_respuesta: { texto }, resultados: null, total: data.total } };
		} catch {
			// Igual que arriba.
		} finally {
			enviando = false;
		}
	}

	function marcarVista(alias: string) {
		try {
			localStorage.setItem(`historia-vista:${alias}`, '1');
		} catch {
			// Almacenamiento bloqueado (navegación privada): no pasa nada, es
			// sólo una cortesía visual del anillo, no un dato que importe.
		}
	}

	function siguiente() {
		if (indice < historias.length - 1) {
			indice++;
		} else {
			// Fin de las historias de esta cuenta: no hay encadenado a la
			// siguiente cuenta todavía, así que cerrar es lo honesto — quedarse
			// en un fotograma inmóvil parecería un cuelgue.
			cerrar();
		}
	}

	function anterior() {
		indice = indice > 0 ? indice - 1 : 0;
	}

	function cerrar() {
		goto('/noticias');
	}

	function alPulsarTecla(evento: KeyboardEvent) {
		if (evento.key === 'Escape') {
			evento.preventDefault();
			cerrar();
		} else if (evento.key === 'ArrowRight') {
			evento.preventDefault();
			siguiente();
		} else if (evento.key === 'ArrowLeft') {
			evento.preventDefault();
			anterior();
		} else if (evento.key === ' ') {
			// Mantener pulsada la barra espaciadora pausa, como con el dedo.
			if (!evento.repeat) {
				evento.preventDefault();
				pausado = true;
			}
		}
	}

	function alSoltarTecla(evento: KeyboardEvent) {
		if (evento.key === ' ') pausado = false;
	}

	// Mantener pulsado con el dedo o el ratón pausa; un toque breve avanza o
	// retrocede según la mitad de la pantalla. 200 ms es el umbral que separa
	// "toque" de "mantener pulsado".
	let inicioPulsacion = 0;
	let temporizadorPausa: ReturnType<typeof setTimeout> | null = null;

	function alBajarPuntero(evento: PointerEvent) {
		inicioPulsacion = Date.now();
		temporizadorPausa = setTimeout(() => (pausado = true), 200);
	}

	function alSubirPuntero(evento: PointerEvent) {
		if (temporizadorPausa) clearTimeout(temporizadorPausa);
		const fueToque = Date.now() - inicioPulsacion < 200;
		pausado = false;

		if (fueToque && contenedor) {
			const x = evento.clientX - contenedor.getBoundingClientRect().left;
			x < contenedor.clientWidth / 2 ? anterior() : siguiente();
		}
	}

	$effect(() => {
		reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	});

	// Si la ruta cambia de cuenta sin desmontar el componente —SvelteKit
	// reutiliza la instancia cuando sólo cambia el parámetro dinámico—, el
	// índice tiene que resincronizarse con la petición nueva.
	$effect(() => {
		indice = Math.min(Math.max(indiceInicial, 0), historias.length - 1);
	});

	// Reinicia el progreso al cambiar de diapositiva y marca la historia
	// como vista de inmediato: en Instagram el anillo se apaga al abrirla,
	// no al terminarla.
	$effect(() => {
		progreso = 0;

		if (!actual) return;

		marcarVista(cuenta.alias);

		// Cada diapositiva que se abre es un evento de apertura: es lo que
		// convierte «esta historia se vio» en un número real en el estudio.
		registrar({ tipo: 'apertura_historia', recurso: 'historia', id: String(actual.id), origen: 'historia' });

		// Lo que yo respondí, sólo si hay sesión: sin ella no hay «yo».
		if (sesion.autenticado) {
			const id = actual.id;

			social
				.misRespuestas(id)
				.then(({ data }) => {
					mias = {
						...mias,
						...Object.fromEntries(
							data.map((r) => [r.elemento_id, { mi_respuesta: r.mi_respuesta, resultados: r.resultados, total: r.total }])
						)
					};
				})
				.catch(() => null);
		}
	});

	// El reloj del avance automático. Se declara como un solo efecto que se
	// reinicia con cada cambio de diapositiva o de pausa, en vez de un
	// `setInterval` de vida larga, para que pausar/reanudar no arrastre el
	// tiempo ya transcurrido de una diapositiva a la siguiente.
	//
	// `progreso` se lee con `untrack()` al calcular el punto de partida: si
	// se leyera normalmente, el propio `setInterval` —que lo escribe cada
	// 50 ms— retrigger*aría* este efecto en cada tictac y lo reiniciaría sin
	// parar. Sólo `indice`, `pausado` y `reducido` deben decidir cuándo se
	// vuelve a armar el reloj.
	$effect(() => {
		if (reducido || pausado || esperandoRespuesta || !actual) return;

		const inicio = Date.now() - untrack(() => progreso) * (segundos * 10);
		const id = setInterval(() => {
			const transcurrido = Date.now() - inicio;
			progreso = Math.min(100, (transcurrido / (segundos * 1000)) * 100);
			if (progreso >= 100) siguiente();
		}, 50);

		return () => clearInterval(id);
	});
</script>

<svelte:window onkeydown={alPulsarTecla} onkeyup={alSoltarTecla} />

<svelte:head>
	<!-- El visor de historias no aporta nada a un rastreador: es contenido
	     efímero por definición, y la ficha permanente vive en el perfil. -->
	<meta name="robots" content="noindex, follow" />
</svelte:head>

<div class="visor fixed inset-0 z-50 flex flex-col bg-black" bind:this={contenedor}>
	<!-- Barras de progreso segmentadas -->
	<div class="flex shrink-0 gap-1 px-2.5 pt-2.5" role="presentation">
		{#each historias as h, i (h.id)}
			<div class="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
				<div
					class="h-full rounded-full bg-white"
					style="width: {i < indice ? 100 : i === indice ? progreso : 0}%; transition: {i === indice
						? 'none'
						: 'width 150ms ease-out'}"
				></div>
			</div>
		{/each}
	</div>

	<p class="sr-only" role="status" aria-live="polite">
		Historia {indice + 1} de {historias.length}, {cuenta.nombre}.
		{pausado ? 'En pausa.' : ''}
	</p>

	<!-- Cabecera: cuenta + cerrar -->
	<header class="flex shrink-0 items-center gap-3 px-3.5 py-2.5">
		<Avatar {cuenta} tamano={34} />
		<div class="min-w-0 flex-1 text-white">
			<p class="flex items-center gap-1 truncate text-[0.85rem] font-bold">
				{cuenta.nombre}
				{#if cuenta.verificada}<Insignia tamano={13} />{/if}
			</p>
			{#if actual?.publicado_en}
				<time class="text-[0.72rem] text-white/70">{fechaRelativa(actual.publicado_en.slice(0, 10))}</time>
			{/if}
		</div>
		<button
			type="button"
			onclick={cerrar}
			class="grid size-11 shrink-0 cursor-pointer place-items-center text-white"
		>
			<span class="sr-only">Cerrar historia</span>
			<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
			</svg>
		</button>
	</header>

	<!-- Lienzo. El toque/mantener-pulsado es un atajo sobre los controles
	     reales de abajo (los botones anterior/siguiente y el teclado), así
	     que no necesita semántica de control propia — de ahí `presentation`. -->
	<div
		role="presentation"
		class="relative min-h-0 flex-1"
		onpointerdown={alBajarPuntero}
		onpointerup={alSubirPuntero}
		onpointercancel={() => (pausado = false)}
	>
		{#if actual}
			{#if actual.medio.tipo === 'video'}
				<!-- svelte-ignore a11y_media_has_caption -->
				<video
					src={actual.medio.rutaOriginal}
					poster={actual.medio.posterUrl ?? undefined}
					class="mx-auto h-full max-h-full w-auto max-w-full object-contain"
					autoplay
					muted
					playsinline
					onplaying={() =>
						registrar({ tipo: 'reproduccion', recurso: 'historia', id: String(actual.id), origen: 'historia' })}
				></video>
			{:else}
				<img
					src={img(actual.medio, 800)}
					alt={actual.medio.altPendiente ? '' : actual.medio.alt}
					class="mx-auto h-full max-h-full w-auto max-w-full object-contain select-none"
					draggable="false"
				/>
			{/if}

			<!-- Precarga sólo la siguiente diapositiva, no todas. -->
			{#if historias[indice + 1]}
				<img src={img(historias[indice + 1].medio, 800)} alt="" class="hidden" aria-hidden="true" />
			{/if}

			{#if actual.texto}
				<p
					class="absolute inset-x-0 bottom-24 mx-auto max-w-[85%] text-center text-[1.05rem] leading-snug font-semibold text-white drop-shadow-lg"
				>
					{actual.texto}
				</p>
			{/if}

			<!--
				La capa de elementos: el MISMO componente que usa el compositor
				del estudio, para que lo que se compone y lo que se ve sean la
				misma cosa y no dos aproximaciones.

				`pointer-events` sólo sobre los elementos, no sobre la capa: si
				la capa entera capturara el puntero, el toque para avanzar
				dejaría de funcionar en toda la mitad inferior de la pantalla.
			-->
			{#if elementosActuales.length}
				<div class="capa-elementos absolute inset-0" role="presentation">
					{#each elementosActuales as elemento (elemento.id)}
						<span
							class="interactivo"
							onpointerdown={(e) => e.stopPropagation()}
							onpointerup={(e) => e.stopPropagation()}
							role="presentation"
						>
							<ElementoHistoriaVista
								{elemento}
								{enviando}
								votar={elemento.tipo === 'encuesta' ? (o) => votar(elemento, o) : undefined}
								responder={elemento.tipo === 'pregunta' ? (t) => responder(elemento, t) : undefined}
							/>
						</span>
					{/each}
				</div>
			{/if}

			{#if actual.enlace_url}
				<a
					href={actual.enlace_url}
					onclick={() =>
						registrar({ tipo: 'enlace', recurso: 'historia', id: String(actual.id), origen: 'historia' })}
					class="absolute inset-x-0 bottom-6 mx-auto flex w-fit min-h-11 items-center gap-2 rounded-full bg-white px-5 text-[0.85rem] font-bold text-[var(--color-carbon-900)] no-underline"
				>
					{actual.enlace_texto || 'Ver más'}
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<path d="M5 12h13.5M13 5.5 19.5 12 13 18.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</a>
			{/if}
		{/if}

		<!-- Botones visibles de navegación: el tap por zonas es un atajo, no la única vía. -->
		<button
			type="button"
			onclick={anterior}
			disabled={indice === 0}
			aria-label="Historia anterior"
			class="nav nav-izq absolute inset-y-0 left-1 grid w-11 place-items-center text-white disabled:opacity-0"
		>
			<svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<path d="m15 5-7 7 7 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</button>
		<button
			type="button"
			onclick={siguiente}
			aria-label="Historia siguiente"
			class="nav nav-der absolute inset-y-0 right-1 grid w-11 place-items-center text-white"
		>
			<svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<path d="m9 5 7 7-7 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</button>
	</div>
</div>

<style>
	/*
	  La capa no captura el puntero; sus elementos sí. Si lo hiciera la capa
	  entera, el toque para avanzar dejaría de funcionar donde hubiera un
	  texto pegado, que es media pantalla.
	*/
	.capa-elementos {
		pointer-events: none;
		container-type: inline-size;
	}

	.interactivo {
		pointer-events: auto;
	}

	.visor {
		/* Aparta los controles del notch y de la barra de gestos. */
		padding-top: env(safe-area-inset-top);
		padding-bottom: env(safe-area-inset-bottom);
	}

	.nav {
		background: none;
		border: none;
		cursor: pointer;
		opacity: 0.55;
		transition: opacity 0.15s ease-out;
	}

	.nav:hover,
	.nav:focus-visible {
		opacity: 1;
	}

	@media (prefers-reduced-motion: reduce) {
		.nav {
			transition: none;
		}
	}
</style>
