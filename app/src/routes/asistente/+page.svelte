<script lang="ts">
	import { tick } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { page } from '$app/state';
	import { afterNavigate, replaceState } from '$app/navigation';
	import { API_BASE } from '$lib/api';
	import Jaguar from '$lib/components/Jaguar.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import Pictograma from '$lib/components/Pictograma.svelte';
	import FichaEnChat from '$lib/components/FichaEnChat.svelte';
	import type { Respuesta, Turno } from '$lib/asistente';

	/**
	 * El asistente ciudadano, como conversación.
	 *
	 * Ocupa la pantalla completa y no es una burbuja flotante en todo el sitio:
	 * así el JavaScript del chat sólo se carga aquí. Buena parte de quien entra
	 * a este sitio lo hace desde datos móviles limitados y no tiene por qué
	 * pagar el peso de un chat para leer una noticia.
	 *
	 * **El orden: primero habla, luego la ficha.** La recuperación tarda 20 ms
	 * y redactar entre 6 y 22 s en CPU, así que la ficha está lista mucho antes
	 * que el texto. Aun así se guarda hasta que el asistente termina de hablar:
	 * enseñarla mientras el modelo escribe convertía la conversación en un
	 * volcado de ocho requisitos con un párrafo pegado encima, y lo que el
	 * ciudadano preguntó quedaba sepultado debajo.
	 *
	 * Lo que evita la espera en blanco no es la ficha, es el flujo: el texto
	 * empieza a aparecer al segundo y medio. La ficha llega después y en
	 * versión plegada, para quien quiera el detalle.
	 */

	/**
	 * `crypto.randomUUID` sólo existe en contexto seguro (HTTPS o localhost).
	 * El sitio se sirve hoy en HTTP plano en el subdominio de despliegue, así
	 * que en producción es `undefined` y el chat entero quedaba roto al
	 * primer clic. Estos ids son sólo para `key`-ar turnos en pantalla, no
	 * necesitan ser criptográficos: `crypto.getRandomValues` sí funciona sin
	 * contexto seguro, y sirve de respaldo.
	 */
	function idTurno(): string {
		if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
		if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
			const bytes = crypto.getRandomValues(new Uint8Array(16));
			bytes[6] = (bytes[6] & 0x0f) | 0x40;
			bytes[8] = (bytes[8] & 0x3f) | 0x80;
			const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
			return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
		}
		return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
	}

	const EJEMPLOS = [
		'Quiero poner un local',
		'¿Qué necesito para el permiso de construcción?',
		'No me llega el agua',
		'¿Dónde veo las ordenanzas?'
	];

	const CLAVE_SESION = 'asistente:conversacion';

	/**
	 * Lo que se enseña mientras el modelo escribe.
	 *
	 * Cada frase tiene que ser cierta EN EL MOMENTO en que se enseña. Medido en
	 * el navegador, este texto vive unos 11 s y las tres frases se ven, así que
	 * no vale describir el proceso entero en orden: la comprobación de cifras
	 * ocurre cuando el modelo YA terminó, y anunciarla a los siete segundos era
	 * narrar algo que todavía no pasaba. Pequeño, pero es una mentira, y este
	 * asistente es de un municipio.
	 *
	 * La tercera dice por qué se espera. Es verdad —el modelo corre en CPU
	 * municipal, no en una API ajena— y convierte la demora en la razón para
	 * fiarse en vez de en un fallo aparente.
	 */
	const FASES = [
		'Leyendo la ficha oficial…',
		'Redactando la respuesta…',
		'Tarda un poco: el modelo corre en el municipio…'
	];

	let fase = $state(0);

	// Avanza sólo mientras hay algún turno redactando; sin intervalos vivos
	// cuando la pantalla está quieta.
	$effect(() => {
		if (!turnos.some((t) => t.estado === 'redactando')) {
			fase = 0;
			return;
		}

		const reloj = setInterval(() => {
			// Se queda en la última: al llegar a "contrastando" ya no tiene
			// sentido volver a "leyendo".
			fase = Math.min(fase + 1, FASES.length - 1);
		}, 3400);

		return () => clearInterval(reloj);
	});

	let turnos = $state<Turno[]>([]);
	let borrador = $state('');
	let ocupado = $state(false);
	let conversacion: string | null = null;
	let hilo: HTMLElement;
	let campo: HTMLTextAreaElement;

	/**
	 * La página entera entra con un asentamiento leve, no un corte seco: al
	 * llegar aquí desde la cabecera o desde el CTA de la portada, el sitio
	 * entero se sustituye por esta pantalla completa (ver +layout.svelte),
	 * así que sin transición el cambio se sentía como un parpadeo.
	 */
	let reducido = $state(false);
	$effect(() => {
		reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	});
	const duracionApertura = $derived(reducido ? 0 : 340);

	const vacio = $derived(turnos.length === 0);

	/** Sin backend no hay asistente: no tiene respaldo estático, necesita el modelo. */
	const disponible = API_BASE !== '';

	async function alFondo() {
		await tick();
		hilo?.scrollTo({ top: hilo.scrollHeight, behavior: 'smooth' });
	}

	function ajustarAlto() {
		if (!campo) return;
		campo.style.height = 'auto';
		campo.style.height = `${Math.min(campo.scrollHeight, 200)}px`;
	}

	async function asegurarConversacion(): Promise<string> {
		if (conversacion) return conversacion;

		// sessionStorage y no cookie: el hilo muere con la pestaña y no deja
		// rastro identificable. El backend tampoco guarda IP ni cabeceras.
		const guardado = sessionStorage.getItem(CLAVE_SESION);
		if (guardado) return (conversacion = guardado);

		const res = await fetch(`${API_BASE}/v1/asistente/conversaciones`, { method: 'POST' });
		if (!res.ok) throw new Error('No se pudo abrir la conversación.');

		const { data } = await res.json();
		sessionStorage.setItem(CLAVE_SESION, data.conversacion);
		return (conversacion = data.conversacion);
	}

	async function enviar(texto: string) {
		const limpio = texto.trim();
		if (limpio.length < 2 || ocupado || !disponible) return;

		borrador = '';
		ajustarAlto();
		ocupado = true;

		turnos.push({ id: idTurno(), rol: 'ciudadano', texto: limpio, estado: 'listo' });
		turnos.push({ id: idTurno(), rol: 'asistente', texto: '', estado: 'pensando' });

		// OJO: hay que recuperar la referencia YA dentro del array. `$state`
		// envuelve en un proxy lo que se le mete, y el objeto que acabamos de
		// construir NO es ese proxy: mutarlo no dispara nada y el chat se
		// queda en "Buscando…" para siempre aunque el flujo llegue entero.
		const turno = turnos[turnos.length - 1];
		alFondo();

		try {
			const uuid = await asegurarConversacion();
			const res = await fetch(`${API_BASE}/v1/asistente/conversaciones/${uuid}/flujo`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ mensaje: limpio })
			});

			if (!res.ok || !res.body) throw new Error('El asistente no respondió.');

			await leerFlujo(res.body, turno);
		} catch (e) {
			turno.estado = 'error';
			turno.error = e instanceof Error ? e.message : 'No se pudo consultar el asistente.';
		} finally {
			ocupado = false;
			alFondo();
			campo?.focus();
		}
	}

	/** Lee los eventos del servidor y los va volcando en el turno. */
	async function leerFlujo(cuerpo: ReadableStream<Uint8Array>, turno: Turno) {
		const lector = cuerpo.pipeThrough(new TextDecoderStream()).getReader();
		let resto = '';
		let evento = '';

		while (true) {
			const { done, value } = await lector.read();
			if (done) break;

			resto += value;
			const lineas = resto.split('\n');
			resto = lineas.pop() ?? '';

			for (const linea of lineas) {
				if (linea.startsWith('event: ')) {
					evento = linea.slice(7).trim();
					continue;
				}
				if (!linea.startsWith('data: ')) continue;

				const datos = JSON.parse(linea.slice(6));

				if (evento === 'ficha') {
					turno.respuesta = datos as Respuesta;
					turno.estado = datos.redactando ? 'redactando' : 'listo';
					alFondo();
				} else if (evento === 'trozo') {
					turno.escrito = (turno.escrito ?? '') + datos.t;
					alFondo();
				} else if (evento === 'fin') {
					// Si el control numérico descartó el texto, se borra lo que
					// se estaba viendo. Vale más un párrafo que desaparece que
					// un importe inventado que se queda.
					turno.escrito = datos.parrafo ?? undefined;
					turno.mensajeId = datos.mensaje_id;
					turno.estado = 'listo';
				} else if (evento === 'error') {
					turno.estado = 'error';
					turno.error = datos.mensaje;
				}
			}
		}
	}

	async function valorar(turno: Turno, util: boolean) {
		if (!turno.mensajeId) return;
		turno.util = util;

		await fetch(`${API_BASE}/v1/asistente/mensajes/${turno.mensajeId}/retroalimentacion`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ util })
		}).catch(() => {});
	}

	function nueva() {
		sessionStorage.removeItem(CLAVE_SESION);
		conversacion = null;
		turnos = [];
		borrador = '';
		campo?.focus();
	}

	// afterNavigate y no onMount: en una carga directa de la página onMount se
	// ejecuta ANTES de que el router de SvelteKit esté listo, y replaceState
	// revienta con "Cannot call replaceState before router is initialized".
	afterNavigate(() => {
		// Lo escrito en la portada llega por la URL y se envía solo: quien ya
		// formuló su pregunta no debería tener que repetirla al cambiar de
		// página. El parámetro se limpia después, para que recargar no vuelva a
		// enviarla sobre una conversación que ya la tiene.
		const q = page.url.searchParams.get('q');
		if (!q || !disponible || turnos.length > 0) return;

		enviar(q);

		// La URL se limpia en el siguiente ciclo, no ahora: en la hidratación
		// inicial replaceState() se ejecuta dentro del `initialize` del router
		// y falla con "Cannot call replaceState before router is initialized".
		// Esperar a que la pila se vacíe es suficiente y evita tocar el
		// history nativo por detrás de SvelteKit.
		setTimeout(() => {
			const u = new URL(page.url);
			u.searchParams.delete('q');
			replaceState(u, page.state);
		}, 0);
	});

	function alTeclear(e: KeyboardEvent) {
		// Enter envía, Mayús+Enter hace salto de línea: es lo que espera
		// cualquiera que haya usado un chat.
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			enviar(borrador);
		}
	}
