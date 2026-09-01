<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Seo from '$lib/components/Seo.svelte';
	import Marca from '$lib/components/Marca.svelte';
	import CambioTema from '$lib/components/CambioTema.svelte';
	import IconoEstudio, { type NombreIcono } from '$lib/components/estudio/IconoEstudio.svelte';
	import SelectorCuenta from '$lib/components/estudio/SelectorCuenta.svelte';
	import { sesionEstudio } from '$lib/sesionEstudio.svelte';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	/**
	 * El armazón del estudio.
	 *
	 * No hereda la cabecera ni el pie del sitio público, y es la decisión de
	 * fondo de toda esta interfaz. El sitio lo visita alguien una vez y
	 * necesita saber dónde está; el estudio lo abre la misma persona cada
	 * día y necesita llegar a lo suyo en un gesto. Meter aquí la navegación
	 * municipal —Trámites, Transparencia, El cantón— sería obligar a quien
	 * publica a pasar por delante de cinco secciones que no va a usar.
	 *
	 * En escritorio, riel a la izquierda; en móvil, barra inferior. Es el
	 * reparto de cualquier aplicación con la que se trabaja con una mano, y
	 * la razón es física: en un teléfono, la parte de arriba de la pantalla
	 * no se alcanza con el pulgar.
	 */
	$effect(() => {
		sesionEstudio.sincronizar(data.creador);
	});

	/**
	 * Sin sesión, a la pantalla de entrar. Se hace aquí y no con un `redirect`
	 * del `load` porque la sesión puede caducar mientras alguien está dentro
	 * —dura ocho horas— y entonces no hay ninguna navegación que interceptar:
	 * lo que hay es un estado que deja de ser verdad.
	 */
	$effect(() => {
		if (!sesionEstudio.autenticado && !enEntrada) {
			goto('/estudio/entrar', { replaceState: true });
		}
	});

	const enlaces: { href: string; texto: string; icono: NombreIcono }[] = [
		{ href: '/estudio', texto: 'Perfil', icono: 'perfil' },
		{ href: '/estudio/crear', texto: 'Publicar', icono: 'crear' },
		{ href: '/estudio/historia', texto: 'Historia', icono: 'historia' },
		{ href: '/estudio/estadisticas', texto: 'Estadísticas', icono: 'estadisticas' },
		{ href: '/estudio/ajustes', texto: 'Ajustes', icono: 'ajustes' }
	];

	const ruta = $derived(page.url.pathname);
	const enEntrada = $derived(ruta.startsWith('/estudio/entrar'));

	function activo(href: string): boolean {
		return href === '/estudio' ? ruta === '/estudio' : ruta.startsWith(href);
	}

	async function salir() {
		await sesionEstudio.salir();
		await goto('/estudio/entrar');
	}
</script>

<!-- El estudio no se indexa: no hay nada aquí que un buscador deba ofrecer. -->
<Seo titulo="Estudio" descripcion="Publicar en nombre del municipio." indexar={false} />

