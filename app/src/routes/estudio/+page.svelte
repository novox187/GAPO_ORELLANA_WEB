<script lang="ts">
	import { img } from '$lib/api';
	import Avatar from '$lib/components/Avatar.svelte';
	import Insignia from '$lib/components/Insignia.svelte';
	import IconoEstudio from '$lib/components/estudio/IconoEstudio.svelte';
	import CuadriculaEstudio from '$lib/components/estudio/CuadriculaEstudio.svelte';
	import Destacadas from '$lib/components/estudio/Destacadas.svelte';
	import { estudio, cifra, type PublicacionEstudio } from '$lib/estudio';
	import { sesionEstudio } from '$lib/sesionEstudio.svelte';

	/**
	 * El perfil, tal y como lo ve quien publica en él.
	 *
	 * Es la misma cabecera que ve la ciudadanía —avatar, nombre, tres cifras,
	 * destacadas, cuadrícula de tres columnas— y encima, sólo aquí, lo que no
	 * es público: los borradores y las publicaciones donde otra dirección
	 * etiquetó a esta cuenta.
	 *
	 * **La pestaña «Guardado» no está aquí, y su ausencia es deliberada.**
	 * Guardar es privado de una persona, y quien entra al estudio lo hace en
	 * nombre de una institución: enseñar en el perfil de la Alcaldía lo que
	 * guardó la jefa de Comunicación mezclaría dos identidades que el resto
	 * del sistema mantiene separadas a propósito. La colección guardada
	 * existe —está en el sitio público, en «Mi cuenta»— y pertenece a la
	 * cuenta ciudadana de cada persona. El estante equivalente aquí, «lo que
	 * todavía no ve nadie», es Borradores.
	 */
	type Pestana = 'publicaciones' | 'borradores' | 'etiquetada';

	let pestana = $state<Pestana>('publicaciones');
	let publicaciones = $state<PublicacionEstudio[]>([]);
	let cursor = $state<number | null>(null);
	let cargando = $state(true);
	let error = $state<string | null>(null);
	let centinela = $state<HTMLElement | null>(null);

	const cuenta = $derived(sesionEstudio.cuenta);

	const pestanas: { id: Pestana; texto: string }[] = [
		{ id: 'publicaciones', texto: 'Publicaciones' },
		{ id: 'borradores', texto: 'Borradores' },
		{ id: 'etiquetada', texto: 'Etiquetada' }
	];

	/** Recarga al cambiar de cuenta o de pestaña. */
	$effect(() => {
		const alias = cuenta?.alias;
		const cual = pestana;

		if (!alias) return;

		let vigente = true;
		cargando = true;
		error = null;

		(async () => {
			try {
				if (cual === 'etiquetada') {
					const { data } = await estudio.etiquetada(alias);
					if (!vigente) return;
					publicaciones = data;
					cursor = null;
				} else {
					const r = await estudio.publicaciones(alias, null, cual === 'borradores' ? 'borrador' : undefined);
					if (!vigente) return;
					publicaciones = cual === 'borradores' ? r.data : r.data.filter((p) => p.estado === 'publicado');
					cursor = r.meta.siguiente_cursor;
				}
			} catch (e) {
				if (vigente) error = e instanceof Error ? e.message : 'No se pudo cargar.';
			} finally {
				if (vigente) cargando = false;
			}
		})();

		return () => {
			vigente = false;
		};
	});

	async function cargarMas() {
		const alias = cuenta?.alias;
		if (!alias || cargando || cursor === null || pestana === 'etiquetada') return;

		cargando = true;

		try {
			const r = await estudio.publicaciones(alias, cursor, pestana === 'borradores' ? 'borrador' : undefined);
			const nuevas = pestana === 'borradores' ? r.data : r.data.filter((p) => p.estado === 'publicado');
			publicaciones = [...publicaciones, ...nuevas];
			cursor = r.meta.siguiente_cursor;
		} finally {
			cargando = false;
		}
	}

	/** Scroll infinito: el centinela va 600 px por debajo del final visible. */
	$effect(() => {
		const nodo = centinela;
		if (!nodo) return;

		const obs = new IntersectionObserver((e) => e[0]?.isIntersecting && cargarMas(), {
			rootMargin: '600px 0px'
		});
		obs.observe(nodo);

		return () => obs.disconnect();
	});
