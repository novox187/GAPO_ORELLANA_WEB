<script lang="ts">
	import Migas from '$lib/components/Migas.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const NOMBRE_RED: Record<string, string> = {
		facebook: 'Facebook',
		x: 'X (Twitter)',
		instagram: 'Instagram',
		tiktok: 'TikTok',
		youtube: 'YouTube'
	};

	let consulta = $state('');

	const normaliza = (s: string) =>
		s
			.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '');

	const filtradas = $derived.by(() => {
		const q = normaliza(consulta.trim());
		if (!q) return data.direcciones;
		return data.direcciones.filter((d) => {
			const enNombre = normaliza(`${d.nombre} ${d.responsable ?? ''}`).includes(q);
			const enCargos = d.directorio_telefonico.some((e) =>
				normaliza(`${e.cargo} ${e.extension}`).includes(q)
			);
			return enNombre || enCargos;
		});
	});

	const totalExtensiones = $derived(
		data.direcciones.reduce((n, d) => n + d.directorio_telefonico.length, 0)
	);
</script>

<svelte:head>
	<title>Contacto y atención ciudadana — Alcaldía de Francisco de Orellana</title>
	<meta
		name="description"
		content="Directorio telefónico de las direcciones del GAD Municipal de Francisco de Orellana, canales oficiales y ubicación."
	/>
</svelte:head>

<div class="contenedor py-10 md:py-14">
	<Migas tramos={[{ texto: 'Inicio', href: '/' }, { texto: 'Contacto' }]} />

	<header class="mb-10">
		<h1 class="display text-[clamp(1.9rem,4.4vw,3rem)]">Contacto y atención ciudadana</h1>
		<p class="mt-3 max-w-2xl leading-relaxed text-[var(--texto-suave)]">
			Directorio de las {data.direcciones.length} direcciones municipales, con {totalExtensiones} extensiones
			telefónicas.
		</p>
	</header>

	<!--
		El sitio municipal de origen no publica dirección física ni teléfono
		central en texto: sólo un mapa. Se dice explícitamente en vez de
		inventar datos de contacto.
	-->
	<div
		class="mb-12 flex gap-3.5 border-l-4 border-[var(--color-achiote-500)] bg-[var(--superficie-alt)] p-5"
		role="note"
	>
		<svg
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
			class="mt-0.5 shrink-0 text-[var(--color-achiote-texto)]"
		>
			<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
			<path d="M12 11v5.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
			<circle cx="12" cy="7.6" r="1.2" fill="currentColor" />
		</svg>
		<p class="text-[0.92rem] leading-relaxed text-[var(--texto-suave)]">
			{data.contacto.nota}
		</p>
	</div>

	<div class="grid gap-12 lg:grid-cols-[1fr_20rem] lg:gap-16">
		<!-- Directorio -->
		<section>
			<h2 class="display mb-4 text-xl">Directorio por dirección</h2>

			<label class="mb-6 block">
				<span class="mb-2 block text-sm font-semibold">Buscar dirección, responsable o cargo</span>
				<input
					type="search"
					bind:value={consulta}
					placeholder="obras públicas, tesorería, riesgos…"
					class="h-11 w-full border border-[var(--borde)] bg-[var(--superficie-elevada)] px-3 text-[0.95rem] placeholder:text-[var(--texto-suave)]/70"
				/>
			</label>

			<p class="mb-4 text-sm text-[var(--texto-suave)]" role="status" aria-live="polite">
				{filtradas.length}
				{filtradas.length === 1 ? 'dirección' : 'direcciones'}
			</p>

			{#if filtradas.length === 0}
				<p class="border border-dashed border-[var(--borde)] p-10 text-center">
					No hay direcciones que coincidan con «{consulta}».
				</p>
			{:else}
				<ul class="space-y-1.5">
					{#each filtradas as d (d.slug)}
						<li>
							<details
								class="group border border-[var(--borde)] bg-[var(--superficie-elevada)]"
								open={Boolean(consulta)}
							>
								<summary
									class="flex cursor-pointer list-none items-center justify-between gap-4 p-4 font-semibold"
								>
									<span>
										{d.nombre}
										{#if d.responsable}
											<span class="block text-sm font-normal text-[var(--texto-suave)]">
												{d.responsable}
											</span>
										{/if}
									</span>
									<svg
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										aria-hidden="true"
										class="shrink-0 transition-transform group-open:rotate-180"
									>
										<path
											d="m6 9 6 6 6-6"
											stroke="currentColor"
											stroke-width="2.2"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
								</summary>

								<div class="border-t border-[var(--borde)] p-4">
									{#if d.mision}
										<p class="mb-4 text-sm leading-relaxed text-[var(--texto-suave)]">{d.mision}</p>
									{/if}

									{#if d.directorio_telefonico.length}
										<div class="overflow-x-auto">
											<table class="w-full text-sm">
												<thead>
													<tr class="text-left text-[var(--texto-suave)]">
														<th class="pb-2 font-semibold">Cargo</th>
														<th class="pb-2 font-semibold">Extensión</th>
													</tr>
												</thead>
												<tbody>
													{#each d.directorio_telefonico as e, i (i)}
														<tr class="border-t border-[var(--borde)]">
															<td class="py-2 pr-4">{e.cargo}</td>
															<td class="py-2 font-mono font-semibold">{e.extension}</td>
														</tr>
													{/each}
												</tbody>
											</table>
										</div>
									{:else}
										<p class="text-sm text-[var(--texto-suave)]">
											Sin directorio telefónico publicado.
										</p>
									{/if}
								</div>
							</details>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<!-- Canales -->
		<aside class="lg:sticky lg:top-24 lg:self-start">
			{#if data.contacto.correo}
				<h2 class="mb-2 text-sm font-bold">Correo institucional</h2>
				<p class="mb-6">
					<a
						href="mailto:{data.contacto.correo}"
						class="font-semibold text-[var(--enlace)] underline underline-offset-2"
					>
						{data.contacto.correo}
					</a>
				</p>
			{/if}

			<h2 class="mb-3 text-sm font-bold">Redes oficiales</h2>
			<ul class="mb-8 space-y-px">
				{#each data.contacto.redes_sociales as r (r.red)}
					<li>
						<a
							href={r.url}
							target="_blank"
							rel="noopener"
							class="block border-b border-[var(--borde)] py-2.5 text-sm no-underline hover:text-[var(--color-selva-800)]"
						>
							{NOMBRE_RED[r.red] ?? r.red}
						</a>
					</li>
				{/each}
			</ul>

			{#if data.contacto.mapa_embed_url}
				<h2 class="mb-3 text-sm font-bold">Ubicación</h2>
				<div class="tesela aspect-square w-full">
					<iframe
						src={data.contacto.mapa_embed_url}
						title="Mapa de ubicación del GAD Municipal de Francisco de Orellana"
						loading="lazy"
						referrerpolicy="no-referrer-when-downgrade"
						class="h-full w-full border-0"
					></iframe>
				</div>
			{/if}
		</aside>
	</div>
</div>
