<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { img } from '$lib/api';
	import IconoEstudio from '$lib/components/estudio/IconoEstudio.svelte';
	import EditorFoto from '$lib/components/estudio/EditorFoto.svelte';
	import CampoUbicacion from '$lib/components/estudio/CampoUbicacion.svelte';
	import CampoEtiquetas from '$lib/components/estudio/CampoEtiquetas.svelte';
	import FilaEstudio from '$lib/components/estudio/FilaEstudio.svelte';
	import { estudio, ErrorEstudio, type PublicacionEstudio } from '$lib/estudio';
	import { sesionEstudio } from '$lib/sesionEstudio.svelte';
	import type { PageData } from './$types';

	/**
	 * Editar una publicación ya creada.
	 *
	 * Faltaba, y su ausencia empujaba al panel: una errata en un pie de foto
	 * obligaba a salir del estudio y abrir el editor Livewire, que es la otra
	 * puerta a las mismas reglas. Con esto el reparto queda limpio — el
	 * contenido se hace y se corrige en el estudio; el panel administra el
	 * sitio— y `RedactorPublicaciones` sigue siendo el único sitio donde
	 * viven las reglas, porque las dos puertas pasan por él.
	 *
	 * Los campos son los mismos que los de la pantalla de escribir del
	 * compositor, y a propósito: una publicación no tiene una forma cuando
	 * nace y otra cuando se corrige.
	 */
	let { data }: { data: PageData } = $props();

	const id = $derived(Number(page.params.id));

	let publicacion = $state<PublicacionEstudio | null>(null);
	let cargando = $state(true);
	let guardando = $state(false);
	let error = $state<string | null>(null);

	let tipo = $state<'breve' | 'nota'>('breve');
	let pie = $state('');
	let titulo = $state('');
	let resumen = $state('');
	let cuerpo = $state('');
	let ubicacion = $state('');
	let etiquetas = $state<string[]>([]);
	let permiteComentarios = $state(true);
	let permiteReacciones = $state(true);

	/** Los uid de las imágenes, en el orden en que se publican. */
	let imagenes = $state<{ uid: string; url: string }[]>([]);

	/** La fotografía que se está encuadrando antes de añadirla. */
	let anadiendo = $state<File | null>(null);
	let recortada = $state<Blob | null>(null);
	let subiendo = $state(false);

	const cuenta = $derived(sesionEstudio.cuenta);

	$effect(() => {
		const cual = id;
		if (!cual) return;

		let vigente = true;
		cargando = true;

		estudio
			.publicacion(cual)
			.then(({ data: p }) => {
				if (!vigente) return;

				publicacion = p;
				tipo = p.tipo;
				pie = p.pie ?? '';
				titulo = p.titulo ?? '';
				resumen = p.resumen ?? '';
				cuerpo = p.cuerpo ?? '';
				ubicacion = p.ubicacion?.nombre ?? '';
				etiquetas = (p.etiquetadas ?? []).map((e) => e.alias);
				permiteComentarios = p.permite_comentarios;
				permiteReacciones = p.permite_reacciones;

				// `imagenes` sólo viene en la ficha completa; si la
				// publicación es de una sola foto, `imagen` es esa misma.
				const lista = p.imagenes?.length ? p.imagenes : p.imagen ? [p.imagen] : [];
				imagenes = lista.map((m) => ({ uid: m.id, url: img(m, 400) }));
			})
			.catch((e) => vigente && (error = e instanceof Error ? e.message : 'No se pudo cargar.'))
			.finally(() => vigente && (cargando = false));

		return () => {
			vigente = false;
		};
	});

	function mover(indice: number, salto: number) {
		const destino = indice + salto;
		if (destino < 0 || destino >= imagenes.length) return;

		const copia = [...imagenes];
		[copia[indice], copia[destino]] = [copia[destino], copia[indice]];
		imagenes = copia;
	}

	function elegirArchivo(lista: FileList | null) {
		const f = lista?.[0];
		if (!f?.type.startsWith('image/')) return;

		error = null;
		recortada = null;
		anadiendo = f;
	}

	/**
	 * Sube la fotografía ya recortada y la añade al final del carrusel.
	 *
	 * Pasa por `EditorFoto` como en el compositor, y no directa desde el
	 * selector de archivos: lo que sube al servidor es el recorte, nunca el
	 * original. Saltárselo aquí sería abrir por la puerta de atrás justo lo
	 * que el compositor cierra por delante.
	 */
	async function anadirImagen() {
		if (!cuenta || !recortada) return;

		subiendo = true;
		error = null;

		try {
			const medio = await estudio.subirMedio(recortada, 'publicacion', publicacion?.imagen?.alt ?? '');
			imagenes = [...imagenes, { uid: medio.id, url: img(medio, 400) }];
			anadiendo = null;
			recortada = null;
		} catch (e) {
			error = e instanceof ErrorEstudio ? e.primero() : 'No se pudo subir la fotografía.';
		} finally {
			subiendo = false;
		}
	}

	async function guardar() {
		if (!publicacion) return;

		error = null;
		guardando = true;

		try {
			await estudio.actualizar(publicacion.id, {
				tipo,
				pie: tipo === 'breve' ? pie.trim() : '',
				titulo: tipo === 'nota' ? titulo.trim() : '',
				resumen: tipo === 'nota' ? resumen.trim() : '',
				cuerpo: tipo === 'nota' ? cuerpo.trim() : '',
				imagenes: imagenes.map((i) => i.uid),
				ubicacion: ubicacion.trim() ? { nombre: ubicacion.trim(), slug: null } : null,
				etiquetas: etiquetas.map((alias) => ({ alias })),
				permite_comentarios: permiteComentarios,
				permite_reacciones: permiteReacciones
			});

			await goto(`/estudio/publicacion/${publicacion.id}`);
		} catch (e) {
			error = e instanceof ErrorEstudio ? e.primero() : 'No se pudieron guardar los cambios.';
		} finally {
			guardando = false;
		}
	}
