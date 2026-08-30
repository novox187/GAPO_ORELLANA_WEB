<script lang="ts">
	import { ETIQUETA_TIPO, type Respuesta } from '$lib/asistente';

	/**
	 * La ficha oficial dentro de la conversación, en versión discreta.
	 *
	 * Aparece DESPUÉS de que el asistente termina de hablar, no antes. Mostrar
	 * la ficha entera desplegada mientras el modelo todavía escribe convertía
	 * el chat en un volcado de datos con un párrafo pegado encima: la respuesta
	 * conversacional quedaba sepultada bajo ocho requisitos que nadie había
	 * pedido todavía.
	 *
	 * Aquí sólo se ve el titular y dónde se hace. Los requisitos, los pasos y
	 * los teléfonos están a un clic, en `<details>` nativos —accesibles por
	 * teclado y funcionan sin JavaScript—, y la ficha completa sigue a un
	 * enlace de distancia. Quien quiera el detalle lo abre; quien sólo quería
	 * saber a dónde ir, ya lo sabe.
	 */
	let { respuesta, conParrafo = false }: { respuesta: Respuesta; conParrafo?: boolean } = $props();

	const ficha = $derived(respuesta.ficha);
	const donde = $derived(ficha?.datos.find((d) => d.etiqueta === 'Dónde se hace')?.valor ?? '');
	const costo = $derived(ficha?.datos.find((d) => d.etiqueta === 'Costo')?.valor ?? '');
	const relacionados = $derived([...respuesta.alternativas, ...respuesta.noticias]);
</script>

