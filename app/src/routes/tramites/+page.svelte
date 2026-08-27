<script lang="ts">
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { ETIQUETA_CATEGORIA, ETIQUETA_PERFIL } from '$lib/api';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let categoria = $state(page.url.searchParams.get('categoria') ?? '');
	let perfil = $state(page.url.searchParams.get('perfil') ?? '');
	let direccion = $state(page.url.searchParams.get('direccion') ?? '');
	let consulta = $state('');

	function normalizar(s: string) {
		return s
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

	const hayFiltros = $derived(Boolean(categoria || perfil || direccion || consulta));

	// Refleja los filtros en la URL para que un enlace compartido reproduzca la vista.
	$effect(() => {
		const u = new URL(page.url);
		const set = (k: string, v: string) => (v ? u.searchParams.set(k, v) : u.searchParams.delete(k));
		set('categoria', categoria);
		set('perfil', perfil);
		set('direccion', direccion);
		if (u.href !== page.url.href) replaceState(u, page.state);
	});

	function limpiar() {
		categoria = '';
		perfil = '';
		direccion = '';
		consulta = '';
	}
</script>

<svelte:head>
	<title>Trámites municipales — Francisco de Orellana</title>
	<meta
		name="description"
		content="Los {data.tramites.length} trámites del Municipio de Francisco de Orellana, con requisitos, costos y formularios."
	/>
</svelte:head>

<div class="contenedor py-12 md:py-16">
	<nav aria-label="Ruta" class="mb-6 text-sm text-[var(--texto-suave)]">
		<a href="/" class="no-underline hover:underline">Inicio</a>
		<span class="mx-2 opacity-40">/</span>
		<span aria-current="page">Trámites</span>
	</nav>

	<h1 class="display max-w-3xl text-[clamp(2.2rem,5vw,3.5rem)]">Trámites municipales</h1>
	<p class="mt-4 max-w-xl leading-relaxed text-[var(--texto-suave)]">
		Filtra por lo que necesitas hacer o por quién eres. No hace falta saber qué dirección lo
		atiende.
	</p>

	<div class="mt-12 grid gap-10 lg:grid-cols-[16rem_1fr] lg:gap-14">
		<!-- Panel de filtros -->
		<aside class="lg:sticky lg:top-6 lg:self-start">
			<h2 class="sr-only">Filtros</h2>

			<label class="block">
				<span class="mb-2 block text-sm font-semibold">Buscar por nombre</span>
				<input
					type="search"
					bind:value={consulta}
					placeholder="patente, agua, predio…"
					class="h-11 w-full rounded-md border border-[var(--borde)] bg-[var(--superficie-elevada)] px-3 text-[0.95rem] placeholder:text-[var(--texto-suave)]/70"
				/>
			</label>

			{#snippet grupo(
				titulo: string,
				valores: string[],
				etiquetas: Record<string, string>,
				actual: string,
				set: (v: string) => void
			)}
				<fieldset class="mt-7 border-0 p-0">
					<legend class="mb-2.5 text-sm font-semibold">{titulo}</legend>
					<div class="flex flex-wrap gap-2">
						{#each valores as v (v)}
							<button
								type="button"
								aria-pressed={actual === v}
								onclick={() => set(actual === v ? '' : v)}
								class="inline-flex min-h-9 items-center rounded-full border px-3.5 text-[0.82rem] font-medium transition-colors
								{actual === v
									? 'border-[var(--acento)] bg-[var(--acento)] text-white'
									: 'border-[var(--borde)] bg-[var(--superficie-elevada)] text-[var(--texto-suave)] hover:border-[var(--acento)] hover:text-[var(--texto)]'}"
							>
								{etiquetas[v] ?? v}
							</button>
						{/each}
					</div>
				</fieldset>
			{/snippet}

			{@render grupo('Categoría', data.categorias, ETIQUETA_CATEGORIA, categoria, (v) => (categoria = v))}
			{@render grupo('Tu perfil', data.perfiles, ETIQUETA_PERFIL, perfil, (v) => (perfil = v))}

			<fieldset class="mt-7 border-0 p-0">
				<legend class="mb-2.5 text-sm font-semibold">Dirección responsable</legend>
				<select
					bind:value={direccion}
					class="h-11 w-full rounded-md border border-[var(--borde)] bg-[var(--superficie-elevada)] px-3 text-[0.9rem]"
				>
					<option value="">Todas las direcciones</option>
					{#each data.direcciones as d (d.slug)}
						<option value={d.slug}>{d.nombre}</option>
					{/each}
				</select>
			</fieldset>

			{#if hayFiltros}
				<button
					type="button"
					onclick={limpiar}
					class="mt-6 text-sm font-semibold text-[var(--acento)] underline underline-offset-4"
				>
					Limpiar filtros
				</button>
			{/if}
		</aside>

		<!-- Resultados -->
		<section>
			<p class="mb-5 text-sm text-[var(--texto-suave)]" role="status" aria-live="polite">
				{resultados.length}
				{resultados.length === 1 ? 'trámite' : 'trámites'}
			</p>

			{#if resultados.length === 0}
				<div class="rounded-xl border border-dashed border-[var(--borde)] p-12 text-center">
					<p class="font-semibold">No hay trámites con esos filtros.</p>
					<p class="mt-2 text-sm text-[var(--texto-suave)]">
						Prueba quitando alguno o busca con otra palabra.
					</p>
					<button
						type="button"
						onclick={limpiar}
						class="mt-5 inline-flex min-h-11 items-center rounded-full bg-[var(--acento)] px-5 text-sm font-semibold text-white"
					>
						Limpiar filtros
					</button>
				</div>
			{:else}
				<ul class="divide-y divide-[var(--borde)] border-t border-[var(--borde)]">
					{#each resultados as t (t.slug)}
						<li>
							<a
								href="/tramites/{t.slug}"
								class="group flex flex-col gap-1.5 py-5 no-underline sm:flex-row sm:items-baseline sm:gap-6"
							>
								<span
									class="order-2 shrink-0 text-[0.72rem] font-semibold tracking-wider text-[var(--texto-suave)] uppercase sm:order-1 sm:w-52"
								>
									{t.direccion.nombre}
								</span>
								<span class="order-1 sm:order-2">
									<span
										class="block leading-snug font-semibold text-[var(--texto)] group-hover:text-[var(--acento)]"
									>
										{t.nombre}
									</span>
									{#if t.resumen}
										<span class="mt-1 line-clamp-2 block text-sm leading-relaxed text-[var(--texto-suave)]">
											{t.resumen}
										</span>
									{/if}
									{#if t.requiere_revision_editorial}
										<span
											class="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-ambar-100)] px-2.5 py-1 text-[0.7rem] font-semibold text-[var(--color-ambar-700)]"
										>
											<svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
												<path d="M12 8v5m0 3.5v.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
												<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
											</svg>
											Pendiente de validación
										</span>
									{/if}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>
