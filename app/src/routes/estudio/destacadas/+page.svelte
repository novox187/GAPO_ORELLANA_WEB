<script lang="ts">
	import { img, type Destacada } from '$lib/api';
	import IconoEstudio from '$lib/components/estudio/IconoEstudio.svelte';
	import { estudio, ErrorEstudio, type HistoriaEstudio } from '$lib/estudio';
	import { sesionEstudio } from '$lib/sesionEstudio.svelte';

	/**
	 * Las destacadas del perfil, de principio a fin.
	 *
	 * Antes sólo se podían crear —un aro con un título y nada dentro—, así que
	 * lo que quedaba en el perfil era un círculo gris sin explicación. Crear
	 * una destacada sin poder meterle historias es la mitad de una función, y
	 * la mitad que no se ve.
	 *
	 * Aquí está entera: crear, renombrar, elegir portada, meter y sacar
	 * historias, y borrar. Y explicada, porque su utilidad no se deduce del
	 * aro: una historia dura tres días y **guardarla en una destacada la salva
	 * de su propia caducidad**. En un municipio eso es la diferencia entre que
	 * «cómo sacar la patente» exista todo el año o desaparezca el jueves.
	 *
	 * Las historias que se ofrecen incluyen las ya caducadas, y no es un
	 * descuido: la decisión de guardar una suele tomarse al día siguiente,
	 * cuando ya expiró. El backend las devuelve por eso mismo.
	 */
	let destacadas = $state<Destacada[]>([]);
	let historias = $state<HistoriaEstudio[]>([]);
	let cargando = $state(true);
	let error = $state<string | null>(null);

	/** Cuál se está editando; `nueva` mientras se escribe el título de una. */
	let abierta = $state<number | 'nueva' | null>(null);
	let titulo = $state('');
	let trabajando = $state(false);

	const cuenta = $derived(sesionEstudio.cuenta);

	$effect(() => {
		const alias = cuenta?.alias;
		if (!alias) return;

		let vigente = true;
		cargando = true;

		Promise.all([estudio.destacadas(alias), estudio.historias(alias)])
			.then(([d, h]) => {
				if (!vigente) return;
				destacadas = d.data;
				historias = h.data;
			})
			.catch((e) => vigente && (error = e instanceof Error ? e.message : 'No se pudo cargar.'))
			.finally(() => vigente && (cargando = false));

		return () => {
			vigente = false;
		};
	});

	/** Qué historias hay dentro de una destacada, por su id. */
	function dentroDe(destacada: Destacada): Set<number> {
		return new Set((destacada.historias ?? []).map((h) => h.id));
	}

	async function crear() {
		if (!cuenta || !titulo.trim()) return;

		trabajando = true;
		error = null;

		try {
			const { data } = await estudio.crearDestacada(cuenta.alias, titulo.trim());
			destacadas = [...destacadas, data];
			titulo = '';
			// Se queda abierta la recién creada: lo siguiente que hay que
			// hacer es meterle historias, y si se cerrara volveríamos al aro
			// vacío que motivó todo esto.
			abierta = data.id;
		} catch (e) {
			error = e instanceof ErrorEstudio ? e.primero() : 'No se pudo crear.';
		} finally {
			trabajando = false;
		}
	}

	async function renombrar(destacada: Destacada, nuevo: string) {
		const limpio = nuevo.trim();
		if (!limpio || limpio === destacada.titulo) return;

		try {
			const { data } = await estudio.actualizarDestacada(destacada.id, { titulo: limpio });
			destacadas = destacadas.map((d) => (d.id === data.id ? { ...d, titulo: data.titulo } : d));
		} catch (e) {
			error = e instanceof ErrorEstudio ? e.primero() : 'No se pudo renombrar.';
		}
	}

	async function alternar(destacada: Destacada, historia: HistoriaEstudio) {
		if (!historia.id) return;

		const guardar = !dentroDe(destacada).has(historia.id);
		trabajando = true;
		error = null;

		try {
			const { data } = await estudio.guardarEnDestacada(destacada.id, historia.id, guardar);
			destacadas = destacadas.map((d) => (d.id === data.id ? data : d));
		} catch (e) {
			error = e instanceof ErrorEstudio ? e.primero() : 'No se pudo guardar.';
		} finally {
			trabajando = false;
		}
	}

	async function portada(destacada: Destacada, historia: HistoriaEstudio) {
		try {
			const { data } = await estudio.actualizarDestacada(destacada.id, { portada_uid: historia.medio.id });
			destacadas = destacadas.map((d) => (d.id === data.id ? { ...d, portada: data.portada } : d));
		} catch (e) {
			error = e instanceof ErrorEstudio ? e.primero() : 'No se pudo cambiar la portada.';
		}
	}

	async function borrar(destacada: Destacada) {
		if (!confirm(`¿Quitar la destacada «${destacada.titulo}»? Las historias que tenga dentro vuelven a su caducidad; no se borran.`)) {
			return;
		}

		try {
			await estudio.borrarDestacada(destacada.id);
			destacadas = destacadas.filter((d) => d.id !== destacada.id);
			abierta = null;
		} catch (e) {
			error = e instanceof ErrorEstudio ? e.primero() : 'No se pudo quitar.';
		}
	}

	function cuando(h: HistoriaEstudio): string {
		if (!h.publicado_en) return '';

		return new Date(h.publicado_en).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' });
	}
