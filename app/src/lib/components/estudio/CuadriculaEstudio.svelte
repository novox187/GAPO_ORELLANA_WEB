<script lang="ts">
	import { img } from '$lib/api';
	import IconoEstudio from './IconoEstudio.svelte';
	import type { PublicacionEstudio } from '$lib/estudio';

	/**
	 * La cuadrícula del perfil desde el estudio: tres columnas, 2 px de
	 * separación, igual que la que ve la ciudadanía.
	 *
	 * Lo que cambia es que cada tesela enlaza a las estadísticas de esa
	 * publicación en vez de a la publicación, y que los borradores se
	 * distinguen sin salir de la retícula: en gris apagado y con su rótulo.
	 * Ponerlos en una lista aparte los convertiría en un cajón que nadie
	 * abre; aquí se ven junto a lo que sí salió.
	 */
	let {
		publicaciones,
		cargando = false,
		vacio = 'Todavía no hay nada aquí.'
	}: {
		publicaciones: PublicacionEstudio[];
		cargando?: boolean;
		vacio?: string;
	} = $props();
</script>

{#if publicaciones.length === 0 && cargando}
	<!-- Esqueleto con la forma exacta de la cuadrícula: la página no salta
	     cuando llegan los datos. -->
	<div class="rejilla" aria-hidden="true">
		{#each { length: 9 } as _, i (i)}
			<span class="hueco esqueleto"></span>
		{/each}
	</div>
	<p class="sr-only" role="status">Cargando publicaciones…</p>
{:else if publicaciones.length === 0}
	<p class="vacio">{vacio}</p>
{:else}
	<div class="rejilla">
		{#each publicaciones as p (p.id)}
			<a href="/estudio/publicacion/{p.id}" class="tesela" class:borrador={p.estado === 'borrador'}>
				{#if p.imagen}
					<img
						src={img(p.imagen, 400)}
						alt={p.imagen.altPendiente ? '' : p.imagen.alt}
						loading="lazy"
					/>
				{:else}
					<span class="sin-foto"><IconoEstudio nombre="imagen" tamano={26} /></span>
				{/if}

				<span class="marcas" aria-hidden="true">
					{#if p.fijada}<span class="marca"><IconoEstudio nombre="fijar" tamano={15} /></span>{/if}
					{#if (p.num_imagenes ?? 0) > 1}<span class="marca varias"></span>{/if}
				</span>

				{#if p.estado === 'borrador'}
					<span class="rotulo">Borrador</span>
				{/if}

				<!-- Los recuentos aparecen al pasar por encima, como en cualquier
				     perfil, y siempre están en el texto accesible de abajo. -->
				<span class="velo">
					<span>{p.reacciones_contador} ♥</span>
					<span>{p.comentarios_contador} ✎</span>
				</span>

				<span class="sr-only">
					{p.tipo === 'nota' ? p.titulo : p.pie || 'Publicación sin pie'} —
					{p.estado === 'borrador' ? 'borrador' : 'publicada'},
					{p.reacciones_contador} reacciones, {p.comentarios_contador} comentarios
				</span>
			</a>
		{/each}
	</div>
{/if}

<style>
	.rejilla {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		/* 3px en vez de 2: con más aire la retícula se lee como cuerpo de
		   trabajo y no como una hoja de contactos apretada. */
		gap: 3px;
	}

	.tesela,
	.hueco {
		position: relative;
		display: block;
		aspect-ratio: 1;
		overflow: hidden;
		background: var(--superficie-alt);
	}

	.tesela img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.3s var(--ease-suave);
	}

	.tesela:hover img {
		transform: scale(1.04);
	}

	.borrador img {
		filter: grayscale(0.85);
		opacity: 0.65;
	}

	.sin-foto {
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		color: var(--texto-suave);
	}

	.marcas {
		position: absolute;
		top: 6px;
		right: 6px;
		display: flex;
		gap: 4px;
		color: #fff;
		filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.5));
	}

	.marca.varias {
		display: block;
		width: 13px;
		height: 13px;
		border: 1.8px solid currentColor;
		border-radius: 2px;
		box-shadow: -3px 3px 0 -1.8px var(--superficie), -3px 3px 0 0 currentColor;
	}

	.rotulo {
		position: absolute;
		left: 6px;
		bottom: 6px;
		padding: 0.1rem 0.4rem;
		background: var(--color-carbon-900);
		color: var(--color-achiote-400);
		font-size: 0.6rem;
		font-weight: 800;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.velo {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.1rem;
		/* Degradado desde abajo en vez de un velo plano: los recuentos se
		   leen sobre él sin apagar la fotografía entera. */
		background: linear-gradient(to top, rgb(0 0 0 / 0.72), rgb(0 0 0 / 0.15));
		color: #fff;
		font-size: 0.82rem;
		font-weight: 700;
		opacity: 0;
		transition: opacity var(--transicion);
	}

	.tesela:hover .velo,
	.tesela:focus-visible .velo {
		opacity: 1;
	}

	.esqueleto {
		animation: respiro 1.8s ease-in-out infinite;
	}

	@keyframes respiro {
		0%,
		100% {
			opacity: 0.5;
		}
		50% {
			opacity: 1;
		}
	}

	.vacio {
		padding: 3.5rem 1.5rem;
		text-align: center;
		font-size: 0.9rem;
		line-height: 1.6;
		color: var(--texto-suave);
	}

	@media (prefers-reduced-motion: reduce) {
		.tesela img,
		.velo {
			transition: none;
		}

		.esqueleto {
			animation: none;
		}
	}
</style>
