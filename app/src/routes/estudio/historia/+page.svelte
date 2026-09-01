<script lang="ts">
	import { goto } from '$app/navigation';
	import IconoEstudio from '$lib/components/estudio/IconoEstudio.svelte';
	import LienzoHistoria from '$lib/components/estudio/LienzoHistoria.svelte';
	import EditorFoto from '$lib/components/estudio/EditorFoto.svelte';
	import SelectorEmoji from '$lib/components/estudio/SelectorEmoji.svelte';
	import { STICKERS } from '$lib/components/estudio/stickers';
	import { estudio, ErrorEstudio, type AjustesHistorias, type ElementoHistoria } from '$lib/estudio';
	import { sesionEstudio } from '$lib/sesionEstudio.svelte';
	import { img, type Destacada } from '$lib/api';

	/**
	 * El compositor de historias.
	 *
	 * Dos pasos: encuadrar la fotografía a 9:16 y pegarle encima lo que haga
	 * falta. Lo que se pega no es libre — los stickers salen de un catálogo
	 * cerrado — y esa es la diferencia entre una red social y la cuenta de un
	 * gobierno: «Cerrado hoy» o «Convocatoria abierta» sobre una fotografía
	 * oficial son afirmaciones, no adornos, y las decide el código, no quien
	 * compone a las once de la noche.
	 */
	let paso = $state<'archivo' | 'encuadre' | 'componer'>('archivo');
	let archivo = $state<File | null>(null);
	let recortado = $state<Blob | null>(null);
	let urlPrevia = $state('');

	let elementos = $state<ElementoHistoria[]>([]);
	let seleccionado = $state<number | null>(null);
	let anadiendo = $state<'texto' | 'sticker' | 'encuesta' | 'pregunta' | 'emoji' | 'imagen' | null>(null);
	let dibujando = $state(false);
	let subiendoImagen = $state(false);

	let duracion = $state(72);
	let enlaceUrl = $state('');
	let enlaceTexto = $state('');
	let destacadaId = $state<number | null>(null);
	let alt = $state('');

	let ajustes = $state<AjustesHistorias | null>(null);
	let destacadas = $state<Destacada[]>([]);
	let enviando = $state(false);
	let error = $state<string | null>(null);

	const cuenta = $derived(sesionEstudio.cuenta);

	/** Sólo una cosa que responder por historia: lo exige el backend y conviene decirlo antes. */
	const yaHayRespondible = $derived(elementos.some((e) => e.tipo === 'encuesta' || e.tipo === 'pregunta'));

	$effect(() => {
		const alias = cuenta?.alias;
		if (!alias) return;

		let vigente = true;

		estudio.historias(alias).then((r) => {
			if (!vigente) return;
			ajustes = r.ajustes;
			duracion = r.ajustes.duracion_por_defecto;
		});

		estudio.destacadas(alias).then((r) => vigente && (destacadas = r.data));

		return () => {
			vigente = false;
		};
	});

	$effect(() => {
		if (!recortado) return;

		const url = URL.createObjectURL(recortado);
		urlPrevia = url;

		return () => URL.revokeObjectURL(url);
	});

	function elegir(lista: FileList | null) {
		const f = lista?.[0];
		if (!f?.type.startsWith('image/')) {
			error = 'La historia empieza por una fotografía.';

			return;
		}

		error = null;
		archivo = f;
		paso = 'encuadre';
	}

	function anadir(elemento: ElementoHistoria) {
		elementos = [...elementos, elemento];
		seleccionado = elementos.length - 1;
		anadiendo = null;
	}

	/**
	 * Sube una imagen suelta y la añade como elemento — el mismo
	 * `estudio.subirMedio` que ya sube la fotografía de fondo, así que una
	 * imagen pegada, soltada o elegida del dispositivo entra al mismo
	 * catálogo de `medios` en vez de viajar como base64 dentro del jsonb.
	 *
	 * Una función, tres entradas: el botón «Imagen» de la paleta, pegar
	 * (Ctrl+V) y soltar un archivo sobre el lienzo — las tres llaman a esto.
	 */
	async function subirImagen(archivo: File) {
		if (!cuenta || !archivo.type.startsWith('image/')) {
			error = 'Sólo se pueden añadir imágenes.';
			return;
		}

		error = null;
		subiendoImagen = true;

		try {
			const medio = await estudio.subirMedio(archivo, 'historia', cuenta.nombre);

			anadir({
				tipo: 'imagen',
				contenido: { medio_uid: medio.id, url: img(medio, 800) },
				x: 0.5,
				y: 0.5,
				escala: 1,
				rotacion: 0
			});
		} catch (e) {
			error = e instanceof ErrorEstudio ? e.primero() : 'No se pudo subir la imagen.';
		} finally {
			subiendoImagen = false;
		}
	}

	async function publicar() {
		if (!cuenta || !recortado) return;

		error = null;
		enviando = true;

		try {
			const medio = await estudio.subirMedio(recortado, 'historia', alt.trim() || cuenta.nombre);

			await estudio.publicarHistoria({
				cuenta: cuenta.alias,
				medio: medio.id,
				duracion_horas: duracion,
				enlace_url: enlaceUrl.trim() || null,
				enlace_texto: enlaceTexto.trim() || null,
				destacada_id: destacadaId,
				elementos: elementos.map((e, orden) => ({ ...e, orden }))
			});

			await goto('/estudio');
		} catch (e) {
			error = e instanceof ErrorEstudio ? e.primero() : 'No se pudo publicar la historia.';
		} finally {
			enviando = false;
		}
	}

	function horas(h: number): string {
		if (h === 0) return 'Sin caducidad';
		if (h < 48) return `${h} horas`;

		return `${Math.round(h / 24)} días`;
	}
