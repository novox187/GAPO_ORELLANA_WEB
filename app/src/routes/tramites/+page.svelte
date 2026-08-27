<script lang="ts">
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { ETIQUETA_CATEGORIA, ETIQUETA_PERFIL } from '$lib/api';
	import HojaFiltros from '$lib/components/HojaFiltros.svelte';
	import Migas from '$lib/components/Migas.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let categoria = $state(page.url.searchParams.get('categoria') ?? '');
	let perfil = $state(page.url.searchParams.get('perfil') ?? '');
	let direccion = $state(page.url.searchParams.get('direccion') ?? '');
	let consulta = $state(page.url.searchParams.get('q') ?? '');
	let hojaAbierta = $state(false);

	function normalizar(s: string) {
		return (s ?? '')
			.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '');
	}

	const resultados = $derived.by(() => {
		const q = normalizar(consulta.trim());
		return data.tramites.filter((t) => {
			if (categoria && !t.categorias.includes(categoria)) return false;
			if (perfil && !t.perfiles.includes(perfil)) return false;
			if (direccion && t.direccion.slug !== direccion) return false;
			if (q && !normalizar(`${t.nombre} ${t.resumen}`).includes(q)) return false;
			return true;
		});
	});

	/**
	 * Cuántos trámites hay en cada categoría **con el resto de filtros ya
	 * puestos**. Sin esto, la hoja de filtros ofrece opciones que llevan a
	 * cero resultados y el visitante tiene que descubrirlo probando.
	 */
	function contarPor(clave: 'categorias' | 'perfiles', valor: string) {
		const q = normalizar(consulta.trim());
		return data.tramites.filter((t) => {
			if (!t[clave].includes(valor)) return false;
			if (clave !== 'categorias' && categoria && !t.categorias.includes(categoria)) return false;
			if (clave !== 'perfiles' && perfil && !t.perfiles.includes(perfil)) return false;
			if (direccion && t.direccion.slug !== direccion) return false;
			if (q && !normalizar(`${t.nombre} ${t.resumen}`).includes(q)) return false;
			return true;
		}).length;
	}

	const filtrosActivos = $derived.by(() => {
		const puestos: { clave: string; etiqueta: string }[] = [];
		if (categoria)
			puestos.push({ clave: 'categoria', etiqueta: ETIQUETA_CATEGORIA[categoria] ?? categoria });
		if (perfil) puestos.push({ clave: 'perfil', etiqueta: ETIQUETA_PERFIL[perfil] ?? perfil });
		if (direccion)
			puestos.push({
				clave: 'direccion',
				etiqueta: data.direcciones.find((d) => d.slug === direccion)?.nombre ?? direccion
			});
		return puestos;
	});

	const hayFiltros = $derived(filtrosActivos.length > 0 || consulta.trim() !== '');

	function quitar(clave: string) {
		if (clave === 'categoria') categoria = '';
		if (clave === 'perfil') perfil = '';
		if (clave === 'direccion') direccion = '';
	}

	function limpiar() {
		categoria = '';
		perfil = '';
		direccion = '';
		consulta = '';
	}

	// Refleja los filtros en la URL para que un enlace compartido reproduzca
	// la vista. La búsqueda escrita también, porque el buscador de la
	// portada llega justamente por aquí con ?q=.
	$effect(() => {
		const u = new URL(page.url);
		const set = (k: string, v: string) => (v ? u.searchParams.set(k, v) : u.searchParams.delete(k));
		set('categoria', categoria);
		set('perfil', perfil);
		set('direccion', direccion);
		set('q', consulta.trim());
		if (u.href !== page.url.href) replaceState(u, page.state);
	});

	/** Cada categoría lleva un color de la banda del logotipo, estable. */
	const COLOR_CATEGORIA: Record<string, string> = {
		'vivienda-y-construccion': 'var(--color-selva-800)',
		negocios: 'var(--color-achiote-500)',
		'vehiculos-y-transporte': 'var(--color-carbon-600)',
		'agua-y-ambiente': 'var(--color-selva-600)',
		'familia-y-bienestar': 'var(--color-selva-400)',
		turismo: 'var(--color-selva-500)',
		'documentos-y-certificados': 'var(--color-achiote-600)',
		'otros-tramites': 'var(--color-carbon-300)'
	};
