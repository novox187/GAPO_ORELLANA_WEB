<script lang="ts">
	import { img, type PublicacionResumen } from '$lib/api';

	/**
	 * La cuadrícula del perfil, 3 columnas con 2px de separación. La retícula
	 * apretada es lo que hace que el archivo fotográfico municipal se lea
	 * como cuerpo de trabajo, no como galería suelta — el mismo efecto que
	 * en cualquier perfil de Instagram.
	 */
	let { publicaciones }: { publicaciones: PublicacionResumen[] } = $props();
</script>

<div class="grid grid-cols-3 gap-0.5">
	{#each publicaciones as p (p.id)}
		<a href={p.url} class="tesela group relative block aspect-square bg-[var(--superficie-alt)]">
			{#if p.imagen}
				<img
					src={img(p.imagen, 400)}
					alt={p.imagen.altPendiente ? '' : p.imagen.alt}
					loading="lazy"
					class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
				/>
			{/if}

			{#if (p.num_imagenes ?? 0) > 1}
				<span class="absolute top-1.5 right-1.5 text-white drop-shadow" aria-hidden="true">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
						<rect x="7" y="3" width="14" height="14" rx="1.5" stroke="currentColor" stroke-width="1.8" />
						<rect x="3" y="7" width="14" height="14" rx="1.5" fill="var(--superficie)" stroke="currentColor" stroke-width="1.8" />
					</svg>
					<span class="sr-only">Varias fotografías</span>
				</span>
			{/if}

			<span class="sr-only">
				{p.tipo === 'nota' ? p.titulo : p.pie}
			</span>
		</a>
	{/each}
</div>

{#if publicaciones.length === 0}
	<p class="py-16 text-center text-[0.9rem] text-[var(--texto-suave)]">Todavía no hay publicaciones.</p>
{/if}