</script>

{#if cuenta}
	<div class="perfil">
		{#if cuenta.portada}
			<div class="portada">
				<img src={img(cuenta.portada, 1600)} alt="" />
			</div>
		{/if}

		<header class="cabecera">
			<div class="retrato">
				<Avatar {cuenta} tamano={88} conAnillo={cuenta.tiene_historias_activas} />
			</div>

			<div class="ficha">
				<div class="fila-nombre">
					<h1>
						{cuenta.nombre}
						{#if cuenta.verificada}<Insignia tamano={16} />{/if}
					</h1>

					<!--
						Tres acciones, tres pesos. Antes eran tres rectángulos
						idénticos y la pantalla no decía cuál es la que se usa a
						diario: editar el perfil es la de esta pantalla, las
						estadísticas viven en su propia sección y «ver como
						ciudadano» es una comprobación, no una tarea.
					-->
					<div class="acciones">
						<a href="/estudio/ajustes" class="boton principal">Editar perfil</a>
						<a href="/estudio/estadisticas" class="boton">Estadísticas</a>
						<a href="/noticias/perfil/{cuenta.alias}" class="boton fantasma" target="_blank" rel="noopener">
							<IconoEstudio nombre="perfil" tamano={15} />
							Ver como ciudadano
						</a>
					</div>
				</div>

				<p class="alias">@{cuenta.alias}</p>

				<!--
					Las tres cifras del perfil. Son filas reales: publicaciones
					publicadas, ciudadanos y cuentas que siguen a ésta, y cuentas
					a las que ésta sigue. Ninguna es una estimación.
				-->
				<ul class="cifras">
					<li><strong>{cifra(cuenta.publicaciones_contador)}</strong> <span>publicaciones</span></li>
					<li><strong>{cifra(cuenta.seguidores_contador)}</strong> <span>seguidores</span></li>
					<li><strong>{cifra(cuenta.seguidos_contador)}</strong> <span>seguidos</span></li>
				</ul>

				{#if cuenta.biografia}
					<p class="bio">{cuenta.biografia}</p>
				{/if}

				{#if cuenta.enlace_url}
					<a class="enlace" href={cuenta.enlace_url} target="_blank" rel="noopener">
						{cuenta.enlace_url.replace(/^https?:\/\//, '')}
					</a>
				{/if}
			</div>
		</header>

		<Destacadas alias={cuenta.alias} />

		<nav class="pestanas" aria-label="Contenido del perfil">
			{#each pestanas as p (p.id)}
				<button
					type="button"
					class="pestana"
					class:activa={pestana === p.id}
					aria-current={pestana === p.id ? 'true' : undefined}
					onclick={() => (pestana = p.id)}
				>
					{p.texto}
				</button>
			{/each}
		</nav>

		{#if error}
			<p class="aviso" role="alert">{error}</p>
		{:else}
			<CuadriculaEstudio
				{publicaciones}
				{cargando}
				vacio={pestana === 'borradores'
					? 'No hay borradores. Lo que empieces y no publiques aparecerá aquí.'
					: pestana === 'etiquetada'
						? 'Ninguna otra dirección ha etiquetado a esta cuenta todavía.'
						: 'Todavía no hay publicaciones. Empieza por la primera.'}
			/>

			{#if cursor !== null}
				<div bind:this={centinela} class="centinela">
					<button type="button" onclick={cargarMas} class="boton">
						{cargando ? 'Cargando…' : 'Cargar más'}
					</button>
				</div>
			{/if}
		{/if}

		<a href="/estudio/crear" class="flotante" aria-label="Crear una publicación">
			<IconoEstudio nombre="mas" tamano={26} />
		</a>
	</div>
{/if}

<style>
	.perfil {
		max-width: 58rem;
		margin-inline: auto;
		padding-bottom: 3rem;
	}

	.portada {
		aspect-ratio: 3 / 1;
		background: var(--superficie-alt);
	}

	.portada img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.cabecera {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 1.25rem 1.5rem;
		/* El aire de abajo lo pone la fila de destacadas, que empieza con el
		   suyo: sumar los dos dejaba un hueco muerto entre la biografía y el
		   primer círculo. */
		padding: 1.25rem 1rem 0.5rem;
	}

	.ficha {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-width: 0;
	}

	.fila-nombre {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem 1rem;
	}

	h1 {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 1.15rem;
		font-weight: 700;
	}

	.alias {
		font-size: 0.85rem;
		color: var(--texto-suave);
	}

	.acciones {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.boton {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 36px;
		padding-inline: 0.9rem;
		border: var(--canto);
		border-radius: var(--radius-md);
		background: var(--superficie-elevada);
		color: var(--texto);
		font-family: inherit;
		font-size: 0.82rem;
		font-weight: 600;
		text-decoration: none;
		cursor: pointer;
		box-shadow: var(--elev-1);
		transition:
			border-color var(--transicion),
			box-shadow var(--transicion),
			transform 120ms var(--ease-suave);
	}

	.boton:hover {
		border-color: var(--marca);
		box-shadow: var(--elev-2);
	}

	.boton:active {
		transform: scale(0.98);
		box-shadow: var(--elev-1);
	}

	.boton.principal {
		border-color: transparent;
		background: var(--color-achiote-500);
		color: var(--color-carbon-900);
	}

	.boton.principal:hover {
		border-color: transparent;
		background: var(--color-achiote-400);
	}

	/* Sin recuadro ni sombra: es una comprobación, no una tarea, y con el
	   filete puesto competía con las otras dos por la misma atención. */
	.boton.fantasma {
		gap: 0.4rem;
		border-color: transparent;
		background: none;
		box-shadow: none;
		color: var(--texto-suave);
	}

	.boton.fantasma:hover {
		border-color: transparent;
		box-shadow: none;
		color: var(--texto);
	}

	.cifras {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 1.5rem;
		font-size: 0.88rem;
		color: var(--texto-suave);
	}

	.cifras strong {
		color: var(--texto);
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.bio {
		font-size: 0.9rem;
		line-height: 1.5;
		max-width: 40rem;
	}

	.enlace {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--enlace);
		width: fit-content;
	}

	.pestanas {
		display: flex;
		justify-content: center;
		gap: 0.25rem;
		margin-top: 0.75rem;
		border-top: var(--canto);
	}

	.pestana {
		position: relative;
		min-height: 48px;
		transition: color var(--transicion);
		/* En un teléfono de 390 px los tres rótulos en versalitas rozan los
		   bordes con 1rem de aire a cada lado. */
		padding-inline: 0.55rem;
		border: none;
		background: none;
		color: var(--texto-suave);
		font-family: inherit;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
	}

	.pestana.activa {
		color: var(--texto);
	}

	/* La pestaña activa se marca con un filete arriba, como en cualquier
	   perfil: el borde superior es lo que la ata a la línea de separación. */
	.pestana.activa::before {
		content: '';
		position: absolute;
		top: -1px;
		left: 0;
		right: 0;
		height: 2px;
		background: var(--marca);
	}

	@media (width >= 30rem) {
		.pestana {
			padding-inline: 1rem;
		}
	}

	.centinela {
		display: flex;
		justify-content: center;
		padding: 1.5rem 0;
	}

	.aviso {
		padding: 2rem 1rem;
		text-align: center;
		font-size: 0.9rem;
		color: var(--color-error);
	}

	/*
	  Botón flotante de publicar, sólo en móvil: en escritorio el riel ya
	  tiene «Publicar» siempre a la vista y este quedaría duplicando un
	  destino que no se ha ido a ninguna parte.
	*/
	.flotante {
		position: fixed;
		right: 1rem;
		bottom: calc(76px + env(safe-area-inset-bottom));
		z-index: 15;
		display: grid;
		place-items: center;
		width: 56px;
		height: 56px;
		border-radius: 999px;
		background: var(--color-achiote-500);
		color: var(--color-carbon-900);
		box-shadow: var(--elev-3);
		transition: transform 120ms var(--ease-suave);
	}

	.flotante:active {
		transform: scale(0.93);
	}

	@media (width >= 64rem) {
		.flotante {
			display: none;
		}

		.cabecera {
			padding-inline: 2rem;
			gap: 1.25rem 2.5rem;
		}
	}

	/*
	  Por debajo de 30rem (~480px) el diseño de dos columnas de arriba —avatar
	  a la izquierda, todo lo demás apretado en la columna que sobra— dejaba
	  de caber: «Editar perfil», «Estadísticas» y «Ver como ciudadano» se
	  partían en dos filas desiguales dentro de apenas 255px, con el avatar
	  flotando solo a la izquierda y un hueco vacío debajo.

	  Aquí se reordena con áreas de grid con nombre, como el propio perfil de
	  Instagram en el teléfono: avatar y cifras comparten la primera fila:
	  el resto —nombre, alias, biografía, botones— pasa a ocupar el ancho
	  completo debajo, en vez de competir por los mismos 255px que el avatar.

	  `.ficha` y `.fila-nombre` sólo existen para agrupar en el HTML; en este
	  ancho se anulan con `display: contents` para que sus hijos —h1,
	  .acciones, .alias, .cifras, .bio, .enlace— pasen a ser hijos directos
	  del grid de `.cabecera` y puedan colocarse por separado. Ninguno pierde
	  su propio `display` interno: `.acciones` sigue siendo flex por dentro,
	  sólo cambia dónde se sitúa la caja que lo contiene.
	*/
	@media (prefers-reduced-motion: reduce) {
		.boton,
		.boton:hover,
		.boton:active,
		.flotante,
		.flotante:active,
		.pestana {
			transition: none;
			transform: none;
		}
	}

	@media (width < 30rem) {
		.cabecera {
			grid-template-columns: auto 1fr;
			grid-template-areas:
				'retrato cifras'
				'nombre nombre'
				'alias alias'
				'bio bio'
				'enlace enlace'
				'acciones acciones';
			row-gap: 0.6rem;
			column-gap: 1rem;
			align-items: start;
		}

		.ficha,
		.fila-nombre {
			display: contents;
		}

		.retrato {
			grid-area: retrato;
		}

		.retrato :global(.avatar) {
			--tamano: 72px !important;
		}

		h1 {
			grid-area: nombre;
		}

		.alias {
			grid-area: alias;
		}

		.bio {
			grid-area: bio;
		}

		.enlace {
			grid-area: enlace;
		}

		/*
		  Las cifras, junto al avatar: números encima, etiqueta debajo, como
		  en cualquier perfil de Instagram visto en el teléfono. En fila —«280
		  publicaciones»— no cabían las tres sin partirse en dos líneas dentro
		  de una columna de apenas 255px.
		*/
		.cifras {
			grid-area: cifras;
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			gap: 0;
			align-self: center;
			text-align: center;
		}

		.cifras li {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 0.1rem;
		}

		.cifras strong {
			font-size: 1rem;
		}

		.cifras span {
			font-size: 0.72rem;
		}

		/*
		  Los botones, a todo el ancho y no apretados junto al avatar: dos
		  columnas iguales y el tercero —«Ver como ciudadano», siempre el
		  último— ocupando la fila entera debajo. Si se añade un cuarto botón,
		  hay que revisar este `:last-child`.
		*/
		.acciones {
			grid-area: acciones;
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0.5rem;
		}

		.acciones > :last-child {
			grid-column: 1 / -1;
		}

		.boton {
			padding-inline: 0.5rem;
		}
	}
</style>