</script>

<svelte:head>
	<title>Trámites municipales — Francisco de Orellana</title>
	<meta
		name="description"
		content="Los {data.tramites.length} trámites del Municipio de Francisco de Orellana, con requisitos, costos y formularios."
	/>
</svelte:head>

	{#snippet controles()}
		{#snippet grupo(
			titulo: string,
			valores: string[],
			etiquetas: Record<string, string>,
			clave: 'categorias' | 'perfiles',
			actual: string,
			set: (v: string) => void
		)}
			<fieldset class="border-0 p-0">
				<legend class="mb-3 text-[0.82rem] font-bold tracking-wide uppercase text-[var(--texto-suave)]">
					{titulo}
				</legend>
				<div class="flex flex-wrap gap-1.5">
					{#each valores as v (v)}
						{@const n = contarPor(clave, v)}
						{@const elegido = actual === v}
						<button
							type="button"
							aria-pressed={elegido}
							disabled={n === 0 && !elegido}
							onclick={() => set(elegido ? '' : v)}
							class="opcion inline-flex min-h-11 items-center gap-2 border-2 px-3.5 text-[0.85rem] font-semibold"
							class:elegida={elegido}
						>
							{etiquetas[v] ?? v}
							<span class="cuenta cifra-tabular text-[0.72rem] font-bold">{n}</span>
						</button>
					{/each}
				</div>
			</fieldset>
		{/snippet}

		<div class="flex flex-col gap-7">
			{@render grupo('Categoría', data.categorias, ETIQUETA_CATEGORIA, 'categorias', categoria, (v) => (categoria = v))}
			{@render grupo('Tu perfil', data.perfiles, ETIQUETA_PERFIL, 'perfiles', perfil, (v) => (perfil = v))}

			<div>
				<label
					for="filtro-direccion"
					class="mb-3 block text-[0.82rem] font-bold tracking-wide uppercase text-[var(--texto-suave)]"
				>
					Dirección responsable
				</label>
				<select
					id="filtro-direccion"
					bind:value={direccion}
					class="h-12 w-full border-2 border-[var(--borde)] bg-[var(--superficie-elevada)] px-3 text-[0.9rem]"
				>
					<option value="">Todas las direcciones</option>
					{#each data.direcciones as d (d.slug)}
						<option value={d.slug}>{d.nombre}</option>
					{/each}
				</select>
			</div>
		</div>
	{/snippet}

<div class="contenedor pt-8 pb-16 md:pt-12 md:pb-24">
	<Migas tramos={[{ texto: 'Inicio', href: '/' }, { texto: 'Trámites' }]} />

	<h1 class="display mt-5 max-w-3xl text-[clamp(1.9rem,5vw,3.4rem)]">Trámites municipales</h1>
	<p class="mt-3 max-w-xl leading-relaxed text-[var(--texto-suave)]">
		Busca por lo que necesitas hacer. No hace falta saber qué dirección lo atiende.
	</p>

	<div class="mt-8 grid gap-10 lg:mt-12 lg:grid-cols-[17rem_1fr] lg:gap-14">
		<!-- ══ Controles de filtro ══════════════════════════════════════ -->

		<!-- En escritorio los filtros caben al lado y no estorban a nadie. -->
		<aside class="hidden lg:sticky lg:top-28 lg:block lg:self-start">
			<h2 class="sr-only">Filtros</h2>
			{@render controles()}
			{#if hayFiltros}
				<button
					type="button"
					onclick={limpiar}
					class="mt-7 min-h-11 cursor-pointer text-sm font-bold text-[var(--enlace)] underline underline-offset-4"
				>
					Limpiar todo
				</button>
			{/if}
		</aside>

		<!-- ══ Buscador + resultados ════════════════════════════════════ -->
		<section class="min-w-0">
			<!--
				Barra pegajosa: en una lista de 60 trámites, el buscador y el
				acceso a los filtros tienen que seguir a mano a mitad del
				recorrido. `top` descuenta la cabecera, que también es pegajosa.
			-->
			<div class="barra sticky z-20 -mx-5 bg-[var(--superficie)] px-5 pt-1 pb-3 md:-mx-8 md:px-8">
				<div class="flex gap-2">
					<div class="relative min-w-0 flex-1">
						<label for="buscar-tramite" class="sr-only">Buscar un trámite por nombre</label>
						<svg
							width="17"
							height="17"
							viewBox="0 0 24 24"
							fill="none"
							aria-hidden="true"
							class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--texto-suave)]"
						>
							<circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2.2" />
							<path d="m20 20-3.6-3.6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
						</svg>
						<input
							id="buscar-tramite"
							type="search"
							bind:value={consulta}
							placeholder="patente, agua, predio…"
							class="h-12 w-full border-2 border-[var(--borde)] bg-[var(--superficie-elevada)] pr-3 pl-10 text-base focus:border-[var(--marca)] focus:outline-none"
						/>
					</div>

					<button
						type="button"
						onclick={() => (hojaAbierta = true)}
						aria-expanded={hojaAbierta}
						aria-controls="hoja-filtros"
						aria-haspopup="dialog"
						class="inline-flex h-12 shrink-0 cursor-pointer items-center gap-2 border-2 border-[var(--borde)] px-4 text-[0.88rem] font-bold lg:hidden"
					>
						<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
							<path
								d="M4 6h16M7 12h10M10 18h4"
								stroke="currentColor"
								stroke-width="2.2"
								stroke-linecap="round"
							/>
						</svg>
						Filtros
						{#if filtrosActivos.length}
							<span
								class="inline-flex h-5 min-w-5 items-center justify-center bg-[var(--color-achiote-500)] px-1 text-[0.7rem] font-bold text-[var(--color-carbon-900)]"
							>
								{filtrosActivos.length}
							</span>
						{/if}
					</button>
				</div>

				<!-- Filtros puestos, cada uno con su propia salida. -->
				{#if filtrosActivos.length}
					<ul class="mt-2 flex flex-wrap gap-1.5">
						{#each filtrosActivos as f (f.clave)}
							<li>
								<button
									type="button"
									onclick={() => quitar(f.clave)}
									class="inline-flex min-h-9 items-center gap-1.5 border border-[var(--marca)] bg-[var(--superficie-elevada)] py-1 pr-2 pl-3 text-[0.8rem] font-semibold"
								>
									{f.etiqueta}
									<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
										<path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" />
									</svg>
									<span class="sr-only">Quitar filtro</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<p class="mt-4 mb-3 text-sm font-semibold text-[var(--texto-suave)]" role="status" aria-live="polite">
				{resultados.length}
				{resultados.length === 1 ? 'trámite' : 'trámites'}
			</p>

			{#if resultados.length === 0}
				<div class="border-2 border-dashed border-[var(--borde)] px-6 py-14 text-center">
					<p class="display text-[1.15rem]">No hay trámites con esos filtros.</p>
					<p class="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[var(--texto-suave)]">
						Prueba quitando alguno, o escribe otra palabra en el buscador.
					</p>
					<button
						type="button"
						onclick={limpiar}
						class="mt-6 inline-flex min-h-12 cursor-pointer items-center bg-[var(--color-achiote-500)] px-6 text-[0.9rem] font-bold text-[var(--color-carbon-900)]"
					>
						Limpiar filtros
					</button>
				</div>
			{:else}
				<ul class="flex flex-col gap-1.5">
					{#each resultados as t (t.slug)}
						<!--
							Con un filtro de categoría puesto se muestra esa, no la
							primera de la lista: al filtrar por "Negocios" y ver
							"Agua y ambiente" en cada tarjeta parece que el filtro
							no funcionó. Un trámite puede estar en varias.
						-->
						{@const cat = categoria && t.categorias.includes(categoria) ? categoria : t.categorias[0]}
						<li>
							<a
								href="/tramites/{t.slug}"
								class="tarjeta group relative flex flex-col gap-1 border border-[var(--borde)] bg-[var(--superficie-elevada)] py-4 pr-4 pl-5 no-underline sm:pl-6"
								style="--color-cat: {COLOR_CATEGORIA[cat] ?? 'var(--color-carbon-300)'}"
							>
								<span class="canto" aria-hidden="true"></span>

								<span class="flex flex-wrap items-center gap-x-2.5 gap-y-1">
									{#if cat}
										<span class="text-[0.68rem] font-bold tracking-[0.1em] text-[var(--texto-suave)] uppercase">
											{ETIQUETA_CATEGORIA[cat] ?? cat}
										</span>
									{/if}
									{#if t.requiere_revision_editorial}
										<span
											class="inline-flex items-center gap-1 border border-[var(--aviso-borde)] bg-[var(--aviso-fondo)] px-1.5 py-0.5 text-[0.66rem] font-bold text-[var(--aviso-tinta)]"
										>
											<svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
												<path d="M12 8v5m0 3.5v.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" />
												<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.2" />
											</svg>
											Por validar
										</span>
									{/if}
								</span>

								<span class="max-w-3xl text-[1.02rem] leading-snug font-bold text-[var(--texto)]">
									{t.nombre}
								</span>

								{#if t.resumen}
									<!-- max-w-2xl: en escritorio la tarjeta llega a 950 px y la
									     línea se iba a 130 caracteres, casi el doble de lo
									     legible. -->
									<span class="resumen max-w-2xl text-[0.86rem] leading-relaxed text-[var(--texto-suave)]">
										{t.resumen}
									</span>
								{/if}

								<span class="mt-1 text-[0.72rem] font-semibold text-[var(--texto-suave)]">
									{t.direccion.nombre}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>

<HojaFiltros
	abierta={hojaAbierta}
	resultados={resultados.length}
	activos={filtrosActivos.length}
	alCerrar={() => (hojaAbierta = false)}
	alLimpiar={limpiar}
>
	{@render controles()}
</HojaFiltros>

<style>
	.barra {
		/* Justo bajo la cabecera pegajosa — sin contar el filete, que se va
		   con el scroll y dejaría un hueco. */
		top: var(--alto-barra);
	}

	/* ── Opciones de filtro ──────────────────────────────────────────── */
	.opcion {
		border-color: var(--borde);
		background: var(--superficie-elevada);
		color: var(--texto);
		cursor: pointer;
		transition:
			border-color 0.18s ease-out,
			color 0.18s ease-out;
	}

	.opcion:hover:not(:disabled) {
		border-color: var(--marca);
	}

	/*
	   Seleccionado: achiote con tinta carbón (15.6:1). El verde de marca
	   con texto blanco sólo llega a 4.8:1 en claro y a 2.5:1 en oscuro,
	   así que no vale para los dos temas; el amarillo sí.
	*/
	.opcion.elegida {
		border-color: var(--color-achiote-500);
		background: var(--color-achiote-500);
		color: var(--color-carbon-900);
	}

	.opcion:disabled {
		opacity: 0.42;
		cursor: not-allowed;
	}

	/*
	   La cuenta es información, no adorno: dice cuántos trámites quedan si
	   se elige esa opción, así que tiene que llegar a 4.5:1. Se separa de la
	   etiqueta bajando el color un escalón, no con opacidad — al 60 % sobre
	   blanco se quedaba en 2.7:1.
	*/
	.cuenta {
		color: var(--texto-suave);
	}

	.opcion.elegida .cuenta {
		color: inherit;
		/* Sobre achiote la tinta ya es carbón: 15.6:1. */
	}

	/* ── Tarjeta de resultado ────────────────────────────────────────── */
	.canto {
		position: absolute;
		inset-block: 0;
		left: 0;
		width: 4px;
		background: var(--color-cat);
		transition: width 0.2s var(--ease-cine);
	}

	.tarjeta {
		transition: border-color 0.18s ease-out;
	}

	.tarjeta:hover,
	.tarjeta:focus-visible {
		border-color: var(--marca);
	}

	.tarjeta:hover .canto,
	.tarjeta:focus-visible .canto {
		width: 7px;
	}

	/*
	   Recorte real a dos líneas. En la versión anterior el `line-clamp-2` de
	   Tailwind venía seguido de `block`, que pisa el `display:-webkit-box`
	   que el recorte necesita: los resúmenes salían de cuatro y cinco
	   líneas y la lista era un muro de texto.
	*/
	.resumen {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		overflow: hidden;
	}

	@media (prefers-reduced-motion: reduce) {
		.opcion,
		.tarjeta,
		.canto {
			transition: none;
		}
		.tarjeta:hover .canto,
		.tarjeta:focus-visible .canto {
			width: 4px;
		}
	}
</style>
