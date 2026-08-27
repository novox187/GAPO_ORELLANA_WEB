<script lang="ts">
	import Migas from './Migas.svelte';
	import Pictograma, { type NombrePictograma } from './Pictograma.svelte';

	/**
	 * Cabecera de una página de "El cantón".
	 *
	 * Todas las sub-páginas abren igual —migas, título, entradilla— para que
	 * moverse entre ellas no obligue a reorientarse. Lo que cambia es el
	 * fondo: quien tiene una fotografía que valga la pena la usa a sangre;
	 * el resto cae en su tesela de color de marca, que es el mismo lenguaje
	 * pero sin fingir una foto que no existe.
	 */
	let {
		titulo,
		entradilla,
		picto,
		fondo,
		tinta,
		imagen = '',
		alt = ''
	}: {
		titulo: string;
		entradilla: string;
		picto: NombrePictograma;
		fondo: string;
		tinta: string;
		imagen?: string;
		alt?: string;
	} = $props();
</script>

<header class="cabecera {imagen ? 'con-foto' : `${fondo} ${tinta}`}">
	{#if imagen}
		<img src={imagen} {alt} class="foto" width="1600" height="900" fetchpriority="high" />
		<div class="velo" aria-hidden="true"></div>
	{:else}
		<Pictograma
			nombre={picto}
			clase="pointer-events-none absolute -right-10 -bottom-12 h-[16rem] w-auto opacity-[0.14] md:-right-14 md:h-[21rem]"
		/>
	{/if}

	<div class="contenedor relative pt-6 pb-9 md:pt-8 md:pb-14">
		<Migas
			tramos={[{ texto: 'Inicio', href: '/' }, { texto: 'El cantón', href: '/canton' }, { texto: titulo }]}
		/>

		<h1 class="display max-w-4xl text-[clamp(1.8rem,5vw,3.2rem)]">{titulo}</h1>
		<p class="mt-3 max-w-xl leading-relaxed opacity-85 md:text-[1.05rem]">{entradilla}</p>
	</div>
</header>

<style>
	.cabecera {
		position: relative;
		isolation: isolate;
		overflow: hidden;
	}

	/* Sobre fotografía la tinta es blanca fija: el fondo es la foto, no la
	   superficie del tema. */
	.cabecera.con-foto {
		color: #ffffff;
		background: #0a1410;
	}

	.foto {
		position: absolute;
		inset: 0;
		z-index: -1;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: 50% 45%;
	}

	.velo {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background:
			linear-gradient(
				to top,
				rgb(6 14 10 / 0.93) 0%,
				rgb(6 14 10 / 0.78) 45%,
				rgb(6 14 10 / 0.5) 100%
			),
			linear-gradient(100deg, rgb(6 14 10 / 0.75) 0%, rgb(6 14 10 / 0.35) 60%, transparent 100%);
	}

	/*
	   Las migas heredan la tinta de la cabecera, no el token del tema: sobre
	   una tesela de marca `--texto-suave` es un gris pensado para papel y se
	   queda muy por debajo del mínimo. Sin opacidad, que rebajaría el
	   contraste ya verificado del par fondo/tinta; la diferencia entre
	   enlace y página actual la marca el subrayado, no el color.
	*/
	/*
	   El color hay que ponerlo en el propio <nav>: Migas lleva
	   `text-[var(--texto-suave)]` como utilidad sobre ese elemento, y
	   heredarlo desde el <a> devolvería justamente el gris de papel que
	   queremos evitar. `.cabecera nav` gana por especificidad.
	*/
	.cabecera :global(nav) {
		color: inherit;
	}

	.cabecera :global(nav a) {
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-thickness: 1px;
	}

	.cabecera :global(nav a:hover) {
		text-decoration-thickness: 2px;
	}

	.cabecera :global(nav [aria-current='page']) {
		font-weight: 600;
	}

	/* El separador "/" es decorativo y va marcado aria-hidden. */
	.cabecera :global(nav [aria-hidden='true']) {
		opacity: 0.5;
	}
</style>
