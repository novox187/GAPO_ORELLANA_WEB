<script lang="ts">
	import { ETIQUETA_CATEGORIA } from '$lib/api';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const t = $derived(data.tramite);

	// El checklist es una ayuda personal del visitante: vive solo en memoria,
	// no se guarda ni se envía a ninguna parte.
	let marcados = $state(new Set<number>());
	function alternar(i: number) {
		const s = new Set(marcados);
		if (s.has(i)) s.delete(i);
		else s.add(i);
		marcados = s;
	}

	/**
	 * La fuente municipal intercala encabezados de etapa ("PASO No. 1: ...")
	 * dentro de la misma lista de requisitos. Se agrupan aquí para que solo
	 * los documentos reales sean marcables: si todo fuera casilla, el
	 * contador mentiría sobre cuánto le falta al ciudadano.
	 */
	const ES_ETAPA = /^PASO\s*(N[o°.º]*\s*)?\d+/i;

	const grupos = $derived.by(() => {
		const out: { etapa: string | null; items: { texto: string; url: string | null; i: number }[] }[] =
			[];
		let actual: (typeof out)[number] = { etapa: null, items: [] };
		t.requisitos.forEach((r, i) => {
			if (ES_ETAPA.test(r.texto.trim())) {
				if (actual.items.length || actual.etapa) out.push(actual);
				actual = { etapa: r.texto.replace(/:\s*$/, ''), items: [] };
			} else {
				actual.items.push({ texto: r.texto, url: r.documento_url, i });
			}
		});
		if (actual.items.length || actual.etapa) out.push(actual);
		return out;
	});

	const totalMarcables = $derived(grupos.reduce((n, g) => n + g.items.length, 0));

	const categoriaPrincipal = $derived(t.categorias[0]);
	const secciones = $derived(
		[
			t.que_es && { id: 'que-es', titulo: '¿Qué es?', texto: t.que_es },
			t.para_que_sirve && { id: 'para-que', titulo: '¿Para qué sirve?', texto: t.para_que_sirve },
			t.quienes_acceden && {
				id: 'quienes',
				titulo: '¿Quién puede acceder?',
				texto: t.quienes_acceden
			}
		].filter((s) => s !== undefined && s !== '')
	);
</script>

<svelte:head>
	<title>{t.nombre} — Francisco de Orellana</title>
	<meta name="description" content={t.resumen || t.que_es} />
</svelte:head>

