<script lang="ts">
	import Migas from './Migas.svelte';
	import Bloques from './Bloques.svelte';
	import GrupoRegistro from './GrupoRegistro.svelte';
	import { normalizarTexto, type Pagina } from '$lib/api';
	import type { EntradaSeccion } from '$lib/secciones';
	import {
		limpiarBloques,
		agruparBloques,
		resumenPagina,
		extraerAnios,
		indexarDocumentos,
		itemsDeGrupo,
		type GrupoBloques
	} from '$lib/bloques';

	/**
	 * Página de detalle de Transparencia. A diferencia de "El cantón", el
	 * aside ya no repite la lista completa de documentos — eso duplicaba lo
	 * que ya se ve organizado por año/categoría en el cuerpo (rendición de
	 * cuentas llegaba a listar sus 464 archivos dos veces). Cada apartado es
	 * un `GrupoRegistro` plegable; un buscador filtra documentos y fuerza
	 * abiertos los apartados con coincidencias.
	 */
	let {
		entrada,
		pagina,
		seccionTitulo,
		base,
		hermanas
	}: {
		entrada: EntradaSeccion;
		pagina: Pagina;
		seccionTitulo: string;
		base: string;
		hermanas: EntradaSeccion[];
	} = $props();

	const otras = $derived(hermanas.filter((h) => h.slug !== entrada.slug).slice(0, 6));

	const indice = $derived(indexarDocumentos(pagina.documentos));
	const bloquesLimpios = $derived(limpiarBloques(pagina.bloques));
	const agrupado = $derived(agruparBloques(bloquesLimpios));
	const resumen = $derived(resumenPagina(pagina));

	const introSinListas = $derived(agrupado.intro.filter((b) => b.tipo !== 'lista'));
	const introListas = $derived(agrupado.intro.filter((b) => b.tipo === 'lista'));
	// Con grupos reales, el intro se pinta completo (raro que traiga listas,
	// pero si las trae no hay dónde más mostrarlas). Sin grupos, las listas
	// del intro se separan para convertirse en el "grupo implícito" de abajo
	// — así nunca se listan los mismos documentos dos veces.
	const introVisible = $derived(agrupado.grupos.length > 0 ? agrupado.intro : introSinListas);

	const grupoImplicito = $derived.by((): GrupoBloques[] =>
		agrupado.grupos.length === 0 && introListas.length > 0
			? [{ titulo: 'Documentos publicados', nivel: 2, bloques: introListas }]
			: []
	);
	const grupos = $derived(agrupado.grupos.length > 0 ? agrupado.grupos : grupoImplicito);

	const totalEnlaces = $derived(grupos.reduce((n, g) => n + itemsDeGrupo(g, indice).length, 0));
	const tiposDisponibles = $derived(
		[...new Set(grupos.flatMap((g) => itemsDeGrupo(g, indice).map((it) => it.tipo)))].sort()
	);
	const rangoAnios = $derived(extraerAnios(grupos));
	// Pocos apartados o poco volumen: no vale la pena obligar a desplegar.
	// Si no, solo el primero (son los años más recientes, ya vienen así
	// ordenados en el origen).
	const abrirTodo = $derived(grupos.length <= 3 || totalEnlaces <= 15);

	let consulta = $state('');
	let tipoActivo = $state<string | null>(null);
	let abiertos = $state<boolean[]>([]);

	$effect(() => {
		abiertos = grupos.map((_, i) => abrirTodo || i === 0);
	});

	const consultaNormalizada = $derived(normalizarTexto(consulta.trim()));
	const busquedaActiva = $derived(consultaNormalizada !== '' || tipoActivo !== null);

	// Por grupo: null en modo navegación (se pintan los bloques originales);
	// un array (posiblemente vacío) en modo búsqueda. Si el título del grupo
	// ya coincide con el texto buscado, se listan todos sus documentos —
	// buscar "2023" en "Gestión 2023" no debería exigir que cada nombre de
	// archivo también contenga "2023".
	const coincidencias = $derived(
		grupos.map((g) => {
			if (!busquedaActiva) return null;
			const items = itemsDeGrupo(g, indice).filter((it) => !tipoActivo || it.tipo === tipoActivo);
			if (!consultaNormalizada) return items;
			if (normalizarTexto(g.titulo).includes(consultaNormalizada)) return items;
			return items.filter((it) => normalizarTexto(it.texto).includes(consultaNormalizada));
		})
	);

	const gruposVisibles = $derived(
		grupos
			.map((g, i) => ({ grupo: g, resultados: coincidencias[i], pos: i }))
			.filter(({ resultados }) => resultados === null || resultados.length > 0)
	);

	const sinResultados = $derived(
		busquedaActiva && grupos.length > 0 && gruposVisibles.length === 0
	);

	function limpiarBusqueda() {
		consulta = '';
		tipoActivo = null;
	}

	const paginaVacia = $derived(resumen.cantidad === 0 && introVisible.length === 0);
</script>

<svelte:head>
	<title>{entrada.titulo} — Alcaldía de Francisco de Orellana</title>
	<meta name="description" content={entrada.descripcion} />
</svelte:head>

