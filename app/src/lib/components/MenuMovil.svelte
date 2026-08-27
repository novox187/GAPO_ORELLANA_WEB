<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { cubicOut, cubicIn } from 'svelte/easing';
	import Marca from './Marca.svelte';
	import Pictograma, { type NombrePictograma } from './Pictograma.svelte';

	/**
	 * Menú principal en móvil.
	 *
	 * Lo que había antes era una lista de texto que empujaba la página hacia
	 * abajo: sin jerarquía, sin estado activo, sin manera de cerrarla con el
	 * teclado y, en la portada, apartando de un empujón la fotografía a
	 * pantalla completa. Aquí es un panel modal que ocupa la pantalla
	 * entera, hereda el sistema de teselas del logotipo y trae el buscador
	 * dentro — que es a lo que viene la mayoría de quien abre un menú
	 * municipal desde el teléfono.
	 */
	interface EnlaceMenu {
		href: string;
		texto: string;
		descripcion: string;
		picto: NombrePictograma;
		/** Color de la tesela, tomado de la banda del logotipo. */
		tinte: string;
	}

	let {
		abierto,
		enlaces,
		rutaActual,
		alCerrar,
		/** Se devuelve el foco aquí al cerrar: el botón que abrió el panel. */
		devolverFocoA
	}: {
		abierto: boolean;
		enlaces: EnlaceMenu[];
		rutaActual: string;
		alCerrar: () => void;
		devolverFocoA?: HTMLElement | null;
	} = $props();

	const redes = [
		{ red: 'Facebook', url: 'https://www.facebook.com/MunicipiodeFranciscodeOrellana' },
		{ red: 'Instagram', url: 'https://www.instagram.com/gadmforellana' },
		{ red: 'YouTube', url: 'https://www.youtube.com/@GADFranciscodeOrellana' }
	];

	let panel = $state<HTMLElement | null>(null);
	let botonCerrar = $state<HTMLButtonElement | null>(null);
	let reducido = $state(false);

	/** Entrada 320 ms, salida 200 ms: cerrar tiene que sentirse inmediato. */
	const msEntrada = $derived(reducido ? 0 : 320);
	const msSalida = $derived(reducido ? 0 : 200);

	$effect(() => {
		reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	});

	/**
	 * Bloqueo del scroll de fondo. Se compensa el ancho de la barra de
	 * desplazamiento para que la página no dé un salto lateral al abrir —
	 * en móvil no suele haber barra visible, pero el panel también se ve si
	 * alguien estrecha la ventana en un escritorio.
	 */
	$effect(() => {
		if (!abierto) return;

		const anchoBarra = window.innerWidth - document.documentElement.clientWidth;
		const overflowPrevio = document.body.style.overflow;
		const paddingPrevio = document.body.style.paddingRight;

		document.body.style.overflow = 'hidden';
		if (anchoBarra > 0) document.body.style.paddingRight = `${anchoBarra}px`;

		return () => {
			document.body.style.overflow = overflowPrevio;
			document.body.style.paddingRight = paddingPrevio;
		};
	});

	/**
	 * Al abrir, el foco entra en el panel; al cerrar, vuelve al botón que lo
	 * abrió, para que quien navega con teclado no acabe de vuelta al
	 * principio del documento.
	 *
	 * `estuvoAbierto` es un `let` normal a propósito, no `$state`: sirve
	 * para distinguir un cierre de verdad del estado inicial. Sin él, el
	 * efecto se ejecuta una vez al montar con `abierto = false` y le roba el
	 * foco al documento en cada carga de página — el visitante aterriza con
	 * el botón de menú enfocado sin haber tocado nada. Y como no es estado
	 * reactivo, escribirlo aquí dentro no vuelve a disparar el efecto.
	 */
	let estuvoAbierto = false;

	$effect(() => {
		if (abierto) {
			estuvoAbierto = true;
			botonCerrar?.focus();
		} else if (estuvoAbierto) {
			estuvoAbierto = false;
			devolverFocoA?.focus();
		}
	});

	/**
	 * Trampa de foco. Un diálogo modal no puede dejar que el tabulador se
	 * escape a la página de detrás: quien navega con teclado o con lector de
	 * pantalla se perdería en contenido que visualmente no existe.
	 */
	function alPulsarTecla(evento: KeyboardEvent) {
		if (evento.key === 'Escape') {
			evento.preventDefault();
			alCerrar();
			return;
		}

		if (evento.key !== 'Tab' || !panel) return;

		const focalizables = panel.querySelectorAll<HTMLElement>(
			'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
		);
		if (!focalizables.length) return;

		const primero = focalizables[0];
		const ultimo = focalizables[focalizables.length - 1];

		if (evento.shiftKey && document.activeElement === primero) {
			evento.preventDefault();
			ultimo.focus();
		} else if (!evento.shiftKey && document.activeElement === ultimo) {
			evento.preventDefault();
			primero.focus();
		}
	}
