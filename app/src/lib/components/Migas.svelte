<script lang="ts">
	/** Migas de pan con la ruta real de navegación; cada tramo es un enlace vivo. */
	let { tramos }: { tramos: { texto: string; href?: string }[] } = $props();
</script>

<nav aria-label="Ruta de navegación" class="mb-6 text-sm text-[var(--texto-suave)]">
	<ol class="flex flex-wrap items-center gap-x-1 gap-y-1">
		{#each tramos as t, i (t.texto)}
			<li class="flex items-center gap-x-1">
				{#if t.href}
					<a href={t.href} class="no-underline hover:underline">{t.texto}</a>
				{:else}
					<span aria-current="page" class="text-[var(--texto)]">{t.texto}</span>
				{/if}
				{#if i < tramos.length - 1}
					<span aria-hidden="true" class="mx-1 opacity-40">/</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>