{#if enEntrada || !sesionEstudio.autenticado}
	<div class="entrada">
		{@render children()}
	</div>
{:else}
	<div class="estudio">
		<header class="barra-superior">
			<!-- `Marca` ya es un enlace a la portada: envolverla en otro `<a>`
			     anidaba dos enlaces, que es HTML inválido y deja al lector de
			     pantalla anunciando el mismo destino dos veces. -->
			<Marca alto="h-8" />
			<SelectorCuenta />
			<CambioTema />
		</header>

		<nav class="riel" aria-label="Estudio">
			<div class="marca-riel">
				<Marca alto="h-9" />
			</div>

			<ul>
				{#each enlaces as e (e.href)}
					<li>
						<a href={e.href} class="enlace" class:activo={activo(e.href)} aria-current={activo(e.href) ? 'page' : undefined}>
							<IconoEstudio nombre={e.icono} />
							<span>{e.texto}</span>
						</a>
					</li>
				{/each}
			</ul>

			<div class="pie-riel">
				<SelectorCuenta compacto />
				<button type="button" class="enlace" onclick={salir}>
					<IconoEstudio nombre="salir" />
					<span>Salir</span>
				</button>
			</div>
		</nav>

		<main id="contenido" class="lienzo">
			{@render children()}
		</main>

		<nav class="barra-inferior" aria-label="Estudio">
			{#each enlaces as e (e.href)}
				<a href={e.href} class="tecla" class:activo={activo(e.href)} aria-current={activo(e.href) ? 'page' : undefined}>
					<IconoEstudio nombre={e.icono} tamano={23} />
					<span>{e.texto}</span>
				</a>
			{/each}
		</nav>
	</div>
{/if}

<style>
	.entrada {
		min-height: 100dvh;
		display: grid;
		place-items: center;
		padding: 1.5rem;
	}

	.estudio {
		min-height: 100dvh;
		background: var(--superficie);
	}

	/* ─────────────────────────────── móvil ─────────────────────────────── */

	.barra-superior {
		position: sticky;
		top: 0;
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		height: 56px;
		padding-inline: 1rem;
		background: color-mix(in srgb, var(--superficie) 94%, transparent);
		backdrop-filter: blur(8px);
		border-bottom: var(--canto);
	}

	.lienzo {
		/* Hueco para la barra inferior, más el área segura del teléfono: sin
		   ella, el último botón de cualquier página queda debajo del
		   indicador de inicio de iOS y no se puede pulsar. */
		padding-bottom: calc(64px + env(safe-area-inset-bottom));
	}

	.barra-inferior {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 20;
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		padding-bottom: env(safe-area-inset-bottom);
		background: color-mix(in srgb, var(--superficie) 94%, transparent);
		backdrop-filter: blur(10px);
		border-top: var(--canto);
	}

	.tecla {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.15rem;
		/* 56px de alto: por debajo de 44 el dedo falla, y esto se pulsa
		   cientos de veces al día. */
		min-height: 56px;
		font-size: 0.62rem;
		color: var(--texto-suave);
		text-decoration: none;
		transition:
			color var(--transicion),
			transform 120ms var(--ease-suave);
	}

	.tecla.activo {
		color: var(--texto);
		font-weight: 700;
	}

	/* Filete sobre la pestaña activa: el mismo lenguaje que el riel de
	   escritorio, girado noventa grados. */
	.tecla.activo::before {
		content: '';
		position: absolute;
		top: 0;
		left: 22%;
		right: 22%;
		height: 2px;
		border-radius: 0 0 2px 2px;
		background: var(--marca);
	}

	/* Respuesta al dedo: el icono cede un poco al pulsar y vuelve. */
	.tecla:active {
		transform: scale(0.94);
	}

	@media (prefers-reduced-motion: reduce) {
		.tecla,
		.tecla:active,
		.enlace {
			transition: none;
			transform: none;
		}
	}

	.riel {
		display: none;
	}

	.marca-riel {
		display: none;
	}

	/* ────────────────────────────── escritorio ─────────────────────────── */

	@media (width >= 64rem) {
		.estudio {
			display: grid;
			grid-template-columns: 15rem 1fr;
		}

		.barra-superior,
		.barra-inferior {
			display: none;
		}

		.riel {
			display: flex;
			flex-direction: column;
			gap: 1.5rem;
			position: sticky;
			top: 0;
			height: 100dvh;
			padding: 1.5rem 1rem;
			border-right: var(--canto);
		}

		.marca-riel {
			display: block;
			padding-inline: 0.5rem;
		}

		.riel ul {
			display: flex;
			flex-direction: column;
			gap: 0.15rem;
			flex: 1;
		}

		.pie-riel {
			display: flex;
			flex-direction: column;
			gap: 0.5rem;
			border-top: var(--canto);
			padding-top: 1rem;
		}

		.lienzo {
			padding-bottom: 0;
			min-width: 0;
		}
	}

	.enlace {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.85rem;
		width: 100%;
		min-height: 46px;
		padding-inline: 0.7rem;
		border-radius: var(--radius-md);
		font-size: 0.92rem;
		color: var(--texto-suave);
		text-decoration: none;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		font-family: inherit;
		transition:
			background-color var(--transicion),
			color var(--transicion);
	}

	.enlace:hover {
		background: var(--superficie-alt);
		color: var(--texto);
	}

	/*
	  El destino actual: fondo propio y un filete de marca a la izquierda. El
	  color solo quedaba a merced del contraste del tema; una barra vertical
	  se lee de un vistazo en una lista de cinco.
	*/
	.enlace.activo {
		font-weight: 700;
		color: var(--texto);
		background: var(--superficie-alt);
	}

	.enlace.activo::before {
		content: '';
		position: absolute;
		left: 0;
		top: 8px;
		bottom: 8px;
		width: 3px;
		border-radius: 0 2px 2px 0;
		background: var(--marca);
	}

</style>