</script>

<div class="compositor">
	<header class="cabecera">
		{#if paso !== 'archivo'}
			<button
				type="button"
				class="icono"
				onclick={() => (paso = paso === 'componer' ? 'encuadre' : 'archivo')}
				aria-label="Volver"
			>
				<IconoEstudio nombre="atras" />
			</button>
		{:else}
			<span></span>
		{/if}

		<h1>Nueva historia</h1>

		{#if paso === 'encuadre' && recortado}
			<button type="button" class="siguiente" onclick={() => (paso = 'componer')}>Siguiente</button>
		{:else}
			<span></span>
		{/if}
	</header>

	{#if error}
		<p class="error" role="alert">{error}</p>
	{/if}

	{#if paso === 'archivo'}
		<div class="zona">
			<IconoEstudio nombre="historia" tamano={44} />
			<p class="titulo-zona">Una fotografía para la historia</p>
			<p class="pista">Se recorta a pantalla completa, 9:16.</p>

			<label class="boton-archivo">
				Elegir del dispositivo
				<input type="file" accept="image/*" onchange={(e) => elegir(e.currentTarget.files)} />
			</label>
		</div>
	{:else if paso === 'encuadre' && archivo}
		<EditorFoto {archivo} proporcionInicial="9:16" marcaTexto={cuenta?.nombre} alCambiar={(b) => (recortado = b)} />
	{:else if paso === 'componer' && urlPrevia}
		<div class="componer">
			<LienzoHistoria fondo={urlPrevia} bind:elementos bind:seleccionado bind:dibujando {subirImagen} />

			<nav class="paleta" aria-label="Añadir a la historia">
				<button type="button" onclick={() => (anadiendo = anadiendo === 'texto' ? null : 'texto')}>
					<IconoEstudio nombre="texto" tamano={19} />Texto
				</button>
				<button type="button" onclick={() => (anadiendo = anadiendo === 'sticker' ? null : 'sticker')}>
					<IconoEstudio nombre="sticker" tamano={19} />Sticker
				</button>
				<button type="button" onclick={() => (anadiendo = anadiendo === 'emoji' ? null : 'emoji')}>
					<IconoEstudio nombre="emoji" tamano={19} />Emoji
				</button>
				<button
					type="button"
					class:activo={dibujando}
					onclick={() => {
						anadiendo = null;
						dibujando = !dibujando;
					}}
				>
					<IconoEstudio nombre="dibujar" tamano={19} />Dibujar
				</button>
				<button
					type="button"
					disabled={subiendoImagen}
					onclick={() => (anadiendo = anadiendo === 'imagen' ? null : 'imagen')}
				>
					<IconoEstudio nombre="imagen" tamano={19} />{subiendoImagen ? 'Subiendo…' : 'Imagen'}
				</button>
				<button
					type="button"
					disabled={yaHayRespondible}
					title={yaHayRespondible ? 'Ya hay una encuesta o una caja de preguntas' : undefined}
					onclick={() => (anadiendo = anadiendo === 'encuesta' ? null : 'encuesta')}
				>
					<IconoEstudio nombre="encuesta" tamano={19} />Encuesta
				</button>
				<button
					type="button"
					disabled={yaHayRespondible}
					title={yaHayRespondible ? 'Ya hay una encuesta o una caja de preguntas' : undefined}
					onclick={() => (anadiendo = anadiendo === 'pregunta' ? null : 'pregunta')}
				>
					<IconoEstudio nombre="pregunta" tamano={19} />Preguntas
				</button>
			</nav>

			{#if dibujando}
				<p class="nota">Dibuja directamente sobre la fotografía. Pulsa «Listo» en el lienzo para terminar.</p>
			{/if}

			{#if yaHayRespondible}
				<p class="nota">
					Una historia lleva una sola encuesta o caja de preguntas. Con dos, nadie sabe cuál está
					contestando y el resultado de las dos deja de significar algo.
				</p>
			{/if}

			{#if anadiendo === 'texto'}
				{@render formularioTexto()}
			{:else if anadiendo === 'sticker'}
				{@render formularioSticker()}
			{:else if anadiendo === 'emoji'}
				{@render formularioEmoji()}
			{:else if anadiendo === 'imagen'}
				{@render formularioImagen()}
			{:else if anadiendo === 'encuesta'}
				{@render formularioEncuesta()}
			{:else if anadiendo === 'pregunta'}
				{@render formularioPregunta()}
			{/if}

			<div class="opciones">
				<label class="campo">
					<span>Descripción de la imagen</span>
					<input type="text" bind:value={alt} maxlength="300" placeholder="Qué se ve en la foto." />
				</label>

				{#if ajustes}
					<fieldset>
						<legend>Cuánto dura</legend>
						<div class="duraciones">
							{#each ajustes.duraciones_permitidas as h (h)}
								<label class:activa={duracion === h}>
									<input type="radio" bind:group={duracion} value={h} />
									{horas(h)}
								</label>
							{/each}
						</div>
					</fieldset>

					{#if ajustes.permitir_enlace}
						<label class="campo">
							<span>Enlace (opcional)</span>
							<input type="url" bind:value={enlaceUrl} placeholder="https://orellana.gob.ec/…" />
						</label>

						{#if enlaceUrl.trim()}
							<label class="campo">
								<span>Texto del enlace</span>
								<input type="text" bind:value={enlaceTexto} maxlength="40" placeholder="Ver el trámite" />
							</label>
						{/if}
					{/if}

					{#if ajustes.permitir_destacadas && destacadas.length}
						<label class="campo">
							<span>Guardar en una destacada</span>
							<select bind:value={destacadaId}>
								<option value={null}>No guardar</option>
								{#each destacadas as d (d.id)}
									<option value={d.id}>{d.titulo}</option>
								{/each}
							</select>
							<em>Guardada en una destacada, la historia sobrevive a su propia caducidad.</em>
						</label>
					{/if}
				{/if}

				<button type="button" class="principal" onclick={publicar} aria-disabled={enviando}>
					{enviando ? 'Publicando…' : 'Publicar la historia'}
				</button>

				<p class="firma">Se publicará como <strong>{cuenta?.nombre}</strong>.</p>
			</div>
		</div>
	{/if}
</div>

{#snippet formularioTexto()}
	{@const estado = { texto: '', color: 'papel', fondo: true }}
	<form
		class="alta"
		onsubmit={(e) => {
			e.preventDefault();
			const datos = new FormData(e.currentTarget);
			const texto = String(datos.get('texto') ?? '').trim();
			if (!texto) return;

			anadir({
				tipo: 'texto',
				contenido: {
					texto,
					color: String(datos.get('color') ?? 'papel'),
					fondo: datos.get('fondo') === 'on'
				},
				x: 0.5,
				y: 0.35,
				escala: 1,
				rotacion: 0
			});
		}}
	>
		<label>
			<span>Texto</span>
			<textarea name="texto" rows="2" maxlength="180" required value={estado.texto}></textarea>
		</label>

		<div class="fila">
			<label>
				<span>Color</span>
				<select name="color">
					<option value="papel">Papel sobre velo</option>
					<option value="carbon">Carbón sobre papel</option>
					<option value="selva">Verde de marca</option>
					<option value="achiote">Amarillo de marca</option>
				</select>
			</label>

			<label class="casilla">
				<input type="checkbox" name="fondo" checked />
				Con fondo
			</label>
		</div>

		<button type="submit">Añadir</button>
	</form>
{/snippet}

{#snippet formularioSticker()}
	<div class="alta">
		<p class="ayuda">
			El catálogo es cerrado a propósito: un rótulo sobre una fotografía municipal es una
			afirmación oficial.
		</p>

		<ul class="stickers">
			{#each STICKERS as s (s.clave)}
				<li>
					<button
						type="button"
						onclick={() =>
							anadir({
								tipo: 'sticker',
								contenido: { clave: s.clave, detalle: '' },
								x: 0.5,
								y: 0.7,
								escala: 1,
								rotacion: -4
							})}
					>
						{s.nombre}
					</button>
				</li>
			{/each}
		</ul>
	</div>
{/snippet}

{#snippet formularioEmoji()}
	<div class="alta">
		<p class="ayuda">
			OpenMoji, de acceso libre: al revés que el sticker, un emoji no afirma nada sobre el
			municipio, así que aquí no hay catálogo cerrado.
		</p>

		<SelectorEmoji
			elegir={(hexcode) =>
				anadir({
					tipo: 'emoji',
					contenido: { hexcode },
					x: 0.5,
					y: 0.4,
					escala: 1,
					rotacion: 0
				})}
		/>
	</div>
{/snippet}

{#snippet formularioImagen()}
	<div class="alta">
		<p class="ayuda">Se sube al catálogo de imágenes, igual que la fotografía de fondo.</p>

		<label class="boton-archivo boton-archivo-alta">
			Elegir del dispositivo
			<input
				type="file"
				accept="image/*"
				onchange={(e) => {
					const f = e.currentTarget.files?.[0];
					e.currentTarget.value = '';
					if (f) subirImagen(f);
					anadiendo = null;
				}}
			/>
		</label>

		<p class="ayuda">También puedes pegarla (Ctrl+V) o arrastrarla sobre el lienzo.</p>
	</div>
{/snippet}

{#snippet formularioEncuesta()}
	<form
		class="alta"
		onsubmit={(e) => {
			e.preventDefault();
			const datos = new FormData(e.currentTarget);
			const opciones = [datos.get('a'), datos.get('b'), datos.get('c'), datos.get('d')]
				.map((o) => String(o ?? '').trim())
				.filter(Boolean);

			if (opciones.length < 2) return;

			anadir({
				tipo: 'encuesta',
				contenido: {
					pregunta: String(datos.get('pregunta') ?? '').trim(),
					opciones,
					resultados_antes_de_votar: false
				},
				x: 0.5,
				y: 0.55,
				escala: 1,
				rotacion: 0
			});
		}}
	>
		<label>
			<span>Pregunta</span>
			<input name="pregunta" maxlength="100" required placeholder="¿Vienes a la minga del sábado?" />
		</label>

		<div class="fila">
			<label><span>Opción 1</span><input name="a" maxlength="30" required placeholder="Sí" /></label>
			<label><span>Opción 2</span><input name="b" maxlength="30" required placeholder="No puedo" /></label>
		</div>

		<div class="fila">
			<label><span>Opción 3 (opcional)</span><input name="c" maxlength="30" /></label>
			<label><span>Opción 4 (opcional)</span><input name="d" maxlength="30" /></label>
		</div>

		<p class="ayuda">
			El reparto de votos no se ve hasta votar: enseñar el resultado parcial arrastra el voto
			siguiente, y en una consulta municipal eso no es un detalle.
		</p>

		<button type="submit">Añadir</button>
	</form>
{/snippet}

{#snippet formularioPregunta()}
	<form
		class="alta"
		onsubmit={(e) => {
			e.preventDefault();
			const datos = new FormData(e.currentTarget);

			anadir({
				tipo: 'pregunta',
				contenido: {
					titulo: String(datos.get('titulo') ?? '').trim(),
					marcador: String(datos.get('marcador') ?? '').trim() || 'Escribe tu pregunta…'
				},
				x: 0.5,
				y: 0.55,
				escala: 1,
				rotacion: 0
			});
		}}
	>
		<label>
			<span>Encabezado</span>
			<input name="titulo" maxlength="100" required placeholder="¿Qué mejorarías del parque?" />
		</label>

		<label>
			<span>Texto de ayuda dentro de la caja</span>
			<input name="marcador" maxlength="60" placeholder="Escribe tu respuesta…" />
		</label>

		<p class="ayuda">
			Lo que escriba la gente lo lees sólo tú, desde el estudio. No se publica, y el aviso se lo
			enseñamos a quien responde.
		</p>

		<button type="submit">Añadir</button>
	</form>
{/snippet}

<style>
	.compositor {
		max-width: 34rem;
		margin-inline: auto;
		padding-bottom: 3rem;
	}

	.cabecera {
		display: grid;
		grid-template-columns: 44px 1fr auto;
		align-items: center;
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

	.zona {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		margin: 1.5rem 1rem;
		padding: 3rem 1.5rem;
		border: 2px dashed var(--borde);
		color: var(--texto-suave);
		text-align: center;
	}

	.titulo-zona {
		font-size: 1rem;
		font-weight: 700;
		color: var(--texto);
	}

	.pista {
		font-size: 0.82rem;
	}

	.boton-archivo {
		margin-top: 0.5rem;
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
		padding-inline: 1.1rem;
		background: var(--color-achiote-500);
		color: var(--color-carbon-900);
		font-size: 0.9rem;
		font-weight: 700;
		cursor: pointer;
	}

	.boton-archivo input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
	}

	.componer {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
	}

	.paleta {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.4rem;
	}

	.paleta button {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		min-height: 58px;
		padding: 0.4rem;
		border: 1px solid var(--borde);
		background: var(--superficie);
		color: var(--texto);
		font-family: inherit;
		font-size: 0.7rem;
		font-weight: 600;
		cursor: pointer;
	}

	.paleta button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.paleta button.activo {
		border-color: var(--marca);
		background: var(--superficie-alt);
		color: var(--marca);
	}

	.boton-archivo-alta {
		align-self: flex-start;
		margin-top: 0;
	}

	.alta {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		padding: 0.9rem;
		border: 1px solid var(--borde);
		background: var(--superficie-alt);
	}

	.alta label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--texto-suave);
	}

	.alta input,
	.alta textarea,
	.alta select {
		padding: 0.5rem 0.6rem;
		border: 1px solid var(--borde);
		background: var(--superficie);
		color: var(--texto);
		font-family: inherit;
		font-size: 0.88rem;
		font-weight: 400;
	}

	.alta input {
		min-height: 2.5rem;
	}

	.fila {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.6rem;
	}

	.casilla {
		flex-direction: row;
		align-items: center;
		gap: 0.4rem;
		align-self: end;
		min-height: 2.5rem;
	}

	.casilla input {
		min-height: auto;
		accent-color: var(--marca);
	}

	.alta > button[type='submit'] {
		min-height: 2.6rem;
		border: 1px solid var(--marca);
		background: none;
		color: var(--marca);
		font-family: inherit;
		font-size: 0.85rem;
		font-weight: 700;
		cursor: pointer;
	}

	.stickers {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.stickers button {
		min-height: 2.2rem;
		padding-inline: 0.65rem;
		border: 1px solid var(--borde);
		background: var(--superficie);
		color: var(--texto);
		font-family: inherit;
		font-size: 0.76rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.02em;
		cursor: pointer;
	}

	.stickers button:hover {
		border-color: var(--marca);
	}

	.opciones {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.campo {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--texto-suave);
	}

	.campo input,
	.campo select {
		min-height: 2.75rem;
		padding-inline: 0.7rem;
		border: 1px solid var(--borde);
		background: var(--superficie);
		color: var(--texto);
		font-family: inherit;
		font-size: 0.9rem;
		font-weight: 400;
	}

	.campo em {
		font-style: normal;
		font-size: 0.74rem;
		font-weight: 400;
		line-height: 1.45;
	}

	fieldset {
		border: none;
	}

	legend {
		margin-bottom: 0.4rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--texto-suave);
	}

	.duraciones {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.duraciones label {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		min-height: 2.3rem;
		padding-inline: 0.7rem;
		border: 1px solid var(--borde);
		font-size: 0.8rem;
		cursor: pointer;
	}

	.duraciones label.activa {
		border-color: var(--marca);
		font-weight: 700;
	}

	.duraciones input {
		accent-color: var(--marca);
	}

	.principal {
		min-height: 3rem;
		border: none;
		background: var(--color-achiote-500);
		color: var(--color-carbon-900);
		font-family: inherit;
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
	}

	.principal[aria-disabled='true'] {
		opacity: 0.6;
		cursor: progress;
	}

	.firma {
		font-size: 0.8rem;
		color: var(--texto-suave);
		text-align: center;
	}

	.ayuda,
	.nota {
		font-size: 0.76rem;
		line-height: 1.5;
		color: var(--texto-suave);
		font-weight: 400;
	}

	.error {
		margin: 0.75rem 1rem 0;
		padding: 0.6rem 0.8rem;
		border-left: 3px solid var(--color-error);
		background: var(--superficie-alt);
		font-size: 0.85rem;
		color: var(--color-error);
	}
</style>
