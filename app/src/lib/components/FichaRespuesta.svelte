<script lang="ts">
	import { ETIQUETA_TIPO, type Respuesta } from '$lib/asistente';

	/**
	 * La respuesta del asistente.
	 *
	 * Dos decisiones de diseño que no son estéticas:
	 *
	 * 1. **La confianza se enseña, no se esconde.** Cuando el buscador no
	 *    está seguro, el encabezado lo dice con esas palabras. Un asistente
	 *    municipal que presenta como cierto lo que es una aproximación
	 *    traslada al ciudadano un riesgo que no le corresponde.
	 * 2. **El contacto humano está siempre visible**, no sólo cuando falla.
	 *    Es la salida para todo lo que esto no sepa resolver.
	 */
	let { respuesta }: { respuesta: Respuesta } = $props();

	const ENCABEZADO: Record<string, { texto: string; clase: string }> = {
		alta: {
			texto: 'Esto responde a tu consulta',
			clase: 'border-[var(--color-selva-600)] text-[var(--marca)]'
		},
		media: {
			texto: 'Esto es lo más parecido que encontré',
			clase: 'border-[var(--color-achiote-500)] text-[var(--acento-texto)]'
		},
		baja: {
			texto: 'No encontré nada sobre eso en el sitio del municipio',
			clase: 'border-[var(--borde)] text-[var(--texto-suave)]'
		}
	};

	const cabecera = $derived(ENCABEZADO[respuesta.confianza]);
	const ficha = $derived(respuesta.ficha);
</script>

