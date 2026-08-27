<script lang="ts">
	import Migas from '$lib/components/Migas.svelte';
	import Pictograma from '$lib/components/Pictograma.svelte';
	import { revelar } from '$lib/acciones/revelar';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const territorio = $derived(data.entradas.filter((e) => e.grupo === 'territorio'));
	const visitar = $derived(data.entradas.filter((e) => e.grupo === 'visitar'));
</script>

<svelte:head>
	<title>El cantón — Alcaldía de Francisco de Orellana</title>
	<meta
		name="description"
		content="Historia, símbolos, territorio y lugares por visitar del cantón Francisco de Orellana (El Coca)."
	/>
	<link rel="preload" as="image" href="/img/portada/mirador-anangu-960.webp" fetchpriority="high" />
</svelte:head>

<!-- ══ Cabecera fotográfica ══════════════════════════════════════════ -->
<header class="portada">
	<img
		src="/img/portada/mirador-anangu.webp"
		srcset="/img/portada/mirador-anangu-960.webp 960w, /img/portada/mirador-anangu.webp 1920w"
		sizes="100vw"
		alt=""
		width="1920"
		height="905"
		class="foto"
		fetchpriority="high"
	/>
	<div class="velo" aria-hidden="true"></div>

	<div class="contenedor relative pt-6 pb-10 md:pt-8 md:pb-16">
		<Migas tramos={[{ texto: 'Inicio', href: '/' }, { texto: 'El cantón' }]} />

		<p class="flex items-center gap-2.5 text-[0.68rem] font-bold tracking-[0.22em] text-[var(--color-achiote-400)] uppercase">
			<span class="h-px w-7 bg-[var(--color-achiote-400)]"></span>
			Francisco de Orellana
		</p>

		<h1 class="titular-cartel mt-4 max-w-3xl text-[clamp(2.1rem,6.5vw,4.4rem)] text-white">
			El cantón
		</h1>
		<p class="mt-4 max-w-lg leading-relaxed text-white/85 md:text-[1.06rem]">
			Siete mil kilómetros cuadrados entre tres ríos: cómo se gobierna, de dónde viene y qué hay
			que ver.
		</p>

		<!--
			Las cifras que anclan la sección. Son las mismas de la portada y
			salen de /datos_canton/ (VII Censo); repetirlas aquí evita que
			quien entra directo a esta página tenga que ir a buscarlas.
		-->
		<dl class="mt-8 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/20 pt-5 md:gap-x-12">
			{#each [{ v: '72.795', e: 'habitantes' }, { v: '7.047', e: 'km²' }, { v: '12', e: 'parroquias' }, { v: '1969', e: 'cantonización' }] as c (c.e)}
				<!--
					dt visible + dd: un <span> suelto no está permitido como hijo
					del grupo de un <dl>, y con `order` la cifra sigue yendo
					arriba sin romper la estructura.
				-->
				<div class="flex min-w-0 flex-col">
					<dt class="order-2 mt-1 text-[0.66rem] font-semibold tracking-wide text-white/60 uppercase">
						{c.e}
					</dt>
					<dd class="display cifra-tabular order-1 text-[1.5rem] leading-none text-white md:text-[1.9rem]">
						{c.v}
					</dd>
				</div>
			{/each}
		</dl>
	</div>
</header>

<!-- ══ Territorio y gobierno ═════════════════════════════════════════ -->
<section class="contenedor py-12 md:py-16" aria-labelledby="titulo-territorio">
	<div class="mb-6 flex flex-wrap items-end justify-between gap-3">
		<h2 id="titulo-territorio" class="display text-[clamp(1.5rem,3.4vw,2.2rem)]">
			Territorio y gobierno
		</h2>
		<p class="max-w-sm text-[0.86rem] leading-relaxed text-[var(--texto-suave)]">
			Los datos del cantón, su historia y quién lo dirige.
		</p>
	</div>

	<ul class="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
		{#each territorio as e, i (e.slug)}
			<li>
				<a
					href="/canton/{e.slug}"
					use:revelar={{ retraso: i * 60 }}
					class="tarjeta revelable tesela-diagonal group flex h-full min-h-[11rem] flex-col justify-between gap-8 p-6 no-underline {e.fondo} {e.tinta}"
				>
					<Pictograma
						nombre={e.picto}
						clase="tarjeta-picto pointer-events-none absolute -right-6 -bottom-8 h-[10rem] w-auto opacity-[0.15]"
					/>
					<Pictograma nombre={e.picto} clase="relative h-9 w-auto opacity-95" />
					<div class="relative">
						<h3 class="display text-[1.1rem] leading-snug">{e.titulo}</h3>
						<p class="mt-1.5 text-[0.85rem] leading-relaxed opacity-85">{e.descripcion}</p>
					</div>
				</a>
			</li>
		{/each}
	</ul>
</section>

<!-- ══ Qué visitar ═══════════════════════════════════════════════════ -->
<section class="banda-visitar" aria-labelledby="titulo-visitar">
	<div class="contenedor py-12 md:py-16">
		<div class="mb-6 flex flex-wrap items-end justify-between gap-3">
			<h2 id="titulo-visitar" class="display text-[clamp(1.5rem,3.4vw,2.2rem)] text-white">
				Qué visitar
			</h2>
			<p class="max-w-sm text-[0.86rem] leading-relaxed text-white/65">
				Lagunas, comunidades kichwa y la puerta al Parque Nacional Yasuní.
			</p>
		</div>

		<ul class="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
			{#each visitar as e, i (e.slug)}
				<li>
					<a
						href="/canton/{e.slug}"
						use:revelar={{ retraso: i * 70 }}
						class="visita revelable group relative flex min-h-[14rem] flex-col justify-end overflow-hidden p-5 no-underline md:min-h-[17rem]"
					>
						{#if e.imagen}
							<img src={e.imagen} alt="" class="visita-foto" loading="lazy" decoding="async" />
						{/if}
						<span class="visita-velo" aria-hidden="true"></span>
						<span class="relative">
							<Pictograma nombre={e.picto} clase="mb-3 h-8 w-auto text-white/80" />
							<span class="display block text-[1.08rem] leading-snug text-white">{e.titulo}</span>
							<span class="mt-1.5 block text-[0.82rem] leading-relaxed text-white/70">
								{e.descripcion}
							</span>
						</span>
					</a>
				</li>
			{/each}
		</ul>
	</div>
</section>

<style>
	/* ── Cabecera ────────────────────────────────────────────────────── */
	.portada {
		position: relative;
		isolation: isolate;
		overflow: hidden;
		background: #0a1410;
	}

	.foto {
		position: absolute;
		inset: 0;
		z-index: -1;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: 50% 42%;
	}

	.velo {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background:
			linear-gradient(
				to top,
				rgb(6 14 10 / 0.92) 0%,
				rgb(6 14 10 / 0.72) 48%,
				rgb(6 14 10 / 0.3) 100%
			),
			linear-gradient(100deg, rgb(6 14 10 / 0.7) 0%, rgb(6 14 10 / 0.3) 58%, transparent 100%);
	}

	.portada :global(nav a),
	.portada :global(nav span) {
		color: rgb(255 255 255 / 0.85);
	}
	.portada :global(nav [aria-current='page']) {
		color: #ffffff;
	}

	/* ── Teselas institucionales ─────────────────────────────────────── */
	.tarjeta {
		position: relative;
		transition: filter 0.2s ease-out;
	}

	.tarjeta:hover,
	.tarjeta:focus-visible {
		filter: brightness(1.08);
	}

	.tarjeta :global(.tarjeta-picto) {
		transition: transform 0.5s var(--ease-cine);
	}

	.tarjeta:hover :global(.tarjeta-picto),
	.tarjeta:focus-visible :global(.tarjeta-picto) {
		transform: scale(1.08) translate3d(-2%, -3%, 0);
	}

	/* ── Banda oscura de turismo ─────────────────────────────────────── */
	.banda-visitar {
		background: #16170f;
	}

	.visita {
		background: #1f2119;
	}

	.visita-foto {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: 50% 35%;
		transition: transform 0.6s var(--ease-cine);
	}

	.visita:hover .visita-foto,
	.visita:focus-visible .visita-foto {
		transform: scale(1.06);
	}

	/*
	   Velo sobre la foto de cada destino. Medido sobre la más clara (la del
	   mirador, con cielo abierto): el blanco del título se mantiene por
	   encima de 4.5:1 en toda la caja de texto.
	*/
	.visita-velo {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: linear-gradient(
			to top,
			rgb(6 14 10 / 0.94) 0%,
			rgb(6 14 10 / 0.82) 38%,
			rgb(6 14 10 / 0.45) 72%,
			rgb(6 14 10 / 0.25) 100%
		);
	}

	@media (prefers-reduced-motion: reduce) {
		.tarjeta,
		.tarjeta :global(.tarjeta-picto),
		.visita-foto {
			transition: none;
		}
		.tarjeta:hover :global(.tarjeta-picto),
		.tarjeta:focus-visible :global(.tarjeta-picto),
		.visita:hover .visita-foto,
		.visita:focus-visible .visita-foto {
			transform: none;
		}
	}
</style>
