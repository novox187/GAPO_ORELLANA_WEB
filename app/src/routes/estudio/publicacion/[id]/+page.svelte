<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { img } from '$lib/api';
	import IconoEstudio from '$lib/components/estudio/IconoEstudio.svelte';
	import TarjetaCifra from '$lib/components/estudio/TarjetaCifra.svelte';
	import GraficoSerie from '$lib/components/estudio/GraficoSerie.svelte';
	import SelectorPeriodo from '$lib/components/estudio/SelectorPeriodo.svelte';
	import AvisoCobertura from '$lib/components/estudio/AvisoCobertura.svelte';
	import { estudio, cifra, ErrorEstudio, type MetricasPublicacion, type PublicacionEstudio } from '$lib/estudio';
	import { sesionEstudio } from '$lib/sesionEstudio.svelte';

	/**
	 * La ficha de una publicación desde dentro: cómo fue y qué se puede hacer
	 * con ella.
	 *
	 * La comparación con la media de la cuenta va arriba y no al final: un
	 * número suelto —«412 de alcance»— no dice si fue bien o mal, y quien
	 * publica necesita esa respuesta, no el dato en bruto.
	 */
	const id = $derived(Number(page.params.id));

	let dias = $state(30);
	let publicacion = $state<PublicacionEstudio | null>(null);
	let metricas = $state<MetricasPublicacion | null>(null);
	let cargando = $state(true);
	let error = $state<string | null>(null);
	let trabajando = $state(false);

	$effect(() => {
		const cual = id;
		const ventana = dias;

		if (!cual) return;

		let vigente = true;
		cargando = true;

		estudio
			.metricasDe(cual, ventana)
			.then((r) => {
				if (!vigente) return;
				metricas = r.data;
				publicacion = r.publicacion;
			})
			.catch((e) => vigente && (error = e instanceof Error ? e.message : 'No se pudo cargar.'))
			.finally(() => vigente && (cargando = false));

		return () => {
			vigente = false;
		};
	});

	/**
	 * Cuánto se separó del alcance medio de la cuenta.
	 *
	 * No se enseña cuando esta publicación todavía no alcanzó a nadie. Un
	 * «100 % menos que la media» sobre algo publicado hace un minuto es
	 * cierto y a la vez completamente engañoso: no dice que fuera mal, dice
	 * que aún no ha pasado nada. Sin comparación, las cifras a cero de arriba
	 * ya cuentan eso sin insinuar un fracaso.
	 */
	const comparacion = $derived.by(() => {
		const media = metricas?.referencia.alcance_medio_de_la_cuenta;
		const propio = metricas?.cifras.alcance.valor;

		if (!media || !propio) return null;

		return Math.round(((propio - media) / media) * 100);
	});

	async function accion(cual: 'fijar' | 'desfijar' | 'retirar' | 'republicar') {
		if (!publicacion || trabajando) return;

		trabajando = true;
		error = null;

		try {
			const r =
				cual === 'fijar'
					? await estudio.fijar(publicacion.id, true)
					: cual === 'desfijar'
						? await estudio.fijar(publicacion.id, false)
						: cual === 'retirar'
							? await estudio.retirar(publicacion.id)
							: await estudio.actualizar(publicacion.id, { estado: 'publicado' });

			publicacion = r.data;
			await sesionEstudio.refrescar();
		} catch (e) {
			error = e instanceof ErrorEstudio ? e.primero() : 'No se pudo completar la acción.';
		} finally {
			trabajando = false;
		}
	}

	const CIFRAS = [
		{ clave: 'alcance', rotulo: 'Alcance', ayuda: 'Personas distintas que la vieron.' },
		{ clave: 'impresiones', rotulo: 'Impresiones', ayuda: 'Veces que apareció en pantalla.' },
		{ clave: 'visitas', rotulo: 'Visitas', ayuda: 'Veces que se abrió entera.' },
		{ clave: 'reacciones', rotulo: 'Reacciones', ayuda: 'Corazones en el periodo.' },
		{ clave: 'comentarios', rotulo: 'Comentarios', ayuda: 'Comentarios en el periodo.' },
		{ clave: 'compartidos', rotulo: 'Compartidos', ayuda: 'Veces que se compartió el enlace.' },
		{ clave: 'guardados', rotulo: 'Guardados', ayuda: 'Veces que alguien la guardó.' },
		{ clave: 'reproducciones', rotulo: 'Reproducciones', ayuda: 'Vídeo visto más de tres segundos.' }
	] as const;
