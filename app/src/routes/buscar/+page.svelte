<script lang="ts">
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import Migas from '$lib/components/Migas.svelte';
	import { buscar, type DocumentoIndice } from '$lib/api';
	import { CANTON, TRANSPARENCIA } from '$lib/secciones';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let consulta = $state(page.url.searchParams.get('q') ?? '');
	let tipo = $state<'todo' | 'tramite' | 'noticia' | 'pagina'>('todo');

	const ETIQUETA_TIPO: Record<string, string> = {
		tramite: 'Trámite',
		noticia: 'Noticia',
		pagina: 'Página'
	};

	/**
	 * El índice guarda rutas del modelo de datos (/tramites/x, /noticias/x,
	 * /institucional/x). Aquí se traducen a las rutas públicas reales: las
	 * páginas institucionales y de turismo viven bajo /canton, y las de
	 * transparencia bajo /transparencia.
	 */
	function rutaPublica(d: DocumentoIndice): string {
		if (d.url.startsWith('/tramites/') || d.url.startsWith('/noticias/')) return d.url;

		const slug = d.url.split('/').pop() ?? '';
		if (TRANSPARENCIA.some((e) => e.slug === slug)) return `/transparencia/${slug}`;
		if (CANTON.some((e) => e.slug === slug)) return `/canton/${slug}`;
		return '/canton';
	}

	const resultados = $derived.by(() => {
		const base = buscar(data.documentos, consulta);
		return tipo === 'todo' ? base : base.filter((d) => d.tipo === tipo);
	});

	const conteos = $derived.by(() => {
		const base = buscar(data.documentos, consulta);
		return {
			todo: base.length,
			tramite: base.filter((d) => d.tipo === 'tramite').length,
			noticia: base.filter((d) => d.tipo === 'noticia').length,
			pagina: base.filter((d) => d.tipo === 'pagina').length
		};
	});

	// Mantiene la consulta en la URL para que un enlace compartido reproduzca la búsqueda.
	$effect(() => {
		const u = new URL(page.url);
		if (consulta) u.searchParams.set('q', consulta);
		else u.searchParams.delete('q');
		if (u.href !== page.url.href) replaceState(u, page.state);
	});

	/** Recorta el texto alrededor de la primera coincidencia, para dar contexto. */
	function extracto(d: DocumentoIndice): string {
		const t = d.texto ?? '';
		const primer = consulta.trim().split(/\s+/)[0] ?? '';
		if (!primer) return t.slice(0, 170);
		const i = t
			.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.indexOf(
				primer
					.toLowerCase()
					.normalize('NFD')
					.replace(/[̀-ͯ]/g, '')
			);
		if (i < 0) return t.slice(0, 170);
		const desde = Math.max(0, i - 60);
		return (desde > 0 ? '…' : '') + t.slice(desde, desde + 190);
	}
</script>

<svelte:head>
	<title>Buscar — Alcaldía de Francisco de Orellana</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="contenedor py-10 md:py-14">
	<Migas tramos={[{ texto: 'Inicio', href: '/' }, { texto: 'Buscar' }]} />

	<h1 class="display text-[clamp(1.9rem,4.4vw,3rem)]">Buscar</h1>
	<p class="mt-3 max-w-2xl leading-relaxed text-[var(--texto-suave)]">
		Busca entre {data.documentos.length} trámites, noticias y páginas del municipio.
	</p>

	<form class="mt-8 flex max-w-2xl gap-1.5" onsubmit={(e) => e.preventDefault()} role="search">
		<label class="sr-only" for="q">Buscar en el sitio</label>
		<!-- svelte-ignore a11y_autofocus -->
		<input
			id="q"
			type="search"
			bind:value={consulta}
			autofocus
			placeholder="patente, agua potable, ordenanza…"
			class="h-12 w-full border border-[var(--borde)] bg-[var(--superficie-elevada)] px-4 text-[1rem] placeholder:text-[var(--texto-suave)]/70"
		/>
	</form>

	{#if consulta.trim().length > 1}
		<div class="mt-6 flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por tipo">
			{#each [['todo', 'Todo'], ['tramite', 'Trámites'], ['noticia', 'Noticias'], ['pagina', 'Páginas']] as [valor, texto] (valor)}
				<button
					type="button"
					aria-pressed={tipo === valor}
					onclick={() => (tipo = valor as typeof tipo)}
					class="inline-flex min-h-9 items-center gap-2 border px-3.5 text-[0.82rem] font-semibold transition-colors
					{tipo === valor
						? 'border-[var(--color-selva-800)] bg-[var(--color-selva-800)] text-white'
						: 'border-[var(--borde)] text-[var(--texto-suave)] hover:border-[var(--marca)]'}"
				>
					<span>{texto}</span>
					<span class="opacity-70">{conteos[valor as keyof typeof conteos]}</span>
				</button>
			{/each}
		</div>

		<p class="mt-6 text-sm text-[var(--texto-suave)]" role="status" aria-live="polite">
			{resultados.length}
			{resultados.length === 1 ? 'resultado' : 'resultados'} para «{consulta}»
		</p>

		{#if resultados.length === 0}
			<div class="mt-6 border border-dashed border-[var(--borde)] p-12 text-center">
				<p class="font-semibold">No encontramos nada para «{consulta}».</p>
				<p class="mt-2 text-sm text-[var(--texto-suave)]">
					Prueba con una palabra más general, o revisa
					<a href="/tramites" class="font-semibold text-[var(--enlace)] underline">todos los trámites</a>.
				</p>
			</div>
		{:else}
			<ul class="mt-4 divide-y divide-[var(--borde)] border-t border-[var(--borde)]">
				{#each resultados as r (r.id)}
					<li>
						<a href={rutaPublica(r)} class="group block py-5 no-underline">
							<span
								class="text-[0.68rem] font-bold tracking-[0.14em] text-[var(--texto-suave)] uppercase"
							>
								{ETIQUETA_TIPO[r.tipo] ?? r.tipo}
							</span>
							<h2
								class="mt-1.5 leading-snug font-bold text-[var(--texto)] group-hover:text-[var(--color-selva-800)]"
							>
								{r.titulo}
							</h2>
							<p class="mt-1.5 max-w-3xl text-sm leading-relaxed text-[var(--texto-suave)]">
								{extracto(r)}…
							</p>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	{:else if consulta.trim().length === 1}
		<p class="mt-6 text-sm text-[var(--texto-suave)]">Escribe al menos dos caracteres.</p>
	{/if}
</div>