<div class="contenedor py-10 md:py-14">
	<Migas
		tramos={[
			{ texto: 'Inicio', href: '/' },
			{ texto: seccionTitulo, href: base },
			{ texto: entrada.titulo }
		]}
	/>

	<div class="grid gap-12 lg:grid-cols-[1fr_17rem] lg:gap-16">
		<div class="min-w-0">
			<header class="mb-8">
				<h1 class="display text-[clamp(1.8rem,4vw,2.8rem)]">{entrada.titulo}</h1>
				<p class="mt-3 max-w-2xl leading-relaxed text-[var(--texto-suave)]">
					{entrada.descripcion}
				</p>
			</header>

			{#if introVisible.length}
				<Bloques bloques={introVisible} {indice} />
			{/if}

			{#if paginaVacia}
				<p
					class="border-l-4 border-[var(--color-achiote-500)] bg-[var(--superficie-alt)] p-5 leading-relaxed"
				>
					No hay publicaciones registradas en esta sección por ahora.
				</p>
			{/if}

			{#if grupos.length}
				<div class="mt-10 mb-6 flex flex-wrap items-center gap-3">
					<label class="relative min-w-[16rem] flex-1">
						<span class="sr-only">Buscar en {entrada.titulo}</span>
						<input
							type="search"
							bind:value={consulta}
							placeholder="Buscar documento…"
							class="min-h-11 w-full border border-[var(--borde)] bg-[var(--superficie)] px-4 text-sm outline-none focus-visible:border-[var(--marca)]"
						/>
					</label>
					{#if tiposDisponibles.length > 1}
						<div class="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por tipo de archivo">
							{#each tiposDisponibles as t (t)}
								<button
									type="button"
									onclick={() => (tipoActivo = tipoActivo === t ? null : t)}
									aria-pressed={tipoActivo === t}
									class="inline-flex min-h-11 cursor-pointer items-center border px-3.5 text-xs font-bold uppercase transition-colors {tipoActivo ===
									t
										? 'border-[var(--marca)] bg-[var(--marca)] text-white'
										: 'border-[var(--borde)] text-[var(--texto-suave)] hover:border-[var(--marca)]'}"
								>
									{t}
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<p class="sr-only" aria-live="polite">
					{#if busquedaActiva}
						{gruposVisibles.length} de {grupos.length} apartados con coincidencias
					{/if}
				</p>

				{#if sinResultados}
					<div class="border border-dashed border-[var(--borde)] p-8 text-center">
						<p class="text-[var(--texto-suave)]">Ningún documento coincide con la búsqueda.</p>
						<button
							type="button"
							onclick={limpiarBusqueda}
							class="mt-3 cursor-pointer text-sm font-bold text-[var(--enlace)] underline"
						>
							Limpiar búsqueda
						</button>
					</div>
				{:else}
					<div>
						{#each gruposVisibles as { grupo, resultados, pos } (pos)}
							<GrupoRegistro
								id="grupo-{pos}"
								titulo={grupo.titulo}
								bloques={grupo.bloques}
								{resultados}
								{indice}
								abierto={busquedaActiva ? true : (abiertos[pos] ?? (abrirTodo || pos === 0))}
								alCambiar={(v) => (abiertos[pos] = v)}
							/>
						{/each}
					</div>
				{/if}
			{/if}
		</div>

		<aside class="lg:sticky lg:top-24 lg:self-start">
			{#if resumen.cantidad > 0 || tiposDisponibles.length || rangoAnios}
				<h2 class="mb-3 text-sm font-bold">Datos rápidos</h2>
				<dl class="mb-8 space-y-2 text-sm">
					<div class="flex justify-between gap-4 border-b border-[var(--borde)] pb-2">
						<dt class="text-[var(--texto-suave)]">Publicaciones</dt>
						<dd class="cifra-tabular font-bold">
							{resumen.cantidad > 0 ? `${resumen.cantidad} ${resumen.etiqueta}` : resumen.etiqueta}
						</dd>
					</div>
					{#if tiposDisponibles.length}
						<div class="flex justify-between gap-4 border-b border-[var(--borde)] pb-2">
							<dt class="text-[var(--texto-suave)]">Formatos</dt>
							<dd class="font-bold">{tiposDisponibles.join(', ')}</dd>
						</div>
					{/if}
					{#if rangoAnios}
						<div class="flex justify-between gap-4 border-b border-[var(--borde)] pb-2">
							<dt class="text-[var(--texto-suave)]">Años cubiertos</dt>
							<dd class="cifra-tabular font-bold">{rangoAnios.min}–{rangoAnios.max}</dd>
						</div>
					{/if}
				</dl>
			{/if}

			{#if grupos.length >= 4}
				<h2 class="mb-3 text-sm font-bold">Contenido</h2>
				<ul class="mb-8 space-y-1.5">
					{#each grupos as g, i (i)}
						<li>
							<a
								href="#grupo-{i}"
								class="block border-b border-[var(--borde)] py-1.5 text-sm no-underline hover:text-[var(--color-selva-800)]"
							>
								{g.titulo}
							</a>
						</li>
					{/each}
				</ul>
			{/if}

			{#if otras.length}
				<h2 class="mb-3 text-sm font-bold">Más en {seccionTitulo}</h2>
				<ul class="space-y-px">
					{#each otras as o (o.slug)}
						<li>
							<a
								href="{base}/{o.slug}"
								class="block border-b border-[var(--borde)] py-2.5 text-sm no-underline hover:text-[var(--color-selva-800)]"
							>
								{o.titulo}
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</aside>
	</div>
</div>
