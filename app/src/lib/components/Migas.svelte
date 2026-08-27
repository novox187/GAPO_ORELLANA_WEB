<script lang="ts">
	/** Migas de pan con la ruta real de navegación; cada tramo es un enlace vivo. */
	let { tramos }: { tramos: { texto: string; href?: string }[] } = $props();
</script>

<nav aria-label="Ruta de navegación" class="mb-6 text-sm text-[var(--texto-suave)]">
	<ol class="flex flex-wrap items-center gap-x-1 gap-y-1">
		{#each tramos as t, i (t.texto)}
			<li class="flex items-center gap-x-1">
				{#if t.href}
					<!--
						min-h-6: el enlace medía 20 px de alto y en un teléfono se
						queda por debajo del mínimo de 24×24 que pide WCAG 2.5.8.
						La caja crece sin mover el texto ni la línea base.
					-->
					<a href={t.href} class="inline-flex min-h-6 items-center no-underline hover:underline"
						>{t.texto}</a
					>
				{:else}
					<span aria-current="page" class="inline-flex min-h-6 items-center text-[var(--texto)]"
						>{t.texto}</span
					>
				{/if}
				{#if i < tramos.length - 1}
					<span aria-hidden="true" class="mx-1 opacity-40">/</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>