</script>

<!--
	Se indexa, al contrario que antes.
	El asistente pasó a ser la acción primaria de la portada y de la
	cabecera: es la puerta de entrada al sitio, no un experimento escondido.
	Marcarlo `noindex` significaba que quien busca "asistente municipio El
	Coca" no lo encontraba nunca. Lo que sigue fuera del rastreo es
	`/api/asistente`, el endpoint que gasta CPU en cada petición — eso lo
	bloquea robots.txt.
-->
<Seo
	titulo="Asistente ciudadano"
	descripcion="Pregunte con sus palabras y el asistente municipal le muestra la ficha oficial del trámite: requisitos, costo y a dónde acudir."
	imagen="/img/og/asistente.jpg"
/>

<div
	class="flex h-[100dvh] flex-col bg-[var(--superficie)]"
	transition:fly={{ y: 18, duration: duracionApertura, easing: cubicOut }}
>
	<!-- ══ Cabecera propia: mínima, pero sin perder de vista dónde se está ══ -->
	<header
		class="flex shrink-0 items-center gap-3 border-b border-[var(--borde)] px-4 py-3 md:px-6"
	>
		<a
			href="/"
			class="flex min-h-11 shrink-0 items-center gap-2 rounded px-2 text-sm font-medium whitespace-nowrap text-[var(--texto-suave)] transition hover:text-[var(--texto)] focus-visible:ring-2 focus-visible:ring-selva-600 focus-visible:outline-none"
		>
			<svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
				<path d="M19 12H5M12 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
			<!-- En móvil sólo la flecha: el texto envolvía a dos líneas y le
			     robaba altura al hilo, que es lo que hay que leer. -->
			<span class="hidden sm:inline">Volver al sitio</span>
			<span class="sr-only sm:hidden">Volver al sitio</span>
		</a>

		<div class="mx-auto flex items-center gap-2">
			<Jaguar tamano="sm" />
			<span class="font-semibold">Asistente</span>
		</div>

		<button
			type="button"
			onclick={nueva}
			disabled={vacio}
			class="min-h-11 shrink-0 rounded px-3 text-sm font-medium whitespace-nowrap text-[var(--texto-suave)] transition hover:text-[var(--texto)] disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-selva-600 focus-visible:outline-none"
		>
			<span class="hidden sm:inline">Nueva consulta</span>
			<span class="sm:hidden">Nueva</span>
		</button>
	</header>

	<!-- ══ Hilo ══ -->
	<div bind:this={hilo} class="flex-1 overflow-y-auto overscroll-contain">
		<div class="mx-auto w-full max-w-3xl px-4 py-6 md:px-6">
			{#if !disponible}
				<div class="rounded border border-achiote-600 bg-achiote-100 p-5 text-achiote-texto">
					<p class="font-semibold">El asistente no está disponible en este entorno.</p>
					<p class="mt-1 text-sm">
						Necesita conexión con el servicio municipal. Mientras tanto puede usar el
						<a href="/buscar" class="underline underline-offset-2">buscador</a>
						o escribir a la dirección de contacto.
					</p>
				</div>
			{:else if vacio}
				<!-- ══ Estado inicial ══ -->
				<div class="flex flex-col items-center py-10 text-center md:py-16">
					<Jaguar tamano="lg" />
					<h1 class="mt-5 text-[clamp(1.5rem,4vw,2rem)] font-semibold">
						¿Qué necesita hacer en el municipio?
					</h1>
					<p class="mt-2 max-w-md text-[var(--texto-suave)]">
						Escríbalo con sus palabras. Le muestro la ficha oficial del trámite, con sus
						requisitos y a dónde acudir.
					</p>

					<ul class="mt-8 grid w-full max-w-xl gap-2 sm:grid-cols-2">
						{#each EJEMPLOS as ejemplo (ejemplo)}
							<li>
								<button
									type="button"
									onclick={() => enviar(ejemplo)}
									class="w-full rounded border border-[var(--borde)] bg-[var(--superficie-elevada)] px-4 py-3 text-left text-sm transition hover:border-selva-600 hover:bg-selva-50 focus-visible:ring-2 focus-visible:ring-selva-600 focus-visible:outline-none"
								>
									{ejemplo}
								</button>
							</li>
						{/each}
					</ul>

					<p class="mt-8 max-w-md text-xs text-[var(--texto-suave)]">
						Las respuestas se arman copiando la ficha oficial del municipio. El texto que
						la acompaña lo redacta un modelo que corre en servidores municipales; si algo
						no coincide, lo que vale es la ficha.
					</p>
				</div>
			{:else}
				<!--
					══ Turnos ══
					`in:fly`, no `transition:`: los turnos nunca se sacan de la
					lista uno a uno (sólo se vacía entera con "Nueva consulta"), así
					que animar la salida no tiene contra qué dispararse. Más corto
					que el de la página (260 ms) porque esto pasa en cada mensaje,
					no una vez por visita.
				-->
				<ol class="space-y-6">
					{#each turnos as turno (turno.id)}
						<li in:fly={{ y: 10, duration: reducido ? 0 : 260, easing: cubicOut }}>
							{#if turno.rol === 'ciudadano'}
								<div class="flex justify-end">
									<p
										class="max-w-[85%] rounded-lg rounded-br-sm bg-selva-800 px-4 py-2.5 text-white"
									>
										{turno.texto}
									</p>
								</div>
							{:else}
								<div class="flex gap-3">
									<Jaguar
										tamano="md"
										pensando={turno.estado === 'pensando' || turno.estado === 'redactando'}
									/>

									<div class="min-w-0 flex-1">
										{#if turno.estado === 'error'}
											<p class="rounded border border-error/40 bg-error/5 px-4 py-3 text-error">
												{turno.error}
											</p>
										{:else}
											<!-- El texto redactado, según se va escribiendo. -->
											{#if turno.escrito}
												<p class="leading-relaxed whitespace-pre-wrap" aria-live="polite">
													{turno.escrito}<!--
													-->{#if turno.estado === 'redactando'}<span class="cursor" aria-hidden="true"></span>{/if}
												</p>
											{:else if turno.estado === 'pensando'}
												<p class="text-[var(--texto-suave)]" aria-live="polite">
													Buscando en el sitio municipal…
												</p>
											{:else if turno.estado === 'redactando'}
												<!--
													El texto visible va cambiando, pero al lector de pantalla
													se le anuncia UNA sola frase estable: si el aria-live
													siguiera al carrusel, interrumpiría cada tres segundos
													para decir lo mismo con otras palabras.
												-->
												{#key fase}
													<p class="fase text-[var(--texto-suave)]" aria-hidden="true">
														{FASES[fase]}
													</p>
												{/key}
												<p class="sr-only" aria-live="polite">Redactando la respuesta.</p>
											{/if}

											<!--
												La ficha se muestra cuando el asistente TERMINA de hablar,
												no cuando llega. Llega en 20 ms, pero enseñarla mientras el
												modelo todavía escribe convertía el chat en un volcado de
												datos con un párrafo pegado encima. Si no hay modelo
												generativo, `estado` pasa a "listo" de inmediato y la ficha
												sale al momento, como debe ser.
											-->
											{#if turno.respuesta && turno.estado === 'listo'}
												<FichaEnChat respuesta={turno.respuesta} conParrafo={!!turno.escrito} />

												{#if turno.mensajeId}
													<div class="mt-3 flex items-center gap-2 text-sm">
														{#if turno.util === undefined}
															<span class="text-[var(--texto-suave)]">¿Le sirvió?</span>
															<button
																type="button"
																onclick={() => valorar(turno, true)}
																class="min-h-11 rounded border border-[var(--borde)] px-3 transition hover:border-selva-600 hover:bg-selva-50 focus-visible:ring-2 focus-visible:ring-selva-600 focus-visible:outline-none"
															>Sí</button>
															<button
																type="button"
																onclick={() => valorar(turno, false)}
																class="min-h-11 rounded border border-[var(--borde)] px-3 transition hover:border-[var(--texto-suave)] focus-visible:ring-2 focus-visible:ring-selva-600 focus-visible:outline-none"
															>No</button>
														{:else}
															<span class="text-[var(--texto-suave)]">
																{turno.util
																	? 'Gracias, queda anotado.'
																	: 'Gracias. Se revisará qué le falta al sitio.'}
															</span>
														{/if}
													</div>
												{/if}
											{/if}
										{/if}
									</div>
								</div>
							{/if}
						</li>
					{/each}
				</ol>
			{/if}
		</div>
	</div>

	<!-- ══ Entrada ══ -->
	{#if disponible}
		<div class="shrink-0 border-t border-[var(--borde)] bg-[var(--superficie)] px-4 py-3 md:px-6">
			<form
				class="mx-auto flex w-full max-w-3xl items-end gap-2"
				onsubmit={(e) => {
					e.preventDefault();
					enviar(borrador);
				}}
			>
				<label for="consulta" class="sr-only">Escriba su consulta</label>
				<textarea
					id="consulta"
					bind:this={campo}
					bind:value={borrador}
					oninput={ajustarAlto}
					onkeydown={alTeclear}
					rows="1"
					maxlength="500"
					placeholder="Escriba su consulta…"
					disabled={ocupado}
					class="max-h-[200px] min-h-11 flex-1 resize-none rounded-lg border border-[var(--borde)] bg-[var(--superficie-elevada)] px-4 py-3 leading-relaxed focus:border-selva-800 focus:ring-2 focus:ring-selva-600/25 focus:outline-none disabled:opacity-60"
				></textarea>

				<button
					type="submit"
					disabled={ocupado || borrador.trim().length < 2}
					aria-label="Enviar consulta"
					class="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-selva-800 text-white transition hover:bg-selva-900 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-selva-600 focus-visible:ring-offset-2 focus-visible:outline-none"
				>
					{#if ocupado}
						<span class="girando h-4 w-4 rounded-full border-2 border-white/30 border-t-white"></span>
					{:else}
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
							<path d="M12 19V5M5 12l7-7 7 7" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					{/if}
				</button>
			</form>

			<p class="mx-auto mt-2 max-w-3xl text-center text-xs text-[var(--texto-suave)]">
				Lo que vale es la ficha oficial. Ante cualquier duda, acuda a la dirección responsable.
			</p>
		</div>
	{/if}
</div>

<style>
	/* Cada frase entra con un desvanecido corto: cambiar de golpe da un
	   respingo, y aquí lo que se quiere transmitir es calma. La `key` en el
	   marcado hace que Svelte reemplace el nodo y la animación vuelva a
	   correr. */
	.fase {
		animation: entrar-fase 400ms ease-out;
	}

	@keyframes entrar-fase {
		from {
			opacity: 0;
			transform: translateY(3px);
		}
	}

	/* Cursor de escritura mientras el modelo redacta. */
	.cursor {
		display: inline-block;
		width: 0.5ch;
		height: 1.1em;
		margin-left: 0.1ch;
		vertical-align: text-bottom;
		background: currentColor;
		animation: parpadeo 1s step-end infinite;
	}

	@keyframes parpadeo {
		50% {
			opacity: 0;
		}
	}

	.girando {
		animation: girar 0.7s linear infinite;
	}

	@keyframes girar {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.cursor,
		.girando,
		.fase {
			animation: none;
		}
	}
</style>