</script>

<div class="pantalla">
	<header class="cabecera">
		<a href="/estudio" class="icono" aria-label="Volver al perfil">
			<IconoEstudio nombre="atras" />
		</a>

		<h1>Destacadas</h1>

		<span></span>
	</header>

	{#if error}
		<p class="error" role="alert">{error}</p>
	{/if}

	<p class="explicacion">
		Una historia dura tres días y luego desaparece. Guardarla en una destacada la deja fija en el
		perfil, sin caducidad: es donde viven <strong>«Cómo sacar la patente»</strong>,
		<strong>«Horarios de recolección»</strong> o <strong>«Obras en tu barrio»</strong> — lo que se
		pregunta todo el año.
	</p>

	{#if cargando}
		<p class="cargando">Cargando…</p>
	{:else}
		<ul class="lista">
			{#each destacadas as d (d.id)}
				{@const dentro = dentroDe(d)}
				<li class="tarjeta" class:abierta={abierta === d.id}>
					<div class="fila">
						<span class="circulo">
							{#if d.portada}
								<img src={img(d.portada, 400)} alt="" />
							{:else}
								<IconoEstudio nombre="historia" tamano={20} />
							{/if}
						</span>

						<span class="datos">
							<strong>{d.titulo}</strong>
							<em>
								{dentro.size}
								{dentro.size === 1 ? 'historia' : 'historias'}
								{#if dentro.size === 0}· todavía vacía{/if}
							</em>
						</span>

						<button
							type="button"
							class="gestionar"
							aria-expanded={abierta === d.id}
							onclick={() => (abierta = abierta === d.id ? null : d.id)}
						>
							{abierta === d.id ? 'Cerrar' : 'Gestionar'}
						</button>
					</div>

					{#if abierta === d.id}
						<div class="panel">
							<label class="campo">
								<span>Nombre</span>
								<input
									type="text"
									value={d.titulo}
									maxlength="40"
									onblur={(e) => renombrar(d, e.currentTarget.value)}
								/>
							</label>

							<p class="ayuda">
								Toca una historia para meterla o sacarla. Las que ya caducaron también sirven — de
								hecho es lo normal: guardar una se decide al día siguiente.
							</p>

							{#if historias.length === 0}
								<p class="vacio">
									Todavía no has publicado ninguna historia. <a href="/estudio/historia">Publica la primera</a>
									y vuelve aquí a guardarla.
								</p>
							{:else}
								<ul class="rejilla">
									{#each historias as h (h.id)}
										{@const guardada = h.id !== undefined && dentro.has(h.id)}
										<li>
											<button
												type="button"
												class="pieza"
												class:guardada
												disabled={trabajando}
												aria-pressed={guardada}
												onclick={() => alternar(d, h)}
											>
												<img src={img(h.medio, 400)} alt="" />

												{#if guardada}
													<span class="marca" aria-hidden="true">✓</span>
												{/if}

												<span class="fecha">{cuando(h)}</span>
											</button>

											{#if guardada}
												<button type="button" class="portada" onclick={() => portada(d, h)}>
													Portada
												</button>
											{/if}
										</li>
									{/each}
								</ul>
							{/if}

							<button type="button" class="borrar" onclick={() => borrar(d)}>
								<IconoEstudio nombre="basura" tamano={15} />
								Quitar esta destacada
							</button>
						</div>
					{/if}
				</li>
			{/each}
		</ul>

		{#if abierta === 'nueva'}
			<form
				class="alta"
				onsubmit={(e) => {
					e.preventDefault();
					crear();
				}}
			>
				<label class="campo">
					<span>Nombre de la destacada</span>
					<!-- svelte-ignore a11y_autofocus -->
					<input
						type="text"
						bind:value={titulo}
						maxlength="40"
						required
						autofocus
						placeholder="Cómo sacar la patente"
					/>
				</label>

				<div class="acciones-alta">
					<button type="button" class="secundario" onclick={() => ((abierta = null), (titulo = ''))}>
						Cancelar
					</button>
					<button type="submit" class="principal" disabled={!titulo.trim() || trabajando}>
						{trabajando ? 'Creando…' : 'Crear'}
					</button>
				</div>
			</form>
		{:else}
			<button type="button" class="nueva" onclick={() => (abierta = 'nueva')}>
				<IconoEstudio nombre="mas" tamano={18} />
				Nueva destacada
			</button>
		{/if}
	{/if}
</div>

<style>
	.pantalla {
		max-width: 34rem;
		margin-inline: auto;
		padding-bottom: 3rem;
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

	.explicacion {
		padding: 1rem;
		color: var(--texto-suave);
		font-size: 0.85rem;
		line-height: 1.6;
	}

	.explicacion strong {
		color: var(--texto);
		font-weight: 600;
	}

	.cargando {
		padding: 2rem 1rem;
		color: var(--texto-suave);
		font-size: 0.9rem;
		text-align: center;
	}

	.lista {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding-inline: 1rem;
	}

	.tarjeta {
		border: var(--canto);
		background: var(--superficie);
	}

	.tarjeta.abierta {
		border-color: var(--marca);
	}

	.fila {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
	}

	.circulo {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 48px;
		height: 48px;
		overflow: hidden;
		border-radius: 999px;
		border: var(--canto);
		background: var(--superficie-alt);
		color: var(--texto-suave);
	}

	.circulo img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.datos {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		flex: 1;
		min-width: 0;
	}

	.datos strong {
		font-size: 0.92rem;
		font-weight: 700;
	}

	.datos em {
		font-style: normal;
		font-size: 0.76rem;
		color: var(--texto-suave);
	}

	.gestionar {
		flex-shrink: 0;
		min-height: 2.2rem;
		padding-inline: 0.7rem;
		border: var(--canto);
		background: var(--superficie-alt);
		color: var(--texto);
		font-family: inherit;
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
	}

	.panel {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0 0.75rem 0.85rem;
		border-top: var(--canto);
		padding-top: 0.85rem;
	}

	.campo {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.campo > span {
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--texto-suave);
	}

	.campo input {
		min-height: 2.6rem;
		padding-inline: 0.65rem;
		border: var(--canto);
		background: var(--superficie);
		color: var(--texto);
		font-family: inherit;
		font-size: 0.9rem;
	}

	.ayuda,
	.vacio {
		color: var(--texto-suave);
		font-size: 0.76rem;
		line-height: 1.5;
	}

	.vacio a {
		color: var(--enlace);
		font-weight: 600;
	}

	.rejilla {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(4.5rem, 1fr));
		gap: 0.4rem;
	}

	.pieza {
		position: relative;
		display: block;
		width: 100%;
		aspect-ratio: 9 / 16;
		padding: 0;
		overflow: hidden;
		border: 2px solid transparent;
		background: var(--superficie-alt);
		cursor: pointer;
	}

	.pieza img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* Guardada se marca por borde Y por palomita, no sólo por color: con una
	   rejilla de fotografías, un filete de color se pierde contra según qué
	   imagen. */
	.pieza.guardada {
		border-color: var(--marca);
	}

	.pieza:disabled {
		cursor: progress;
	}

	.marca {
		position: absolute;
		top: 0.25rem;
		right: 0.25rem;
		display: grid;
		place-items: center;
		width: 1.35rem;
		height: 1.35rem;
		border-radius: 999px;
		background: var(--marca);
		color: var(--color-papel);
		font-size: 0.75rem;
		font-weight: 700;
	}

	.fecha {
		position: absolute;
		inset: auto 0 0 0;
		padding: 0.15rem 0.3rem;
		background: rgb(30 31 29 / 0.6);
		color: var(--color-papel);
		font-size: 0.62rem;
		text-align: center;
	}

	.portada {
		width: 100%;
		min-height: 1.7rem;
		border: none;
		background: none;
		color: var(--enlace);
		font-family: inherit;
		font-size: 0.68rem;
		font-weight: 600;
		cursor: pointer;
	}

	.borrar {
		display: inline-flex;
		align-self: flex-start;
		align-items: center;
		gap: 0.35rem;
		min-height: 2.2rem;
		padding-inline: 0.6rem;
		border: var(--canto);
		background: none;
		color: var(--color-error);
		font-family: inherit;
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
	}

	.alta {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin: 0.75rem 1rem 0;
		padding: 0.85rem;
		border: var(--canto);
		background: var(--superficie-alt);
	}

	.acciones-alta {
		display: flex;
		gap: 0.5rem;
	}

	.principal,
	.secundario {
		flex: 1;
		min-height: 2.6rem;
		border: 1px solid transparent;
		font-family: inherit;
		font-size: 0.85rem;
		font-weight: 700;
		cursor: pointer;
	}

	.principal {
		background: var(--color-achiote-500);
		color: var(--color-carbon-900);
	}

	.principal:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.secundario {
		border-color: var(--borde);
		background: none;
		color: var(--texto);
	}

	.nueva {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0.75rem 1rem 0;
		min-height: 2.75rem;
		padding-inline: 0.9rem;
		border: 1px dashed var(--borde);
		background: none;
		color: var(--texto);
		font-family: inherit;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
	}

	.error {
		margin: 0.75rem 1rem 0;
		padding: 0.6rem 0.8rem;
		border-left: 3px solid var(--color-error);
		background: var(--superficie-alt);
		color: var(--color-error);
		font-size: 0.85rem;
	}
</style>