<article>
	<!-- Encabezado de ficha -->
	<header class="border-b border-[var(--borde)] bg-[var(--superficie-alt)]">
		<div class="contenedor py-10 md:py-14">
			<nav aria-label="Ruta" class="mb-6 text-sm text-[var(--texto-suave)]">
				<a href="/" class="no-underline hover:underline">Inicio</a>
				<span class="mx-2 opacity-40">/</span>
				<a href="/tramites" class="no-underline hover:underline">Trámites</a>
				{#if categoriaPrincipal}
					<span class="mx-2 opacity-40">/</span>
					<a href="/tramites?categoria={categoriaPrincipal}" class="no-underline hover:underline">
						{ETIQUETA_CATEGORIA[categoriaPrincipal] ?? categoriaPrincipal}
					</a>
				{/if}
			</nav>

			<p class="text-[0.75rem] font-semibold tracking-[0.16em] text-[var(--texto-suave)] uppercase">
				{t.direccion.nombre}
			</p>
			<h1 class="display mt-3 max-w-4xl text-[clamp(1.9rem,4.2vw,3.1rem)]">{t.nombre}</h1>
			{#if t.resumen}
				<p class="mt-5 max-w-2xl text-[1.05rem] leading-relaxed text-[var(--texto-suave)]">
					{t.resumen}
				</p>
			{/if}
		</div>
	</header>

	<div class="contenedor grid gap-12 py-12 md:py-16 lg:grid-cols-[1fr_19rem] lg:gap-16">
		<div class="min-w-0">
			{#if t.requiere_revision_editorial}
				<div
					class="mb-10 flex gap-3.5 rounded-lg border-l-4 border-[var(--color-ambar-600)] bg-[var(--color-ambar-100)] p-5"
					role="note"
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						aria-hidden="true"
						class="mt-0.5 shrink-0 text-[var(--color-ambar-700)]"
					>
						<path d="M12 8v5m0 3.5v.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
						<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
					</svg>
					<p class="text-[0.92rem] leading-relaxed text-[var(--color-ambar-700)]">
						<strong class="font-semibold">Procedimiento pendiente de validación.</strong>
						La fuente municipal no detalla un paso a paso completo para este trámite. Lo que ves es lo
						publicado hoy; confírmalo con la dirección responsable antes de tratarlo como definitivo.
					</p>
				</div>
			{/if}

			{#each secciones as s (s.id)}
				<section class="mb-10">
					<h2 class="display mb-3 text-[1.45rem]">{s.titulo}</h2>
					<p class="max-w-2xl leading-relaxed text-[var(--texto-suave)]">{s.texto}</p>
				</section>
			{/each}

			<!-- Requisitos como checklist marcable -->
			<section class="mb-10">
				<h2 class="display mb-1 text-[1.45rem]">¿Qué necesitas?</h2>
				{#if t.requisitos.length}
					<p class="mb-6 text-sm text-[var(--texto-suave)]">
						Marca lo que ya tengas listo. {marcados.size} de {totalMarcables} completados.
					</p>

					{#each grupos as g, gi (gi)}
						{#if g.etapa}
							<h3
								class="mt-8 mb-3 flex items-start gap-3 text-[0.95rem] leading-snug font-semibold first:mt-0"
							>
								<span
									class="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-noche-900)] text-[0.75rem] text-white"
									aria-hidden="true">{gi + 1}</span
								>
								{g.etapa}
							</h3>
						{/if}
						<ul class="space-y-2.5 {g.etapa ? 'ml-9' : ''}">
							{#each g.items as it (it.i)}
								<li>
									<label
										class="flex cursor-pointer gap-3.5 rounded-lg border border-[var(--borde)] bg-[var(--superficie-elevada)] p-4 transition-colors hover:border-[var(--acento)] has-[:checked]:border-[var(--acento)] has-[:checked]:bg-[var(--color-ambar-100)]"
									>
										<input
											type="checkbox"
											checked={marcados.has(it.i)}
											onchange={() => alternar(it.i)}
											class="mt-0.5 h-5 w-5 shrink-0 accent-[var(--acento)]"
										/>
										<span class="text-[0.95rem] leading-relaxed">
											{it.texto}
											{#if it.url}
												<a
													href={it.url}
													target="_blank"
													rel="noopener"
													class="ml-1 font-semibold text-[var(--enlace)] underline underline-offset-2"
													>Descargar formulario</a
												>
											{/if}
										</span>
									</label>
								</li>
							{/each}
						</ul>
					{/each}
				{:else}
					<p class="max-w-2xl leading-relaxed text-[var(--texto-suave)]">
						Este trámite no lista requisitos formales en la fuente municipal. Consulta directamente
						con {t.direccion.nombre}.
					</p>
				{/if}
			</section>

			{#if t.pasos.length}
				<section class="mb-10">
					<h2 class="display mb-5 text-[1.45rem]">Paso a paso</h2>
					<ol class="space-y-5">
						{#each t.pasos as p (p.orden)}
							<li class="flex gap-4">
								<span
									class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-noche-900)] text-sm font-semibold text-white"
									aria-hidden="true">{p.orden}</span
								>
								<div>
									<h3 class="font-semibold">{p.titulo}</h3>
									<p class="mt-1 leading-relaxed text-[var(--texto-suave)]">{p.descripcion}</p>
								</div>
							</li>
						{/each}
					</ol>
				</section>
			{/if}

			{#if t.formularios.length}
				<section class="mb-10">
					<h2 class="display mb-5 text-[1.45rem]">Formularios y descargas</h2>
					<ul class="space-y-2.5">
						{#each t.formularios as f (f.url)}
							<li>
								<a
									href={f.url}
									target="_blank"
									rel="noopener"
									class="flex items-center gap-3 rounded-lg border border-[var(--borde)] p-4 no-underline transition-colors hover:border-[var(--acento)]"
								>
									<span
										class="rounded bg-[var(--superficie-alt)] px-2 py-1 text-[0.68rem] font-bold tracking-wide uppercase"
										>{f.tipo}</span
									>
									<span class="font-medium">{f.nombre}</span>
								</a>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if t.contenido_adicional.length}
				<section class="mb-10">
					<h2 class="display mb-5 text-[1.45rem]">Información adicional</h2>
					{#each t.contenido_adicional as c (c.titulo)}
						<h3 class="mt-6 mb-2 font-semibold">{c.titulo}</h3>
						<!-- HTML preservado del sitio municipal de origen -->
						<div class="prose-municipal leading-relaxed text-[var(--texto-suave)]">
							{@html c.html}
						</div>
					{/each}
				</section>
			{/if}
		</div>

		<!-- Panel de datos clave -->
		<aside class="lg:sticky lg:top-6 lg:self-start">
			<div class="rounded-xl border border-[var(--borde)] bg-[var(--superficie-elevada)] p-6">
				<h2 class="mb-4 text-sm font-semibold">Datos del trámite</h2>
				<dl class="space-y-4 text-sm">
					<div>
						<dt class="text-[var(--texto-suave)]">Costo</dt>
						<dd class="mt-0.5 font-semibold">
							{t.costo.tiene_costo === false
								? 'Sin costo'
								: t.costo.detalle || 'No especificado en la fuente'}
						</dd>
					</div>
					<div>
						<dt class="text-[var(--texto-suave)]">Dirección responsable</dt>
						<dd class="mt-0.5 font-semibold">{t.direccion.nombre}</dd>
					</div>
					{#if t.base_legal.length}
						<div>
							<dt class="text-[var(--texto-suave)]">Base legal</dt>
							<dd class="mt-0.5 font-semibold">{t.base_legal.join(', ')}</dd>
						</div>
					{/if}
					<div>
						<dt class="text-[var(--texto-suave)]">Fuente</dt>
						<dd class="mt-0.5">
							<a
								href={t.fuente_url}
								target="_blank"
								rel="noopener"
								class="font-semibold text-[var(--enlace)] underline underline-offset-2"
								>Ver en el sitio actual</a
							>
						</dd>
					</div>
				</dl>

				<a
					href="/contacto"
					class="mt-6 flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--color-noche-900)] px-5 text-sm font-semibold text-white no-underline transition-transform hover:-translate-y-px"
				>
					¿Necesitas ayuda?
				</a>
			</div>
		</aside>
	</div>
</article>

<style>
	.prose-municipal :global(p) {
		margin-bottom: 0.85rem;
	}
	.prose-municipal :global(ul) {
		list-style: disc;
		padding-left: 1.25rem;
		margin-bottom: 0.85rem;
	}
	.prose-municipal :global(a) {
		color: var(--enlace);
		text-decoration: underline;
	}
	.prose-municipal :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 1rem;
	}
	.prose-municipal :global(td),
	.prose-municipal :global(th) {
		border: 1px solid var(--borde);
		padding: 0.5rem 0.65rem;
		text-align: left;
	}
</style>