</script>

{#if abierto}
	<!--
		El velo no llega a verse (el panel cubre la pantalla entera), pero
		existe para el caso de una pantalla muy ancha en la que el panel se
		queda a 26rem, y para dar algo que tocar fuera del diálogo.
	-->
	<div
		class="velo lg:hidden"
		aria-hidden="true"
		onclick={alCerrar}
		transition:fade={{ duration: msSalida }}
	></div>

	<div
		bind:this={panel}
		id="menu-movil"
		class="panel lg:hidden"
		role="dialog"
		aria-modal="true"
		aria-label="Menú principal"
		tabindex="-1"
		onkeydown={alPulsarTecla}
		transition:fly={{ x: 340, duration: msEntrada, opacity: 1, easing: cubicOut }}
	>
		<!-- Filete de marca: el mismo canto de color que corona el sitio. -->
		<div class="flex h-1.5 shrink-0" aria-hidden="true">
			<span class="flex-[3] bg-[var(--color-selva-800)]"></span>
			<span class="flex-[2] bg-[var(--color-achiote-500)]"></span>
			<span class="flex-[1] bg-[var(--color-carbon-600)]"></span>
			<span class="flex-[2] bg-[var(--color-selva-600)]"></span>
			<span class="flex-[1] bg-[var(--color-achiote-400)]"></span>
			<span class="flex-[3] bg-[var(--color-selva-400)]"></span>
		</div>

		<!--
			Esta fila replica la altura de la cabecera para que el logotipo no
			se mueva ni un píxel al abrir, y el botón de cerrar cae justo
			donde estaba el de abrir: el panel se lee como una transformación
			de la barra, no como una capa que aterriza encima.
		-->
		<div class="flex h-[68px] shrink-0 items-center justify-between gap-4 px-5">
			<Marca invertido alto="h-10" />
			<button
				bind:this={botonCerrar}
				type="button"
				onclick={alCerrar}
				class="cerrar -mr-2.5 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center text-white"
			>
				<span class="sr-only">Cerrar menú</span>
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
				</svg>
			</button>
		</div>

		<div class="cuerpo flex-1 overflow-y-auto overscroll-contain px-5 pb-8">
			<!-- Buscador: la acción primaria, igual que en la portada. -->
			<form action="/buscar" method="GET" role="search" class="fila mt-1 flex gap-1.5" style="--retraso: 0ms">
				<label for="busqueda-menu" class="sr-only">
					Buscar trámites, noticias y documentos del municipio
				</label>
				<input
					id="busqueda-menu"
					name="q"
					type="search"
					autocomplete="off"
					placeholder="Buscar un trámite…"
					class="min-h-[52px] min-w-0 flex-1 border-2 border-white/20 bg-white/5 px-4 text-base text-white placeholder:text-white/50 focus:border-[var(--color-achiote-400)] focus:outline-none"
				/>
				<button
					type="submit"
					class="inline-flex h-[52px] w-[52px] shrink-0 cursor-pointer items-center justify-center bg-[var(--color-achiote-500)] text-[var(--color-carbon-900)]"
				>
					<span class="sr-only">Buscar</span>
					<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2.4" />
						<path d="m20 20-3.6-3.6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
					</svg>
				</button>
			</form>

			<nav aria-label="Principal">
				<ul class="mt-5 flex flex-col gap-1.5">
					{#each enlaces as e, i (e.href)}
						{@const activo = rutaActual === e.href || rutaActual.startsWith(`${e.href}/`)}
						<li class="fila" style="--retraso: {40 + i * 45}ms">
							<a
								href={e.href}
								onclick={alCerrar}
								aria-current={activo ? 'page' : undefined}
								class="entrada tesela-diagonal group relative flex min-h-[72px] items-center gap-4 overflow-hidden py-4 pr-4 pl-5 no-underline"
								class:activa={activo}
								style="--tinte: {e.tinte}"
							>
								<!-- Canto de color: la tesela del logotipo, reducida a su borde. -->
								<span class="canto" aria-hidden="true"></span>

								<Pictograma
									nombre={e.picto}
									clase="menu-picto h-11 w-11 shrink-0 text-white/70"
								/>

								<span class="min-w-0 flex-1">
									<span class="display block text-[1.18rem] text-white">{e.texto}</span>
									<span class="mt-0.5 block text-[0.8rem] leading-snug text-white/55">
										{e.descripcion}
									</span>
								</span>

								{#if activo}
									<span
										class="shrink-0 text-[0.62rem] font-bold tracking-[0.14em] text-[var(--color-achiote-400)] uppercase"
									>
										Aquí
									</span>
								{:else}
									<svg
										width="17"
										height="17"
										viewBox="0 0 24 24"
										fill="none"
										aria-hidden="true"
										class="flecha shrink-0 text-white/40"
									>
										<path
											d="M9 5.5 15.5 12 9 18.5"
											stroke="currentColor"
											stroke-width="2.4"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			</nav>

			<div class="fila mt-7" style="--retraso: {40 + enlaces.length * 45}ms">
				<a
					href="/contacto"
					onclick={alCerrar}
					class="flex min-h-[52px] items-center justify-center bg-[var(--color-achiote-400)] px-5 text-[0.95rem] font-bold text-[var(--color-carbon-900)] no-underline"
				>
					Atención ciudadana
				</a>

				<ul class="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/12 pt-5">
					{#each redes as r (r.red)}
						<li>
							<a
								href={r.url}
								target="_blank"
								rel="noopener"
								class="inline-flex min-h-11 items-center text-[0.82rem] text-white/55 no-underline hover:text-white"
							>
								{r.red}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</div>
{/if}

<style>
	.velo {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: rgb(6 12 8 / 0.6);
	}

	.panel {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		flex-direction: column;
		/*
		   Carbón del logotipo, el mismo tono de la banda de cifras de la
		   portada y del pie: el panel se ve idéntico en tema claro y oscuro,
		   a propósito. Un menú que cambia de color con el tema obliga a
		   mantener dos juegos de contraste para la misma superficie.
		*/
		background: #16170f;
		/* Aparta los controles del notch y de la barra de gestos. */
		padding-top: env(safe-area-inset-top);
		padding-bottom: env(safe-area-inset-bottom);
	}

	.cuerpo {
		/* Respiro extra bajo el último enlace en pantallas con barra de gestos. */
		padding-bottom: max(2rem, env(safe-area-inset-bottom));
	}

	/* ── Entradas escalonadas ─────────────────────────────────────────── */
	.fila {
		animation: emerger-menu 0.42s var(--ease-cine) both;
		animation-delay: var(--retraso, 0ms);
	}

	@keyframes emerger-menu {
		from {
			opacity: 0;
			transform: translate3d(18px, 0, 0);
		}
		to {
			opacity: 1;
			transform: translate3d(0, 0, 0);
		}
	}

	/* ── Entradas del menú ────────────────────────────────────────────── */
	.entrada {
		background: rgb(255 255 255 / 0.04);
		transition: background-color 0.2s ease-out;
	}

	.entrada:hover,
	.entrada:focus-visible {
		background: rgb(255 255 255 / 0.09);
	}

	/* Retroalimentación al tocar: sin desplazar la caja, para no mover la lista. */
	.entrada:active {
		background: rgb(255 255 255 / 0.14);
	}

	.canto {
		position: absolute;
		inset-block: 0;
		left: 0;
		width: 4px;
		background: var(--tinte);
		transition: width 0.22s var(--ease-cine);
	}

	.entrada:hover .canto,
	.entrada:focus-visible .canto {
		width: 7px;
	}

	.entrada.activa {
		background: rgb(255 255 255 / 0.1);
	}

	.entrada.activa .canto {
		width: 7px;
		background: var(--color-achiote-400);
	}

	.entrada :global(.menu-picto) {
		transition: color 0.2s ease-out;
	}

	.entrada:hover :global(.menu-picto),
	.entrada.activa :global(.menu-picto) {
		color: #ffffff;
	}

	.flecha {
		transition: transform 0.22s var(--ease-cine);
	}

	.entrada:hover .flecha,
	.entrada:focus-visible .flecha {
		transform: translateX(3px);
	}

	.cerrar {
		transition: transform 0.2s var(--ease-cine);
	}

	.cerrar:hover {
		transform: rotate(90deg);
	}

	@media (prefers-reduced-motion: reduce) {
		.fila {
			animation: none;
		}
		.canto,
		.flecha,
		.cerrar,
		.entrada,
		.entrada :global(.menu-picto) {
			transition: none;
		}
		.cerrar:hover,
		.entrada:hover .flecha,
		.entrada:focus-visible .flecha {
			transform: none;
		}
	}
</style>
