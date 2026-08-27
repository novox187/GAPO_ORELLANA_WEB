<script lang="ts">
	import { ETIQUETA_CATEGORIA } from '$lib/api';
	import Migas from '$lib/components/Migas.svelte';
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
	 * Algunos trámites intercalan encabezados de etapa ("PASO No. 1: ...")
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
	const progreso = $derived(totalMarcables ? Math.round((marcados.size / totalMarcables) * 100) : 0);
	const completo = $derived(totalMarcables > 0 && marcados.size === totalMarcables);

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

	/**
	 * Texto corto del costo para la franja de datos.
	 *
	 * `tiene_costo: null` significa que no hay un valor confirmado. No es lo
	 * mismo que gratis, y escribir "sin costo" ahí sería afirmar algo que
	 * nadie ha verificado: en un trámite municipal eso es un problema real
	 * para quien llega a ventanilla con el dinero justo. Por eso el vacío se
	 * resuelve derivando a quien sí lo sabe, no rellenándolo.
	 */
	const costoBreve = $derived(
		t.costo.tiene_costo === false
			? 'Sin costo'
			: t.costo.valor_referencial != null
				? `$${t.costo.valor_referencial}`
				: t.costo.detalle
					? t.costo.detalle
					: 'Consultar'
	);
</script>

<svelte:head>
	<title>{t.nombre} — Francisco de Orellana</title>
	<meta name="description" content={t.resumen || t.que_es} />
</svelte:head>