</script>

<div class="ficha">
	<header class="cabecera">
		<button type="button" class="icono" onclick={() => goto('/estudio')} aria-label="Volver al perfil">
			<IconoEstudio nombre="atras" />
		</button>
		<h1>Cómo fue</h1>
		<SelectorPeriodo bind:dias />
	</header>

	{#if error}
		<p class="error" role="alert">{error}</p>
	{/if}

	{#if publicacion}
		<section class="pieza">
			<div class="miniatura">
				{#if publicacion.imagen}
					<img src={img(publicacion.imagen, 800)} alt={publicacion.imagen.alt} />
				{:else}
					<IconoEstudio nombre="imagen" tamano={28} />
				{/if}
			</div>

			<div class="datos">
				<p class="estado" class:borrador={publicacion.estado === 'borrador'}>
					{publicacion.estado === 'borrador' ? 'Borrador — no se ve en el sitio' : 'Publicada'}
					{#if publicacion.fijada}<span class="fijada">· fijada en el perfil</span>{/if}
				</p>

				<p class="texto">
					{publicacion.tipo === 'nota' ? publicacion.titulo : publicacion.pie || 'Sin pie'}
				</p>

				{#if publicacion.ubicacion}
					<p class="meta"><IconoEstudio nombre="ubicacion" tamano={14} />{publicacion.ubicacion.nombre}</p>
				{/if}

				{#if publicacion.etiquetadas?.length}
					<p class="meta">
						<IconoEstudio nombre="etiqueta" tamano={14} />
						{publicacion.etiquetadas.map((e) => e.nombre).join(', ')}
					</p>
				{/if}

				<div class="acciones">
					<!-- Editar va la primera y en las dos ramas: corregir una errata
					     es lo que más se hace con una publicación ya escrita, y
					     hasta ahora obligaba a salir del estudio y abrir el panel. -->
					<a class="boton principal" href="/estudio/publicacion/{publicacion.id}/editar">Editar</a>

					{#if publicacion.estado === 'publicado'}
						<a class="boton" href={publicacion.url}>Ver en el sitio</a>
						<button type="button" class="boton" onclick={() => accion(publicacion!.fijada ? 'desfijar' : 'fijar')}>
							{publicacion.fijada ? 'Dejar de fijar' : 'Fijar en el perfil'}
						</button>
						<button type="button" class="boton" onclick={() => accion('retirar')}>Retirar del sitio</button>
					{:else}
						<button type="button" class="boton" onclick={() => accion('republicar')}>
							Publicar
						</button>
					{/if}
				</div>

				{#if publicacion.estado === 'publicado'}
					<p class="nota">
						Retirar no borra: la devuelve a borrador. Lo que estuvo público en un sitio de gobierno
						tiene que poder consultarse después.
					</p>
				{/if}
			</div>
		</section>

		{#if metricas}
			<AvisoCobertura cobertura={metricas.cobertura} {dias} />

			{#if comparacion !== null}
				<p class="comparacion" class:mejor={comparacion >= 0}>
					{#if comparacion >= 0}
						Llegó a un <strong>{comparacion} % más</strong> de gente que la publicación media de esta
						cuenta en el mismo periodo.
					{:else}
						Llegó a un <strong>{Math.abs(comparacion)} % menos</strong> de gente que la publicación
						media de esta cuenta en el mismo periodo.
					{/if}
				</p>
			{/if}

			<div class="tarjetas">
				{#each CIFRAS as c (c.clave)}
					<TarjetaCifra rotulo={c.rotulo} dato={metricas.cifras[c.clave]} ayuda={c.ayuda} />
				{/each}
			</div>

			{#if metricas.tasa_interaccion !== null}
				<p class="tasa">
					Tasa de interacción: <strong>{metricas.tasa_interaccion.toLocaleString('es-EC')} %</strong>
					de quienes la vieron hicieron algo con ella.
				</p>
			{/if}

			<section class="grafico">
				<GraficoSerie
					titulo="Día a día"
					puntos={metricas.series.alcance}
					contexto={metricas.series.impresiones}
					nombre="Alcance"
					nombreContexto="Impresiones"
				/>
			</section>

			<p class="totales">
				En total desde que se publicó:
				<strong>{cifra(publicacion.reacciones_contador)}</strong> reacciones y
				<strong>{cifra(publicacion.comentarios_contador)}</strong> comentarios. Los de arriba son
				sólo los del periodo elegido.
			</p>
		{/if}
	{:else if cargando}
		<p class="cargando" role="status">Cargando…</p>
	{/if}
</div>

<style>
	.ficha {
		max-width: 52rem;
		margin-inline: auto;
		padding: 0 1rem 3rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.cabecera {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding-block: 0.5rem;
		margin-inline: -1rem;
		padding-inline: 0.5rem 1rem;
		border-bottom: 1px solid var(--borde);
	}

	h1 {
		flex: 1;
		font-size: 1rem;
		font-weight: 700;
	}

	.icono {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border: none;
		background: none;
		color: var(--texto);
		cursor: pointer;
	}

	.pieza {
		display: grid;
		grid-template-columns: 92px 1fr;
		gap: 1rem;
	}

	.miniatura {
		display: grid;
		place-items: center;
		aspect-ratio: 1;
		overflow: hidden;
		background: var(--superficie-alt);
		color: var(--texto-suave);
	}

	.miniatura img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.datos {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		min-width: 0;
	}

	.estado {
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--marca);
	}

	.estado.borrador {
		color: var(--acento-texto);
	}

	.fijada {
		font-weight: 400;
		text-transform: none;
		letter-spacing: 0;
		color: var(--texto-suave);
	}

	.texto {
		font-size: 0.95rem;
		line-height: 1.45;
	}

	.meta {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.8rem;
		color: var(--texto-suave);
	}

	.acciones {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.35rem;
	}

	.boton {
		display: inline-flex;
		align-items: center;
		min-height: 34px;
		padding-inline: 0.75rem;
		border: 1px solid var(--borde);
		background: var(--superficie);
		color: var(--texto);
		font-family: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		text-decoration: none;
		cursor: pointer;
	}

	.boton:hover {
		border-color: var(--marca);
	}

	.boton.principal {
		background: var(--color-achiote-500);
		border-color: var(--color-achiote-500);
		color: var(--color-carbon-900);
	}

	.comparacion {
		padding: 0.7rem 0.85rem;
		border-left: 3px solid var(--viz-contexto);
		background: var(--superficie-alt);
		font-size: 0.88rem;
		line-height: 1.55;
	}

	.comparacion.mejor {
		border-left-color: var(--viz-acento);
	}

	.tarjetas {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
		gap: 0.6rem;
	}

	.grafico {
		padding: 1rem;
		border: 1px solid var(--borde);
	}

	.tasa,
	.totales,
	.nota,
	.cargando {
		font-size: 0.84rem;
		line-height: 1.55;
		color: var(--texto-suave);
	}

	.nota {
		font-size: 0.76rem;
	}

	.error {
		padding: 0.7rem 0.85rem;
		border-left: 3px solid var(--color-error);
		background: var(--superficie-alt);
		font-size: 0.85rem;
		color: var(--color-error);
	}
</style>