<div class="border-t-2 pt-4 {cabecera.clase}">
	<p class="text-[0.7rem] font-bold tracking-[0.14em] uppercase">
		{cabecera.texto}
	</p>

	{#if ficha}
		<!-- El párrafo del modelo local. Va antes de la ficha porque es la
		     frase de enlace, y marcado como resumen automático porque lo es:
		     el ciudadano tiene que saber qué parte redactó una máquina y qué
		     parte es el texto oficial del municipio. -->
		{#if respuesta.parrafo}
			<p class="mt-3 max-w-2xl text-[1.05rem] leading-relaxed text-[var(--texto)]">
				{respuesta.parrafo}
			</p>
			<p class="mt-1 text-[0.72rem] text-[var(--texto-suave)]">
				Resumen automático. Lo que vale es la ficha oficial de abajo.
			</p>
		{/if}

		<article class="mt-4 border border-[var(--borde)] bg-[var(--superficie-elevada)] p-5 md:p-6">
			<span class="text-[0.68rem] font-bold tracking-[0.14em] text-[var(--texto-suave)] uppercase">
				{ETIQUETA_TIPO[ficha.clase] ?? ficha.clase}
			</span>

			<h3 class="display mt-1.5 text-[1.3rem] leading-snug">
				<a href={ficha.url} class="text-[var(--texto)] no-underline hover:text-[var(--marca)]">
					{ficha.titulo}
				</a>
			</h3>

			{#if ficha.entradilla}
				<p class="mt-3 max-w-2xl leading-relaxed text-[var(--texto-suave)]">{ficha.entradilla}</p>
			{/if}

			{#if ficha.datos.length}
				<dl class="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
					{#each ficha.datos as d (d.etiqueta)}
						<div>
							<dt
								class="text-[0.68rem] font-bold tracking-[0.12em] text-[var(--texto-suave)] uppercase"
							>
								{d.etiqueta}
							</dt>
							<dd class="mt-0.5 leading-snug">{d.valor}</dd>
						</div>
					{/each}
				</dl>
			{/if}

			{#if ficha.requisitos.length}
				<h4 class="mt-6 text-[0.82rem] font-bold">
					Requisitos <span class="cifra-tabular text-[var(--texto-suave)]"
						>({ficha.requisitos.length})</span
					>
				</h4>
				<ol class="mt-2 space-y-1.5">
					{#each ficha.requisitos as r, i (i)}
						<li class="flex gap-3 text-sm leading-relaxed">
							<span class="cifra-tabular shrink-0 text-[var(--indice)]"
								>{String(i + 1).padStart(2, '0')}</span
							>
							<span>{r}</span>
						</li>
					{/each}
				</ol>
			{/if}

			{#if ficha.pasos.length}
				<h4 class="mt-6 text-[0.82rem] font-bold">Cómo se hace</h4>
				<ol class="mt-2 space-y-2.5">
					{#each ficha.pasos as p, i (i)}
						<li class="flex gap-3 text-sm leading-relaxed">
							<span class="cifra-tabular shrink-0 text-[var(--indice)]"
								>{String(i + 1).padStart(2, '0')}</span
							>
							<span><strong class="font-semibold">{p.titulo}</strong> {p.descripcion}</span>
						</li>
					{/each}
				</ol>
			{/if}

			{#if ficha.telefonos.length}
				<h4 class="mt-6 text-[0.82rem] font-bold">A quién llamar</h4>
				<ul class="mt-2 divide-y divide-[var(--borde)] border-y border-[var(--borde)]">
					{#each ficha.telefonos as t (t.cargo + t.extension)}
						<li class="flex items-baseline justify-between gap-4 py-2 text-sm">
							<span class="text-[var(--texto-suave)]">{t.cargo}</span>
							<span class="cifra-tabular font-bold">{t.extension}</span>
						</li>
					{/each}
				</ul>
			{/if}

			{#if ficha.documentos.length}
				<h4 class="mt-6 text-[0.82rem] font-bold">Documentos</h4>
				<ul class="mt-2 space-y-1">
					{#each ficha.documentos as d (d.url)}
						<li>
							<a
								href={d.url}
								class="text-sm font-semibold text-[var(--enlace)] underline underline-offset-2"
							>
								{d.titulo}
								{#if d.tipo}<span class="font-normal text-[var(--texto-suave)] uppercase"
										>· {d.tipo}</span
									>{/if}
							</a>
						</li>
					{/each}
				</ul>
			{/if}

			{#if ficha.requiereRevision}
				<!-- El propio extractor marcó esta ficha como incompleta en la
				     fuente municipal. Callarlo sería presentar como completa una
				     lista de requisitos que no lo está. -->
				<p
					class="mt-6 border-l-2 border-[var(--color-achiote-500)] py-1 pl-3 text-[0.78rem] leading-relaxed text-[var(--texto-suave)]"
				>
					La ficha original del municipio no detalla el procedimiento completo. Confirma los
					requisitos antes de acudir.
				</p>
			{/if}

			<p class="mt-6">
				<a
					href={ficha.url}
					class="inline-flex min-h-11 items-center border border-[var(--color-selva-800)] bg-[var(--color-selva-800)] px-5 text-[0.85rem] font-semibold text-white no-underline"
				>
					Ver la ficha completa
				</a>
			</p>
		</article>
	{/if}

	{#if respuesta.alternativas.length}
		<h4 class="mt-7 text-[0.68rem] font-bold tracking-[0.14em] text-[var(--texto-suave)] uppercase">
			{ficha ? 'También podría servirte' : 'Quizá alguna de estas'}
		</h4>
		<ul class="mt-2 divide-y divide-[var(--borde)] border-t border-[var(--borde)]">
			{#each respuesta.alternativas as a (a.url)}
				<li>
					<a href={a.url} class="flex items-baseline gap-3 py-2.5 no-underline">
						<span
							class="w-16 shrink-0 text-[0.62rem] font-bold tracking-[0.1em] text-[var(--texto-suave)] uppercase"
						>
							{ETIQUETA_TIPO[a.tipo] ?? a.tipo}
						</span>
						<span class="text-sm leading-snug text-[var(--texto)] hover:text-[var(--marca)]"
							>{a.titulo}</span
						>
					</a>
				</li>
			{/each}
		</ul>
	{/if}

	{#if respuesta.noticias.length}
		<h4 class="mt-7 text-[0.68rem] font-bold tracking-[0.14em] text-[var(--texto-suave)] uppercase">
			Se ha hablado de esto en noticias
		</h4>
		<ul class="mt-2 space-y-1.5">
			{#each respuesta.noticias as n (n.url)}
				<li>
					<a href={n.url} class="text-sm leading-snug text-[var(--enlace)] hover:underline"
						>{n.titulo}</a
					>
				</li>
			{/each}
		</ul>
	{/if}

	<!-- Siempre visible, no sólo cuando falla: es la salida para todo lo que
	     el asistente no sepa resolver. -->
	<p
		class="mt-7 border border-dashed border-[var(--borde)] p-4 text-sm leading-relaxed text-[var(--texto-suave)]"
	>
		{#if respuesta.confianza === 'baja'}
			Puede que el municipio no gestione ese trámite, o que en el sitio se llame de otra forma.
		{:else}
			¿No era esto lo que buscabas?
		{/if}
		Escribe a
		{#if respuesta.contacto.correo}
			<a
				href="mailto:{respuesta.contacto.correo}"
				class="font-semibold text-[var(--enlace)] underline">{respuesta.contacto.correo}</a
			>
		{/if}
		o revisa el
		<a href="/contacto" class="font-semibold text-[var(--enlace)] underline"
			>directorio de direcciones municipales</a
		>.
	</p>
</div>