<article class="pb-28 lg:pb-0">
	<!-- ══ Encabezado ═══════════════════════════════════════════════════ -->
	<header class="border-b border-[var(--borde)] bg-[var(--superficie-alt)]">
		<div class="contenedor pt-6 pb-8 md:pt-10 md:pb-12">
			<Migas
				tramos={[
					{ texto: 'Inicio', href: '/' },
					{ texto: 'Trámites', href: '/tramites' },
					...(categoriaPrincipal
						? [
								{
									texto: ETIQUETA_CATEGORIA[categoriaPrincipal] ?? categoriaPrincipal,
									href: `/tramites?categoria=${categoriaPrincipal}`
								}
							]
						: [])
				]}
			/>

			<h1 class="display max-w-4xl text-[clamp(1.55rem,4.2vw,3rem)]">{t.nombre}</h1>

			{#if t.resumen}
				<p class="mt-4 max-w-2xl leading-relaxed text-[var(--texto-suave)] md:text-[1.05rem]">
					{t.resumen}
				</p>
			{/if}

			<!--
				Franja de datos clave, arriba y no en una barra lateral que en
				móvil caía al final de 5.600 px de scroll. Costo y dirección son
				lo primero que alguien quiere saber antes de leer nada más.
			-->
			<dl class="mt-6 grid grid-cols-2 gap-px overflow-hidden border border-[var(--borde)] bg-[var(--borde)] sm:grid-cols-3">
				<div class="bg-[var(--superficie-elevada)] px-4 py-3">
					<dt class="text-[0.68rem] font-bold tracking-wide text-[var(--texto-suave)] uppercase">
						Costo
					</dt>
					<dd class="mt-1 text-[0.92rem] leading-snug font-bold">{costoBreve}</dd>
				</div>
				<div class="bg-[var(--superficie-elevada)] px-4 py-3">
					<dt class="text-[0.68rem] font-bold tracking-wide text-[var(--texto-suave)] uppercase">
						Requisitos
					</dt>
					<dd class="mt-1 text-[0.92rem] leading-snug font-bold">
						{totalMarcables || '—'}
						{totalMarcables ? 'documentos' : ''}
					</dd>
				</div>
				<div class="col-span-2 bg-[var(--superficie-elevada)] px-4 py-3 sm:col-span-1">
					<dt class="text-[0.68rem] font-bold tracking-wide text-[var(--texto-suave)] uppercase">
						Lo atiende
					</dt>
					<dd class="mt-1 text-[0.92rem] leading-snug font-bold">{t.direccion.nombre}</dd>
				</div>
			</dl>
		</div>
	</header>

	<div class="contenedor grid gap-10 py-8 md:py-12 lg:grid-cols-[1fr_18rem] lg:gap-14">
		<div class="min-w-0">
			<!-- ══ Requisitos: lo accionable va primero ══════════════════ -->
			<section class="mb-10" aria-labelledby="titulo-requisitos">
				<h2 id="titulo-requisitos" class="display text-[1.35rem] md:text-[1.5rem]">
					¿Qué necesitas?
				</h2>

				{#if t.requisitos.length}
					<!--
						Progreso pegajoso: en una lista de trece documentos, saber
						cuántos llevas es justo el dato que desaparece al hacer
						scroll. Se ancla bajo la cabecera, que también es pegajosa.
					-->
					<div class="progreso sticky z-10 -mx-5 mt-3 bg-[var(--superficie)] px-5 py-2.5 md:-mx-8 md:px-8">
						<div class="flex items-center justify-between gap-4">
							<p class="text-[0.85rem] font-semibold" role="status" aria-live="polite">
								{#if completo}
									<span class="text-[var(--enlace)]">Ya tienes todo listo</span>
								{:else}
									{marcados.size} de {totalMarcables} listos
								{/if}
							</p>
							{#if marcados.size > 0}
								<button
									type="button"
									onclick={() => (marcados = new Set())}
									class="min-h-9 cursor-pointer text-[0.8rem] font-semibold text-[var(--texto-suave)] underline underline-offset-2"
								>
									Reiniciar
								</button>
							{/if}
						</div>
						<div
							class="mt-2 h-1.5 w-full bg-[var(--borde)]"
							role="progressbar"
							aria-valuenow={marcados.size}
							aria-valuemin="0"
							aria-valuemax={totalMarcables}
							aria-label="Requisitos que ya tienes"
						>
							<div
								class="barra-progreso h-full bg-[var(--color-selva-600)]"
								style="width: {progreso}%"
							></div>
						</div>
					</div>

					<div class="mt-4 flex flex-col gap-6">
						{#each grupos as g, gi (gi)}
							<div>
								{#if g.etapa}
									<!--
										La etapa se marca con un canto de color, no con
										`ml-9` en la lista: en un teléfono de 375 px esa
										sangría se comía 36 px de cada tarjeta.
									-->
									<h3
										class="mb-2.5 flex items-start gap-3 border-l-4 border-[var(--color-achiote-500)] py-1 pl-3 text-[0.9rem] leading-snug font-bold"
									>
										<span
											class="mt-px inline-flex h-5 w-5 shrink-0 items-center justify-center bg-[var(--color-carbon-900)] text-[0.7rem] text-white"
											aria-hidden="true">{gi + 1}</span
										>
										{g.etapa}
									</h3>
								{/if}

								<ul class="flex flex-col gap-1.5">
									{#each g.items as it (it.i)}
										<li>
											<label class="requisito flex cursor-pointer gap-3 border border-[var(--borde)] bg-[var(--superficie-elevada)] p-3.5">
												<input
													type="checkbox"
													checked={marcados.has(it.i)}
													onchange={() => alternar(it.i)}
													class="mt-0.5 h-6 w-6 shrink-0 accent-[var(--color-selva-600)]"
												/>
												<span class="min-w-0 text-[0.92rem] leading-relaxed">
													{it.texto}
													{#if it.url}
														<a
															href={it.url}
															target="_blank"
															rel="noopener"
															class="ml-1 inline-flex min-h-9 items-center font-bold text-[var(--enlace)] underline underline-offset-2"
														>
															Descargar formulario
														</a>
													{/if}
												</span>
											</label>
										</li>
									{/each}
								</ul>
							</div>
						{/each}
					</div>
				{:else}
					<p class="mt-3 max-w-2xl leading-relaxed text-[var(--texto-suave)]">
						Consulta los requisitos de este trámite directamente con {t.direccion.nombre}.
					</p>
				{/if}
			</section>

			{#if t.pasos.length}
				<section class="mb-10">
					<h2 class="display mb-4 text-[1.35rem] md:text-[1.5rem]">Paso a paso</h2>
					<ol class="flex flex-col gap-4">
						{#each t.pasos as p (p.orden)}
							<li class="flex gap-3.5">
								<span
									class="flex h-8 w-8 shrink-0 items-center justify-center bg-[var(--color-carbon-900)] text-sm font-bold text-white"
									aria-hidden="true">{p.orden}</span
								>
								<div class="min-w-0">
									<h3 class="font-bold">{p.titulo}</h3>
									<p class="mt-1 leading-relaxed text-[var(--texto-suave)]">{p.descripcion}</p>
								</div>
							</li>
						{/each}
					</ol>
				</section>
			{/if}

			{#if t.formularios.length}
				<section class="mb-10">
					<h2 class="display mb-4 text-[1.35rem] md:text-[1.5rem]">Formularios y descargas</h2>
					<ul class="flex flex-col gap-1.5">
						{#each t.formularios as f (f.url)}
							<li>
								<a
									href={f.url}
									target="_blank"
									rel="noopener"
									class="descarga flex min-h-14 items-center gap-3 border border-[var(--borde)] p-3.5 no-underline"
								>
									<span
										class="shrink-0 bg-[var(--superficie-alt)] px-2 py-1 text-[0.66rem] font-bold tracking-wide uppercase"
										>{f.tipo}</span
									>
									<span class="min-w-0 font-semibold">{f.nombre}</span>
								</a>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			<!--
				La prosa va después de lo accionable y plegada en móvil. Quien
				entra a un trámite viene a por los requisitos, no a leer una
				definición de veinte líneas antes de encontrarlos. En escritorio
				hay sitio de sobra y va abierta.
			-->
			{#if secciones.length}
				<section class="mb-10" aria-labelledby="titulo-detalle">
					<h2 id="titulo-detalle" class="display mb-3 text-[1.35rem] md:text-[1.5rem]">
						Más detalle
					</h2>
					<div class="flex flex-col gap-1.5">
						{#each secciones as s (s.id)}
							<details class="plegable border border-[var(--borde)]" open={secciones.length === 1}>
								<summary
									class="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 p-3.5 font-bold"
								>
									{s.titulo}
									<svg
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										aria-hidden="true"
										class="chevron shrink-0 text-[var(--texto-suave)]"
									>
										<path
											d="m6 9 6 6 6-6"
											stroke="currentColor"
											stroke-width="2.4"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
								</summary>
								<p class="border-t border-[var(--borde)] p-3.5 leading-relaxed text-[var(--texto-suave)]">
									{s.texto}
								</p>
							</details>
						{/each}
					</div>
				</section>
			{/if}

			{#if t.contenido_adicional.length}
				<section class="mb-10">
					<h2 class="display mb-3 text-[1.35rem] md:text-[1.5rem]">Información adicional</h2>
					<div class="flex flex-col gap-1.5">
						{#each t.contenido_adicional as c (c.titulo)}
							<details class="plegable border border-[var(--borde)]">
								<summary
									class="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 p-3.5 font-bold"
								>
									{c.titulo}
									<svg
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										aria-hidden="true"
										class="chevron shrink-0 text-[var(--texto-suave)]"
									>
										<path
											d="m6 9 6 6 6-6"
											stroke="currentColor"
											stroke-width="2.4"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
								</summary>
												<div
									class="prose-municipal border-t border-[var(--borde)] p-3.5 leading-relaxed text-[var(--texto-suave)]"
								>
									{@html c.html}
								</div>
							</details>
						{/each}
					</div>
				</section>
			{/if}
		</div>

		<!-- ══ Panel lateral, sólo escritorio ═══════════════════════════ -->
		<aside class="hidden lg:sticky lg:top-28 lg:block lg:self-start">
			<div class="border border-[var(--borde)] bg-[var(--superficie-elevada)] p-5">
				<h2 class="mb-4 text-[0.82rem] font-bold tracking-wide uppercase text-[var(--texto-suave)]">
					Datos del trámite
				</h2>
				<dl class="flex flex-col gap-3.5 text-sm">
					<div>
						<dt class="text-[var(--texto-suave)]">Costo</dt>
						<dd class="mt-0.5 font-bold">
							{t.costo.tiene_costo === false
								? 'Sin costo'
								: t.costo.detalle || `Consultar con ${t.direccion.nombre}`}
						</dd>
					</div>
					{#if t.base_legal.length}
						<div>
							<dt class="text-[var(--texto-suave)]">Base legal</dt>
							<dd class="mt-0.5 font-bold">{t.base_legal.join(', ')}</dd>
						</div>
					{/if}
				</dl>

				<a
					href="/contacto"
					class="mt-5 flex min-h-12 w-full items-center justify-center bg-[var(--color-achiote-500)] px-5 text-sm font-bold text-[var(--color-carbon-900)] no-underline"
				>
					¿Necesitas ayuda?
				</a>
			</div>
		</aside>
	</div>

	<!--
		Barra de acción fija en móvil. En la versión anterior el botón de
		ayuda estaba al final del documento, detrás de todos los requisitos y
		de la información adicional; en la ficha de patente había que bajar
		más de 5.000 px para verlo. Y era invisible: usaba un token de color
		que ya no existe en el sistema, así que salía texto blanco sobre
		fondo transparente.
	-->
	<div class="accion fixed inset-x-0 bottom-0 z-20 border-t border-[var(--borde)] bg-[var(--superficie)] px-5 pt-2.5 lg:hidden">
		<a
			href="/contacto"
			class="flex min-h-12 w-full items-center justify-center gap-2 bg-[var(--color-achiote-500)] px-4 text-[0.9rem] font-bold text-[var(--color-carbon-900)] no-underline"
		>
			<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<path
					d="M4.5 5.5h5l1.5 4-2.5 1.5a11 11 0 0 0 4.5 4.5l1.5-2.5 4 1.5v5a1 1 0 0 1-1.1 1A15.5 15.5 0 0 1 3.5 6.6a1 1 0 0 1 1-1.1"
					stroke="currentColor"
					stroke-width="2"
					stroke-linejoin="round"
				/>
			</svg>
			¿Necesitas ayuda con este trámite?
		</a>
	</div>
</article>

<style>
	.progreso {
		top: var(--alto-barra);
		border-bottom: 1px solid var(--borde);
	}

	.barra-progreso {
		transition: width 0.3s var(--ease-cine);
	}

	.accion {
		/* Sobre la barra de gestos del teléfono, no debajo. */
		padding-bottom: max(0.625rem, env(safe-area-inset-bottom));
	}

	/* ── Requisitos ──────────────────────────────────────────────────── */
	.requisito {
		transition:
			border-color 0.18s ease-out,
			background-color 0.18s ease-out;
	}

	.requisito:hover,
	.requisito:focus-within {
		border-color: var(--marca);
	}

	.requisito:has(:checked) {
		border-color: var(--color-selva-600);
		background: var(--superficie-alt);
	}

	.requisito:has(:checked) span {
		color: var(--texto-suave);
	}

	.descarga {
		transition: border-color 0.18s ease-out;
	}

	.descarga:hover,
	.descarga:focus-visible {
		border-color: var(--marca);
	}

	/* ── Plegables ───────────────────────────────────────────────────── */
	.plegable summary::-webkit-details-marker {
		display: none;
	}

	.chevron {
		transition: transform 0.2s var(--ease-cine);
	}

	.plegable[open] .chevron {
		transform: rotate(180deg);
	}

	/* En escritorio hay sitio: la prosa no se esconde. */
	@media (width >= 64rem) {
		.plegable > summary {
			cursor: default;
		}
	}

	/* ── Contenido enriquecido de la ficha ───────────────────────────── */
	.prose-municipal :global(p) {
		margin-bottom: 0.85rem;
		/* Parte de este contenido llega justificado, y en un móvil de 375 px
		   eso abre ríos de espacio entre palabras. */
		text-align: left !important;
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
		font-size: 0.88rem;
	}
	.prose-municipal :global(td),
	.prose-municipal :global(th) {
		border: 1px solid var(--borde);
		padding: 0.45rem 0.6rem;
		text-align: left;
	}
	/* Una tabla ancha se desplaza dentro de su caja, no rompe la página. */
	.prose-municipal {
		overflow-x: auto;
	}

	@media (prefers-reduced-motion: reduce) {
		.barra-progreso,
		.requisito,
		.descarga,
		.chevron {
			transition: none;
		}
	}
</style>