{#if ficha}
	<div class="ficha mt-3 rounded-lg border border-[var(--borde)] bg-[var(--superficie-elevada)]">
		<div class="p-3.5">
			<p class="text-[0.65rem] font-bold tracking-[0.14em] text-[var(--texto-suave)] uppercase">
				{ETIQUETA_TIPO[ficha.clase] ?? ficha.clase}
				{#if respuesta.confianza !== 'alta' && !conParrafo}
					· lo más parecido que encontré
				{/if}
			</p>

			<a
				href={ficha.url}
				class="mt-1 block font-semibold text-[var(--texto)] underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-selva-600 focus-visible:outline-none"
			>
				{ficha.titulo}
			</a>

			{#if donde || costo}
				<dl class="mt-2 space-y-0.5 text-sm text-[var(--texto-suave)]">
					{#if donde}
						<div class="flex gap-2">
							<dt class="shrink-0">Dónde:</dt>
							<dd class="text-[var(--texto)]">{donde}</dd>
						</div>
					{/if}
					{#if costo}
						<div class="flex gap-2">
							<dt class="shrink-0">Costo:</dt>
							<dd class="text-[var(--texto)]">{costo}</dd>
						</div>
					{/if}
				</dl>
			{/if}

			{#if ficha.requiereRevision}
				<p class="mt-2 border-l-2 border-achiote-600 pl-2 text-xs text-[var(--texto-suave)]">
					El municipio marca esta ficha como incompleta. Confirme los requisitos antes de acudir.
				</p>
			{/if}
		</div>

		<!-- ══ Detalle, plegado ══ -->
		{#if ficha.requisitos.length}
			<details class="grupo border-t border-[var(--borde)]">
				<summary
					class="flex min-h-11 cursor-pointer list-none items-center justify-between px-3.5 py-2.5 text-sm font-medium hover:bg-[var(--superficie-alt)] focus-visible:ring-2 focus-visible:ring-selva-600 focus-visible:outline-none"
				>
					<span>{ficha.requisitos.length} requisitos</span>
					<span class="flecha text-[var(--texto-suave)]" aria-hidden="true">▾</span>
				</summary>
				<ol class="space-y-1.5 px-3.5 pb-3.5 text-sm">
					{#each ficha.requisitos as requisito, i (i)}
						<li class="flex gap-2.5">
							<span class="w-4 shrink-0 text-right text-[var(--texto-suave)] tabular-nums">
								{i + 1}
							</span>
							<span>{requisito}</span>
						</li>
					{/each}
				</ol>
			</details>
		{/if}

		{#if ficha.pasos.length}
			<details class="grupo border-t border-[var(--borde)]">
				<summary
					class="flex min-h-11 cursor-pointer list-none items-center justify-between px-3.5 py-2.5 text-sm font-medium hover:bg-[var(--superficie-alt)] focus-visible:ring-2 focus-visible:ring-selva-600 focus-visible:outline-none"
				>
					<span>Cómo se hace ({ficha.pasos.length} pasos)</span>
					<span class="flecha text-[var(--texto-suave)]" aria-hidden="true">▾</span>
				</summary>
				<ol class="space-y-2 px-3.5 pb-3.5 text-sm">
					{#each ficha.pasos as paso, i (i)}
						<li>
							<p class="font-medium">{i + 1}. {paso.titulo}</p>
							{#if paso.descripcion}
								<p class="mt-0.5 text-[var(--texto-suave)]">{paso.descripcion}</p>
							{/if}
						</li>
					{/each}
				</ol>
			</details>
		{/if}

		{#if ficha.telefonos.length}
			<details class="grupo border-t border-[var(--borde)]">
				<summary
					class="flex min-h-11 cursor-pointer list-none items-center justify-between px-3.5 py-2.5 text-sm font-medium hover:bg-[var(--superficie-alt)] focus-visible:ring-2 focus-visible:ring-selva-600 focus-visible:outline-none"
				>
					<span>A quién llamar</span>
					<span class="flecha text-[var(--texto-suave)]" aria-hidden="true">▾</span>
				</summary>
				<dl class="px-3.5 pb-3.5 text-sm">
					{#each ficha.telefonos as tel (tel.cargo + tel.extension)}
						<div class="flex justify-between gap-4 border-b border-[var(--borde)] py-1.5 last:border-0">
							<dt class="text-[var(--texto-suave)]">{tel.cargo}</dt>
							<dd class="font-semibold tabular-nums">{tel.extension}</dd>
						</div>
					{/each}
				</dl>
			</details>
		{/if}

		{#if ficha.enlaces?.length}
			<details class="grupo border-t border-[var(--borde)]">
				<summary
					class="flex min-h-11 cursor-pointer list-none items-center justify-between px-3.5 py-2.5 text-sm font-medium hover:bg-[var(--superficie-alt)] focus-visible:ring-2 focus-visible:ring-selva-600 focus-visible:outline-none"
				>
					<span>Trámites que gestiona ({ficha.enlaces.length})</span>
					<span class="flecha text-[var(--texto-suave)]" aria-hidden="true">▾</span>
				</summary>
				<ul class="space-y-1 px-3.5 pb-3.5 text-sm">
					{#each ficha.enlaces as enlace (enlace.url)}
						<li>
							<a
								href={enlace.url}
								class="text-selva-800 underline underline-offset-2 dark:text-selva-400"
							>
								{enlace.titulo}
							</a>
						</li>
					{/each}
				</ul>
			</details>
		{/if}

		{#if ficha.documentos.length}
			<details class="grupo border-t border-[var(--borde)]">
				<summary
					class="flex min-h-11 cursor-pointer list-none items-center justify-between px-3.5 py-2.5 text-sm font-medium hover:bg-[var(--superficie-alt)] focus-visible:ring-2 focus-visible:ring-selva-600 focus-visible:outline-none"
				>
					<span>Formularios ({ficha.documentos.length})</span>
					<span class="flecha text-[var(--texto-suave)]" aria-hidden="true">▾</span>
				</summary>
				<ul class="space-y-1 px-3.5 pb-3.5 text-sm">
					{#each ficha.documentos as doc (doc.url)}
						<li>
							<a
								href={doc.url}
								class="text-selva-800 underline underline-offset-2 dark:text-selva-400"
								rel="noopener"
							>
								{doc.titulo}
								<span class="text-[var(--texto-suave)] uppercase">({doc.tipo})</span>
							</a>
						</li>
					{/each}
				</ul>
			</details>
		{/if}

		<div class="border-t border-[var(--borde)] px-3.5 py-2.5">
			<a
				href={ficha.url}
				class="inline-flex min-h-11 items-center text-sm font-medium text-selva-800 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-selva-600 focus-visible:outline-none dark:text-selva-400"
			>
				Ver la ficha completa →
			</a>
		</div>
	</div>
{/if}

<!-- ══ Relacionados: una sola línea plegable, no tres listas ══ -->
{#if relacionados.length}
	<details class="ficha grupo mt-2">
		<summary
			class="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm text-[var(--texto-suave)] hover:text-[var(--texto)] focus-visible:ring-2 focus-visible:ring-selva-600 focus-visible:outline-none"
		>
			<span class="flecha" aria-hidden="true">▸</span>
			Otros {relacionados.length}
			{relacionados.length === 1 ? 'resultado relacionado' : 'resultados relacionados'}
		</summary>
		<ul class="mt-1 space-y-1 pl-5 text-sm">
			{#each relacionados as enlace (enlace.url)}
				<li>
					<a
						href={enlace.url}
						class="text-selva-800 underline-offset-2 hover:underline dark:text-selva-400"
					>
						{enlace.titulo}
					</a>
					<span class="text-xs text-[var(--texto-suave)]">
						· {ETIQUETA_TIPO[enlace.tipo] ?? enlace.tipo}
					</span>
				</li>
			{/each}
		</ul>
	</details>
{/if}

{#if !ficha && respuesta.contacto.correo}
	<p class="mt-3 rounded-lg border border-dashed border-[var(--borde)] p-3.5 text-sm text-[var(--texto-suave)]">
		Si no era esto, escriba a
		<a
			href="mailto:{respuesta.contacto.correo}"
			class="text-selva-800 underline underline-offset-2 dark:text-selva-400"
		>
			{respuesta.contacto.correo}
		</a>
		o revise el
		<a href="/contacto" class="text-selva-800 underline underline-offset-2 dark:text-selva-400">
			directorio de direcciones
		</a>.
	</p>
{/if}

<style>
	/* Entrada contenida: la ficha llega cuando el asistente ya terminó de
	   hablar, así que se anuncia sin sobresaltar. */
	.ficha {
		animation: aparecer 220ms ease-out;
	}

	@keyframes aparecer {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
	}

	summary::-webkit-details-marker {
		display: none;
	}

	.flecha {
		transition: transform 150ms ease-out;
	}

	details[open] .flecha {
		transform: rotate(90deg);
	}

	/* La flecha de los bloques del cuerpo apunta hacia abajo, no hacia el
	   lado, así que gira al revés. */
	details[open] summary .flecha:not(:first-child) {
		transform: rotate(180deg);
	}

	@media (prefers-reduced-motion: reduce) {
		.ficha,
		.flecha {
			animation: none;
			transition: none;
		}
	}
</style>
