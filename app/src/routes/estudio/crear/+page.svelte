<script lang="ts">
	import { goto } from '$app/navigation';
	import IconoEstudio from '$lib/components/estudio/IconoEstudio.svelte';
	import EditorFoto from '$lib/components/estudio/EditorFoto.svelte';
	import EditorVideo from '$lib/components/estudio/EditorVideo.svelte';
	import CampoUbicacion from '$lib/components/estudio/CampoUbicacion.svelte';
	import CampoEtiquetas from '$lib/components/estudio/CampoEtiquetas.svelte';
	import FilaEstudio from '$lib/components/estudio/FilaEstudio.svelte';
	import { estudio, ErrorEstudio } from '$lib/estudio';
	import { sesionEstudio } from '$lib/sesionEstudio.svelte';
	import type { PageData } from './$types';

	/**
	 * El compositor.
	 *
	 * Tres pantallas —elegir, editar, escribir— y no un formulario largo: es
	 * el orden en el que se piensa una publicación, y es el que permite que
	 * la parte pesada —el recorte— ocurra mientras se decide el pie, en vez
	 * de sumar su espera al final.
	 *
	 * La forma es la de un compositor de red social porque el encargo es el
	 * mismo, y quien lleva la cuenta de una dirección ya sabe usarlo sin que
	 * nadie se lo explique. Lo que NO se copia es la piel: sigue siendo
	 * Mosaico —angular, sin ornamento— y sigue pidiendo lo que un sitio de
	 * gobierno tiene que pedir. La descripción para lectores de pantalla es
	 * el ejemplo: ninguna red social la pone en el camino principal, y aquí
	 * está en una fila que avisa en rojo mientras falte.
	 *
	 * Lo que se sube es el resultado del recorte, no el original: ver
	 * EditorFoto.
	 */
	let { data }: { data: PageData } = $props();

	type Paso = 'elegir' | 'editar' | 'detalles';

	/** El mismo tope que valida el backend (`imagenes` → `array|max:10`). */
	const MAX_IMAGENES = 10;

	let paso = $state<Paso>('elegir');

	/*
	 | Varios archivos, no uno: el backend ya aceptaba una galería
	 | (`imagenes` es un array de hasta diez) y el visor ya pinta el carrusel;
	 | el compositor era la única pieza que mandaba siempre un solo archivo.
	 | La tira de miniaturas de la pantalla de edición es lo que faltaba para
	 | poder usarlo.
	 */
	let archivos = $state<File[]>([]);
	let activo = $state(0);
	let recortados = $state<(Blob | null)[]>([]);
	let alts = $state<string[]>([]);
	let recorteVideo = $state<{ desde: number; hasta: number } | null>(null);
	let arrastrando = $state(false);

	/*
	 | Qué imágenes se han abierto ya en el editor.
	 |
	 | El editor de cada imagen se queda montado —escondido con
	 | `visibility`, que conserva la geometría que chop-chop necesita medir—
	 | en vez de destruirse al cambiar de miniatura. Si se destruyera, volver
	 | a una imagen la reabriría con el encuadre por defecto y borraría en
	 | silencio lo que ya se había recortado ahí.
	 |
	 | Montarlos todos de golpe al elegir diez fotografías sería descodificar
	 | diez imágenes a pantalla completa en un teléfono; montarlos según se
	 | visitan deja el coste en lo que de verdad se usa, que casi siempre son
	 | una o dos.
	 */
	let visitados = $state<number[]>([]);

	let tipo = $state<'breve' | 'nota'>('breve');
	let pie = $state('');
	let titulo = $state('');
	let resumen = $state('');
	let cuerpo = $state('');
	let ubicacion = $state('');
	let etiquetas = $state<string[]>([]);
	let permiteComentarios = $state(true);
	let permiteReacciones = $state(true);

	let enviando = $state(false);
	let error = $state<string | null>(null);
	let progreso = $state('');

	const cuenta = $derived(sesionEstudio.cuenta);
	const esVideo = $derived(archivos[0]?.type.startsWith('video/') ?? false);
	const hayArchivo = $derived(archivos.length > 0);
	const listo = $derived(esVideo ? hayArchivo : recortados.some(Boolean));
	const faltanAlt = $derived(archivos.filter((_, i) => !alts[i]?.trim()).length);

	/**
	 * Las URL de previsualización, una por archivo.
	 *
	 * Se prefiere el recorte al original: la miniatura de la tira y la de la
	 * pantalla de detalles tienen que enseñar lo que se va a publicar, no lo
	 * que se eligió del carrete. Van en un efecto y no en un derivado porque
	 * `createObjectURL` hay que revocarlo; un derivado las crearía en cada
	 * recálculo y no liberaría ninguna.
	 */
	let urlsPrevias = $state<string[]>([]);

	$effect(() => {
		const fuentes = archivos.map((f, i) => recortados[i] ?? f);
		const urls = fuentes.map((f) => URL.createObjectURL(f));

		urlsPrevias = urls;

		return () => urls.forEach((u) => URL.revokeObjectURL(u));
	});

	/** Añade lo elegido a lo que ya había, que es lo que espera una galería. */
	function agregar(lista: FileList | null) {
		const nuevos = Array.from(lista ?? []);
		if (nuevos.length === 0) return;

		const invalido = nuevos.find((f) => !/^(image|video)\//.test(f.type));
		if (invalido) {
			error = 'Elige fotografías o un vídeo.';

			return;
		}

		error = null;

		/*
		 | Un vídeo va solo. No es una limitación del backend —la galería
		 | admite lo que se le mande— sino de lo que significa: un carrusel
		 | se hojea, un vídeo se reproduce, y mezclarlos obliga a decidir qué
		 | hace el reproductor al deslizar. Mientras el visor no responda a
		 | eso, el compositor no lo ofrece.
		 */
		const video = nuevos.find((f) => f.type.startsWith('video/'));
		if (video) {
			archivos = [video];
			recortados = [null];
			alts = [''];
			visitados = [];
			activo = 0;
			recorteVideo = null;
			paso = 'editar';

			return;
		}

		if (esVideo) {
			archivos = [];
			recortados = [];
			alts = [];
			visitados = [];
		}

		const sitio = MAX_IMAGENES - archivos.length;
		if (sitio <= 0) {
			error = `Una publicación admite como mucho ${MAX_IMAGENES} imágenes.`;

			return;
		}

		const admitidos = nuevos.slice(0, sitio);
		if (admitidos.length < nuevos.length) {
			error = `Sólo caben ${MAX_IMAGENES} imágenes; las demás se descartaron.`;
		}

		const desde = archivos.length;
		archivos = [...archivos, ...admitidos];
		recortados = [...recortados, ...admitidos.map(() => null)];
		alts = [...alts, ...admitidos.map(() => '')];
		recorteVideo = null;

		verImagen(desde);
	}

	/** Cambiar de miniatura y dejar constancia de que esa imagen ya tiene editor. */
	function verImagen(indice: number) {
		activo = indice;
		if (!visitados.includes(indice)) visitados = [...visitados, indice];
	}

	function quitar(indice: number) {
		archivos = archivos.filter((_, i) => i !== indice);
		recortados = recortados.filter((_, i) => i !== indice);
		alts = alts.filter((_, i) => i !== indice);

		// Los índices se corren al quitar una imagen del medio, así que lo
		// visitado se recalcula en vez de arrastrar referencias a huecos.
		visitados = [];
		activo = 0;
		if (archivos.length === 0) paso = 'elegir';
		else verImagen(0);
	}

	function soltar(evento: DragEvent) {
		evento.preventDefault();
		arrastrando = false;
		agregar(evento.dataTransfer?.files ?? null);
	}

	function atras() {
		if (paso === 'detalles') paso = 'editar';
		else if (paso === 'editar') paso = 'elegir';
		else goto('/estudio');
	}

	async function publicar(estado: 'publicado' | 'borrador') {
		if (!cuenta || !hayArchivo) return;

		error = null;
		enviando = true;

		try {
			const ids: string[] = [];

			for (let i = 0; i < archivos.length; i++) {
				progreso = esVideo
					? 'Subiendo el vídeo…'
					: archivos.length === 1
						? 'Subiendo la fotografía…'
						: `Subiendo la imagen ${i + 1} de ${archivos.length}…`;

				const medio = await estudio.subirMedio(
					esVideo ? archivos[i] : (recortados[i] ?? archivos[i]),
					'publicacion',
					alts[i]?.trim() ?? '',
					esVideo && recorteVideo ? recorteVideo : undefined
				);

				ids.push(medio.id);
			}

			progreso = estado === 'publicado' ? 'Publicando…' : 'Guardando el borrador…';

			const { data: creada } = await estudio.crear({
				cuenta: cuenta.alias,
				tipo,
				estado,
				pie: tipo === 'breve' ? pie.trim() : '',
				titulo: tipo === 'nota' ? titulo.trim() : '',
				resumen: tipo === 'nota' ? resumen.trim() : '',
				cuerpo: tipo === 'nota' ? cuerpo.trim() : '',
				imagenes: ids,
				ubicacion: ubicacion.trim() ? { nombre: ubicacion.trim(), slug: null } : null,
				etiquetas: etiquetas.map((alias) => ({ alias })),
				permite_comentarios: permiteComentarios,
				permite_reacciones: permiteReacciones
			});

			await sesionEstudio.refrescar();
			await goto(`/estudio/publicacion/${creada.id}`);
		} catch (e) {
			error = e instanceof ErrorEstudio ? e.primero() : 'No se pudo publicar. Inténtalo otra vez.';
		} finally {
			enviando = false;
			progreso = '';
		}
	}
</script>

<div class="compositor">
	<header class="cabecera">
		<button
			type="button"
			class="icono"
			onclick={atras}
			aria-label={paso === 'elegir' ? 'Salir del compositor' : 'Volver al paso anterior'}
		>
			<IconoEstudio nombre={paso === 'elegir' ? 'cerrar' : 'atras'} />
		</button>

		<h1>{paso === 'editar' ? 'Editar' : 'Nueva publicación'}</h1>

		{#if paso === 'elegir' && hayArchivo}
			<button type="button" class="siguiente" onclick={() => (paso = 'editar')}>Siguiente</button>
		{:else}
			<span></span>
		{/if}
	</header>

	{#if error}
		<p class="error" role="alert">{error}</p>
	{/if}

	<!-- ------------------------------------------------------------ elegir -->
	{#if paso === 'elegir'}
		<div
			class="visor"
			class:arrastrando
			class:vacio={!hayArchivo}
			ondragover={(e) => {
				e.preventDefault();
				arrastrando = true;
			}}
			ondragleave={() => (arrastrando = false)}
			ondrop={soltar}
			role="region"
			aria-label="Zona para soltar fotografías o un vídeo"
		>
			{#if hayArchivo && urlsPrevias[activo]}
				{#if esVideo}
					<!-- svelte-ignore a11y_media_has_caption -->
					<video src={urlsPrevias[activo]} class="medio" controls></video>
				{:else}
					<img src={urlsPrevias[activo]} alt="" class="medio" />
				{/if}

				<button type="button" class="recortar" onclick={() => (paso = 'editar')}>
					<IconoEstudio nombre="recortar" tamano={17} />
					Encuadrar
				</button>
			{:else}
				<div class="hueco">
					<IconoEstudio nombre="imagen" tamano={44} />
					<p class="titulo-hueco">Arrastra una fotografía o un vídeo</p>
					<p class="pista">JPG, PNG o WebP · MP4 o WebM de hasta un minuto</p>
				</div>
			{/if}
		</div>

		<div class="barra-galeria">
			<span class="rotulo-galeria">
				{#if hayArchivo && !esVideo}
					Elegidas · {archivos.length} de {MAX_IMAGENES}
				{:else if esVideo}
					Un vídeo
				{:else}
					Nada elegido todavía
				{/if}
			</span>

			{#if hayArchivo && !esVideo && archivos.length > 1}
				<span class="pista-orden">Se publican en este orden</span>
			{/if}
		</div>

		<ul class="rejilla">
			{#if !esVideo && archivos.length < MAX_IMAGENES}
				<li>
					<label class="celda anadir">
						<IconoEstudio nombre="mas" tamano={26} />
						<span class="sr-only">Añadir fotografías o un vídeo</span>
						<input
							type="file"
							multiple
							accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
							onchange={(e) => {
								agregar(e.currentTarget.files);
								e.currentTarget.value = '';
							}}
						/>
					</label>
				</li>
			{/if}

			{#each archivos as archivo, i (archivo.name + archivo.lastModified + i)}
				<li>
					<div class="celda">
						<button
							type="button"
							class="mirar"
							class:activa={activo === i}
							onclick={() => verImagen(i)}
							aria-label="Ver {archivo.name}"
							aria-pressed={activo === i}
						>
							{#if urlsPrevias[i]}
								{#if esVideo}
									<!-- svelte-ignore a11y_media_has_caption -->
									<video src={urlsPrevias[i]} muted></video>
								{:else}
									<img src={urlsPrevias[i]} alt="" />
								{/if}
							{/if}

							{#if !esVideo && archivos.length > 1}
								<span class="orden">{i + 1}</span>
							{/if}
						</button>

						<button type="button" class="quitar" onclick={() => quitar(i)} aria-label="Quitar {archivo.name}">
							<IconoEstudio nombre="cerrar" tamano={13} />
						</button>
					</div>
				</li>
			{/each}
		</ul>

		<p class="nota">
			El recorte y el filtro se aplican aquí, en tu teléfono o tu computadora. Lo que sube al
			servidor es el resultado: el original completo no sale de tu dispositivo.
		</p>

	<!-- ------------------------------------------------------------ editar -->
	{:else if paso === 'editar' && hayArchivo}
		{#if esVideo}
			<EditorVideo archivo={archivos[0]} alCambiar={(r) => (recorteVideo = r)} />
		{:else}
			<!--
				Todos los editores visitados viven a la vez en la misma celda de
				rejilla, y los que no tocan se esconden con `visibility` en vez
				de desmontarse. `display: none` no serviría: chop-chop mide su
				contenedor para calcular el encuadre, y un contenedor de cero
				píxeles le daría una geometría rota al volver a enseñarlo.
			-->
			<div class="pila">
				{#each archivos as archivo, i (archivo.name + archivo.lastModified + i)}
					{#if visitados.includes(i)}
						<div class="capa" class:oculta={i !== activo} inert={i !== activo}>
							<EditorFoto
								{archivo}
								marcaTexto={cuenta?.nombre}
								alCambiar={(b) => (recortados[i] = b)}
							/>
						</div>
					{/if}
				{/each}
			</div>
		{/if}

		<div class="pie-editor">
			{#if !esVideo}
				<ul class="tira">
					{#each archivos as archivo, i (archivo.name + archivo.lastModified + i)}
						<li>
							<button
								type="button"
								class="mini"
								class:activa={activo === i}
								onclick={() => verImagen(i)}
								aria-label="Editar la imagen {i + 1}"
								aria-pressed={activo === i}
							>
								{#if urlsPrevias[i]}<img src={urlsPrevias[i]} alt="" />{/if}
							</button>
						</li>
					{/each}

					{#if archivos.length < MAX_IMAGENES}
						<li>
							<label class="mini anadir">
								<IconoEstudio nombre="mas" tamano={20} />
								<span class="sr-only">Añadir otra fotografía</span>
								<input
									type="file"
									multiple
									accept="image/jpeg,image/png,image/webp"
									onchange={(e) => {
										agregar(e.currentTarget.files);
										e.currentTarget.value = '';
									}}
								/>
							</label>
						</li>
					{/if}
				</ul>
			{:else}
				<span></span>
			{/if}

			<button
				type="button"
				class="pastilla"
				disabled={!listo}
				title={listo ? undefined : 'Espera a que termine de abrirse la fotografía'}
				onclick={() => (paso = 'detalles')}
			>
				Siguiente
			</button>
		</div>

	<!-- ---------------------------------------------------------- detalles -->
	{:else if paso === 'detalles' && cuenta}
		<div class="detalles">
			<div class="resumen-medio">
				<span class="miniatura">
					{#if urlsPrevias[0]}
						{#if esVideo}
							<!-- svelte-ignore a11y_media_has_caption -->
							<video src={urlsPrevias[0]} muted></video>
						{:else}
							<img src={urlsPrevias[0]} alt="" />
						{/if}
					{/if}

					{#if !esVideo && archivos.length > 1}
						<span class="contador">{archivos.length}</span>
					{/if}
				</span>

				<textarea
					class="pie"
					bind:value={pie}
					rows="4"
					maxlength="2200"
					placeholder="Añade un pie de foto o vídeo…"
					aria-label="Pie de foto"
				></textarea>
			</div>

			<!--
				El formato va en fichas y no en un desplegable porque son dos, y
				porque la diferencia importa: una breve es una fotografía con
				pie, una nota es un artículo que se lee como una noticia.
			-->
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

			{#if tipo === 'nota'}
				<div class="campos-nota">
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
						<textarea bind:value={cuerpo} rows="8"></textarea>
					</label>
				</div>
			{/if}

			<div class="filas">
				<!--
					La descripción para lectores de pantalla es la primera fila y
					la única que avisa en color mientras falte. No es una opción
					más del formulario: el catálogo ya arrastra 54 fotografías sin
					descripción, ninguna se ha rellenado sola, y una foto que un
					lector de pantalla no puede describir es contenido que parte de
					la ciudadanía no recibe.

					`abierta` va sin `bind:` a propósito: la fila se puede cerrar a
					mano, pero si vuelve a faltar una descripción —al añadir otra
					imagen, o al borrar un texto— se abre sola otra vez. Es la única
					fila que insiste, y lo hace porque es la única cuyo olvido deja
					a alguien fuera.
				-->
				<FilaEstudio
					icono="texto-alternativo"
					rotulo="Descripción para lectores de pantalla"
					alerta={faltanAlt ? (faltanAlt === 1 ? 'Falta una' : `Faltan ${faltanAlt}`) : ''}
					resumen={faltanAlt ? '' : 'Todas descritas'}
					abierta={faltanAlt > 0}
				>
					{#snippet contenido()}
						{#each archivos as archivo, i (archivo.name + archivo.lastModified + i)}
							<label class="campo alt">
								<span>
									{#if urlsPrevias[i] && !esVideo}<img src={urlsPrevias[i]} alt="" />{/if}
									{archivos.length > 1 ? `Imagen ${i + 1}` : 'Qué se ve'}
								</span>
								<input
									type="text"
									value={alts[i] ?? ''}
									maxlength="300"
									placeholder="Vecinos limpiando la orilla del río con guantes y fundas."
									oninput={(e) => (alts[i] = e.currentTarget.value)}
								/>
							</label>
						{/each}
					{/snippet}
				</FilaEstudio>

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

				<FilaEstudio icono="ubicacion" rotulo="Añadir ubicación" resumen={ubicacion.trim()}>
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

			<p class="firma">Se publicará como <strong>{cuenta.nombre}</strong>.</p>
		</div>

		<div class="acciones">
			<button type="button" class="borrador" onclick={() => publicar('borrador')} aria-disabled={enviando}>
				Guardar como borrador
			</button>

			<button type="button" class="compartir" onclick={() => publicar('publicado')} aria-disabled={enviando}>
				{enviando ? progreso || 'Un momento…' : 'Compartir'}
			</button>
		</div>
	{/if}
</div>

<style>
	.compositor {
		display: flex;
		flex-direction: column;
		max-width: 34rem;
		min-height: 100%;
		margin-inline: auto;
	}

	.cabecera {
		display: grid;
		grid-template-columns: 44px 1fr auto;
		align-items: center;
		gap: 0.5rem;
		min-height: 52px;
		padding-inline: 0.5rem;
		border-bottom: 1px solid var(--borde);
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
		border: none;
		background: none;
		color: var(--texto);
		cursor: pointer;
	}

	.siguiente {
		min-height: 40px;
		padding-inline: 0.85rem;
		border: none;
		background: none;
		color: var(--enlace);
		font-family: inherit;
		font-size: 0.88rem;
		font-weight: 700;
		cursor: pointer;
	}

	/* ------------------------------------------------------------- elegir */

	.visor {
		position: relative;
		display: grid;
		place-items: center;
		aspect-ratio: 1;
		max-height: 46vh;
		overflow: hidden;
		background: var(--color-carbon-900);
	}

	.visor.vacio {
		aspect-ratio: auto;
		min-height: 15rem;
		border-bottom: 2px dashed var(--borde);
		background: var(--superficie-alt);
	}

	.visor.arrastrando {
		border-color: var(--marca);
	}

	.medio {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.hueco {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1.5rem;
		color: var(--texto-suave);
		text-align: center;
	}

	.titulo-hueco {
		font-size: 1rem;
		font-weight: 700;
		color: var(--texto);
	}

	.pista {
		font-size: 0.82rem;
	}

	.recortar {
		position: absolute;
		bottom: 0.6rem;
		left: 0.6rem;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		min-height: 2.1rem;
		padding-inline: 0.65rem;
		border: none;
		border-radius: 3px;
		background: rgb(30 31 29 / 0.62);
		color: var(--color-papel);
		font-family: inherit;
		font-size: 0.76rem;
		font-weight: 600;
		cursor: pointer;
		backdrop-filter: blur(4px);
	}

	.barra-galeria {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.85rem 1rem 0.6rem;
	}

	.rotulo-galeria {
		font-size: 0.92rem;
		font-weight: 700;
	}

	.pista-orden {
		font-size: 0.74rem;
		color: var(--texto-suave);
	}

	.rejilla {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 2px;
		padding-inline: 2px;
	}

	.celda {
		position: relative;
		aspect-ratio: 1;
	}

	.mirar,
	.anadir {
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		padding: 0;
		border: none;
		background: var(--superficie-alt);
		color: var(--texto-suave);
		cursor: pointer;
	}

	.mirar img,
	.mirar video {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* El filete va DENTRO, no en el borde: en una rejilla de 2px de hueco un
	   borde exterior desplazaría la celda y movería toda la fila. */
	.mirar.activa {
		outline: 3px solid var(--color-achiote-400);
		outline-offset: -3px;
	}

	.orden {
		position: absolute;
		top: 0.3rem;
		right: 0.3rem;
		display: grid;
		place-items: center;
		min-width: 1.35rem;
		height: 1.35rem;
		border-radius: 50%;
		background: rgb(30 31 29 / 0.72);
		color: var(--color-papel);
		font-size: 0.7rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.quitar {
		position: absolute;
		top: 0.3rem;
		left: 0.3rem;
		display: grid;
		place-items: center;
		width: 1.5rem;
		height: 1.5rem;
		border: none;
		border-radius: 50%;
		background: rgb(30 31 29 / 0.72);
		color: var(--color-papel);
		cursor: pointer;
	}

	.anadir {
		position: relative;
		border: 1px dashed var(--borde);
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

	.nota {
		max-width: 26rem;
		margin: 1rem auto 2.5rem;
		padding-inline: 1rem;
		color: var(--texto-suave);
		font-size: 0.76rem;
		line-height: 1.55;
		text-align: center;
	}

	/* ------------------------------------------------------------- editar */

	.pila {
		display: grid;
	}

	.capa {
		grid-area: 1 / 1;
	}

	.capa.oculta {
		visibility: hidden;
		pointer-events: none;
	}

		/*
	  Las dos barras pegadas abajo —ésta y `.acciones`— se paran ENCIMA de la
	  barra de navegación del estudio, no en el borde de la ventana: esa barra
	  es `fixed` con `z-index: 20` y 64 px de alto, así que un `bottom: 0` aquí
	  dejaría «Siguiente» y «Compartir» escondidos detrás de ella justo en el
	  teléfono, que es donde se compone. En escritorio la barra no existe (el
	  riel es lateral) y el hueco sobra: ver el `@media` del final.
	*/
	.pie-editor {
		position: sticky;
		bottom: calc(64px + env(safe-area-inset-bottom));
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.6rem 0.75rem;
		border-top: 1px solid var(--borde);
		background: var(--superficie);
	}

	.tira {
		display: flex;
		flex: 1;
		gap: 0.35rem;
		min-width: 0;
		overflow-x: auto;
	}

	.mini {
		position: relative;
		display: grid;
		place-items: center;
		flex: none;
		width: 3rem;
		height: 3rem;
		padding: 0;
		border: 1px solid var(--borde);
		background: var(--superficie-alt);
		color: var(--texto-suave);
		cursor: pointer;
	}

	.mini img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.mini.activa {
		outline: 2px solid var(--color-achiote-400);
		outline-offset: -2px;
	}

	.mini.anadir {
		border-style: dashed;
	}

	.pastilla {
		flex: none;
		min-height: 2.75rem;
		padding-inline: 1.4rem;
		border: none;
		border-radius: 3px;
		background: var(--color-achiote-500);
		color: var(--color-carbon-900);
		font-family: inherit;
		font-size: 0.9rem;
		font-weight: 700;
		cursor: pointer;
	}

	.pastilla:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* ----------------------------------------------------------- detalles */

	.detalles {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
	}

	.resumen-medio {
		display: grid;
		grid-template-columns: 4.5rem 1fr;
		gap: 0.75rem;
	}

	.miniatura {
		position: relative;
		display: block;
		aspect-ratio: 1;
		overflow: hidden;
		background: var(--superficie-alt);
	}

	.miniatura img,
	.miniatura video {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.contador {
		position: absolute;
		top: 0.25rem;
		right: 0.25rem;
		display: grid;
		place-items: center;
		min-width: 1.25rem;
		height: 1.25rem;
		border-radius: 50%;
		background: rgb(30 31 29 / 0.72);
		color: var(--color-papel);
		font-size: 0.68rem;
		font-weight: 700;
	}

	/* Sin recuadro: el pie es el texto de la publicación, no un campo más de
	   un formulario, y enmarcarlo lo devolvía a la fila de los demás. */
	.pie {
		border: none;
		background: none;
		color: var(--texto);
		font-family: inherit;
		font-size: 0.95rem;
		line-height: 1.5;
		resize: vertical;
	}

	.pie:focus-visible {
		outline: 2px solid var(--foco);
		outline-offset: 2px;
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
		border: 1px solid var(--borde);
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

	.campos-nota {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.campo {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.campo > span {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--texto-suave);
	}

	.campo.alt + .campo.alt {
		margin-top: 0.7rem;
	}

	.campo.alt img {
		width: 1.6rem;
		height: 1.6rem;
		object-fit: cover;
	}

	.campo input,
	.campo textarea {
		padding: 0.6rem 0.75rem;
		border: 1px solid var(--borde);
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
		border-top: 1px solid var(--borde);
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

	.firma {
		color: var(--texto-suave);
		font-size: 0.8rem;
		text-align: center;
	}

	.acciones {
		position: sticky;
		bottom: calc(64px + env(safe-area-inset-bottom));
		z-index: 2;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: auto;
		padding: 0.75rem 1rem;
		border-top: 1px solid var(--borde);
		background: var(--superficie);
	}

	.compartir,
	.borrador {
		min-height: 3rem;
		border: 1px solid transparent;
		font-family: inherit;
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
	}

	.compartir {
		background: var(--color-achiote-500);
		color: var(--color-carbon-900);
	}

	.borrador {
		border-color: var(--borde);
		background: none;
		color: var(--texto);
	}

	.compartir[aria-disabled='true'],
	.borrador[aria-disabled='true'] {
		opacity: 0.6;
		cursor: progress;
	}

	.error {
		margin: 0.75rem 1rem 0;
		padding: 0.6rem 0.8rem;
		border-left: 3px solid var(--color-error);
		background: var(--superficie-alt);
		color: var(--color-error);
		font-size: 0.85rem;
	}

	/* Mismo corte que el `@media` del layout del estudio, donde la barra
	   inferior desaparece y la navegación pasa al riel lateral. */
	@media (width >= 64rem) {
		.pie-editor,
		.acciones {
			bottom: 0;
		}
	}
</style>