</script>

<div class="editor">
	<header class="cabecera">
		<a href="/estudio/publicacion/{id}" class="icono" aria-label="Volver a la publicación">
			<IconoEstudio nombre="atras" />
		</a>

		<h1>Editar publicación</h1>

		<span></span>
	</header>

	{#if error}
		<p class="error" role="alert">{error}</p>
	{/if}

	{#if cargando}
		<p class="cargando">Abriendo la publicación…</p>
	{:else if publicacion && cuenta}
		{#if anadiendo}
			<!--
				Encuadre de la fotografía que se está añadiendo. Ocupa la
				pantalla entera del editor a propósito: recortar es una tarea,
				no un campo más del formulario que hay debajo.
			-->
			<div class="encuadre">
				<EditorFoto
					archivo={anadiendo}
					marcaTexto={cuenta.nombre}
					alCambiar={(b) => (recortada = b)}
				/>

				<div class="acciones-encuadre">
					<button type="button" class="secundario" onclick={() => ((anadiendo = null), (recortada = null))}>
						Cancelar
					</button>
					<button type="button" class="principal" disabled={!recortada || subiendo} onclick={anadirImagen}>
						{subiendo ? 'Subiendo…' : 'Añadir al carrusel'}
					</button>
				</div>
			</div>
		{:else}
			<div class="cuerpo">
				<section class="imagenes">
					<h2>Fotografías</h2>

					{#if imagenes.length === 0}
						<p class="pista">Esta publicación no tiene ninguna.</p>
					{/if}

					<ul>
						{#each imagenes as imagen, i (imagen.uid)}
							<li>
								<img src={imagen.url} alt="" />

								<span class="orden">{i + 1}</span>

								<div class="mandos">
									<button
										type="button"
										aria-label="Mover a la posición {i}"
										disabled={i === 0}
										onclick={() => mover(i, -1)}>‹</button
									>
									<button
										type="button"
										aria-label="Mover a la posición {i + 2}"
										disabled={i === imagenes.length - 1}
										onclick={() => mover(i, 1)}>›</button
									>
									<button
										type="button"
										class="quitar"
										aria-label="Quitar esta fotografía"
										onclick={() => (imagenes = imagenes.filter((_, x) => x !== i))}
									>
										<IconoEstudio nombre="basura" tamano={14} />
									</button>
								</div>
							</li>
						{/each}

						{#if imagenes.length < 10}
							<li>
								<label class="anadir">
									<IconoEstudio nombre="mas" tamano={22} />
									<span class="sr-only">Añadir una fotografía</span>
									<input
										type="file"
										accept="image/jpeg,image/png,image/webp"
										onchange={(e) => {
											elegirArchivo(e.currentTarget.files);
											e.currentTarget.value = '';
										}}
									/>
								</label>
							</li>
						{/if}
					</ul>

					<p class="pista">La primera es la portada. Se recorta antes de subirse, como al publicar.</p>
				</section>

				<div class="fichas" role="group" aria-label="Formato de la publicación">
					<button type="button" class:activa={tipo === 'breve'} onclick={() => (tipo = 'breve')}>
						<IconoEstudio nombre="imagen" tamano={16} />
						Breve
					</button>
					<button type="button" class:activa={tipo === 'nota'} onclick={() => (tipo = 'nota')}>
						<IconoEstudio nombre="texto" tamano={16} />
						Nota
					</button>
				</div>

				{#if tipo === 'breve'}
					<label class="campo">
						<span>Pie de foto</span>
						<textarea bind:value={pie} rows="5" maxlength="2200"></textarea>
					</label>
				{:else}
					<label class="campo">
						<span>Título</span>
						<input type="text" bind:value={titulo} maxlength="200" />
					</label>

					<label class="campo">
						<span>Entradilla</span>
						<textarea bind:value={resumen} rows="2" maxlength="600"></textarea>
					</label>

					<label class="campo">
						<span>Cuerpo</span>
						<textarea bind:value={cuerpo} rows="10"></textarea>
					</label>
				{/if}

				<div class="filas">
					<FilaEstudio
						icono="etiqueta"
						rotulo="Etiquetar direcciones"
						resumen={etiquetas.length ? `${etiquetas.length} etiquetada${etiquetas.length === 1 ? '' : 's'}` : ''}
					>
						{#snippet contenido()}
							<CampoEtiquetas
								cuentas={data.cuentas}
								propia={cuenta.alias}
								bind:seleccionadas={etiquetas}
								mostrarEtiqueta={false}
							/>
						{/snippet}
					</FilaEstudio>

					<FilaEstudio icono="ubicacion" rotulo="Ubicación" resumen={ubicacion.trim()}>
						{#snippet contenido()}
							<CampoUbicacion bind:valor={ubicacion} sugerencias={data.lugares} mostrarEtiqueta={false} />
						{/snippet}
					</FilaEstudio>

					<FilaEstudio
						icono="ajustes"
						rotulo="Participación"
						resumen={permiteComentarios && permiteReacciones
							? 'Reacciones y comentarios'
							: permiteReacciones
								? 'Sólo reacciones'
								: permiteComentarios
									? 'Sólo comentarios'
									: 'Cerrada'}
					>
						{#snippet contenido()}
							<div class="opciones">
								<label>
									<input type="checkbox" bind:checked={permiteReacciones} />
									Admite reacciones
								</label>

								<label>
									<input type="checkbox" bind:checked={permiteComentarios} />
									Admite comentarios
								</label>
							</div>
						{/snippet}
					</FilaEstudio>
				</div>

				{#if publicacion.estado === 'publicado'}
					<p class="nota">
						Esto ya está publicado: al guardar, el cambio se ve en el sitio de inmediato. La fecha de
						publicación no se mueve.
					</p>
				{/if}
			</div>

			<div class="acciones">
				<a href="/estudio/publicacion/{id}" class="secundario">Cancelar</a>

				<button type="button" class="principal" onclick={guardar} aria-disabled={guardando}>
					{guardando ? 'Guardando…' : 'Guardar cambios'}
				</button>
			</div>
		{/if}
	{/if}
</div>

<style>
	.editor {
		display: flex;
		flex-direction: column;
		max-width: 34rem;
		min-height: 100%;
		margin-inline: auto;
	}

	.cabecera {
		display: grid;
		grid-template-columns: 44px 1fr 44px;
		align-items: center;
		min-height: 52px;
		padding-inline: 0.5rem;
		border-bottom: var(--canto);
	}

	h1 {
		font-size: 0.95rem;
		font-weight: 700;
		text-align: center;
	}

	.icono {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		color: var(--texto);
	}

	.cargando {
		padding: 2.5rem 1rem;
		color: var(--texto-suave);
		font-size: 0.9rem;
		text-align: center;
	}

	.cuerpo {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
	}

	h2 {
		margin-bottom: 0.5rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--texto-suave);
	}

	.imagenes ul {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr));
		gap: 0.4rem;
	}

	.imagenes li {
		position: relative;
		aspect-ratio: 1;
		overflow: hidden;
		border: var(--canto);
	}

	.imagenes img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.orden {
		position: absolute;
		top: 0.25rem;
		left: 0.25rem;
		display: grid;
		place-items: center;
		min-width: 1.2rem;
		height: 1.2rem;
		border-radius: 999px;
		background: rgb(30 31 29 / 0.72);
		color: var(--color-papel);
		font-size: 0.68rem;
		font-weight: 700;
	}

	.mandos {
		position: absolute;
		inset: auto 0 0 0;
		display: flex;
		justify-content: space-between;
		background: rgb(30 31 29 / 0.62);
	}

	.mandos button {
		flex: 1;
		min-height: 1.9rem;
		border: none;
		background: none;
		color: var(--color-papel);
		font-family: inherit;
		font-size: 0.95rem;
		line-height: 1;
		cursor: pointer;
	}

	.mandos button:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.mandos .quitar {
		display: grid;
		place-items: center;
		color: var(--color-achiote-400);
	}

	.anadir {
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		border: 1px dashed var(--borde);
		color: var(--texto-suave);
		cursor: pointer;
	}

	.anadir input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
	}

	.anadir:focus-within {
		outline: 3px solid var(--foco);
		outline-offset: -3px;
	}

	.pista {
		margin-top: 0.5rem;
		color: var(--texto-suave);
		font-size: 0.76rem;
		line-height: 1.5;
	}

	.fichas {
		display: flex;
		gap: 0.4rem;
	}

	.fichas button {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		min-height: 2.3rem;
		padding-inline: 0.8rem;
		border: var(--canto);
		background: var(--superficie);
		color: var(--texto-suave);
		font-family: inherit;
		font-size: 0.82rem;
		font-weight: 600;
		cursor: pointer;
	}

	.fichas button.activa {
		border-color: var(--marca);
		background: var(--superficie-alt);
		color: var(--texto);
	}

	.campo {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.campo > span {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--texto-suave);
	}

	.campo input,
	.campo textarea {
		padding: 0.6rem 0.75rem;
		border: var(--canto);
		background: var(--superficie);
		color: var(--texto);
		font-family: inherit;
		font-size: 0.9rem;
		line-height: 1.5;
		resize: vertical;
	}

	.campo input {
		min-height: 2.75rem;
	}

	.filas {
		display: flex;
		flex-direction: column;
		border-top: var(--canto);
	}

	.opciones {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.opciones label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 32px;
		font-size: 0.88rem;
		cursor: pointer;
	}

	.opciones input {
		width: 1.05rem;
		height: 1.05rem;
		accent-color: var(--marca);
	}

	.nota {
		color: var(--texto-suave);
		font-size: 0.78rem;
		line-height: 1.55;
	}

	.encuadre {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding-bottom: 1rem;
	}

	.acciones-encuadre,
	.acciones {
		display: flex;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
	}

	.acciones {
		position: sticky;
		bottom: calc(64px + env(safe-area-inset-bottom));
		z-index: 2;
		margin-top: auto;
		border-top: var(--canto);
		background: var(--superficie);
	}

	.principal,
	.secundario {
		display: inline-flex;
		flex: 1;
		align-items: center;
		justify-content: center;
		min-height: 3rem;
		border: 1px solid transparent;
		font-family: inherit;
		font-size: 0.92rem;
		font-weight: 700;
		text-decoration: none;
		cursor: pointer;
	}

	.principal {
		background: var(--color-achiote-500);
		color: var(--color-carbon-900);
	}

	.principal:disabled,
	.principal[aria-disabled='true'] {
		opacity: 0.6;
		cursor: progress;
	}

	.secundario {
		border-color: var(--borde);
		background: none;
		color: var(--texto);
	}

	.error {
		margin: 0.75rem 1rem 0;
		padding: 0.6rem 0.8rem;
		border-left: 3px solid var(--color-error);
		background: var(--superficie-alt);
		color: var(--color-error);
		font-size: 0.85rem;
	}

	@media (width >= 64rem) {
		.acciones {
			bottom: 0;
		}
	}
</style>
