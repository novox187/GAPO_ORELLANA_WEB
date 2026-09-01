<script lang="ts">
	import { goto } from '$app/navigation';
	import { img } from '$lib/api';
	import IconoEstudio from '$lib/components/estudio/IconoEstudio.svelte';
	import EditorFoto from '$lib/components/estudio/EditorFoto.svelte';
	import { estudio, ErrorEstudio } from '$lib/estudio';
	import { sesionEstudio } from '$lib/sesionEstudio.svelte';

	/**
	 * Editar la ficha del perfil: avatar, portada, biografía y enlace.
	 *
	 * **El nombre y el @alias no se editan aquí, y su ausencia es la
	 * decisión.** El alias resuelve la URL pública del perfil: cambiarlo rompe
	 * todos los enlaces compartidos a esa cuenta, y en un municipio esos
	 * enlaces están en oficios, en carteles impresos y en el pie de una
	 * convocatoria que ya se repartió. El nombre viene del organigrama. Los
	 * dos se cambian desde el panel, con auditoría.
	 */
	let biografia = $state('');
	let enlace = $state('');
	let archivoAvatar = $state<File | null>(null);
	let archivoPortada = $state<File | null>(null);
	let recorteAvatar = $state<Blob | null>(null);
	let recortePortada = $state<Blob | null>(null);

	let guardando = $state(false);
	let error = $state<string | null>(null);
	let guardado = $state(false);
	let inicializado = $state(false);

	const cuenta = $derived(sesionEstudio.cuenta);

	/** Se rellena una vez por cuenta: con `$derived` se pisaría lo que se está escribiendo. */
	$effect(() => {
		const c = cuenta;

		if (c && !inicializado) {
			biografia = c.biografia ?? '';
			enlace = c.enlace_url ?? '';
			inicializado = true;
		}
	});

	async function guardar() {
		if (!cuenta) return;

		error = null;
		guardado = false;
		guardando = true;

		try {
			const campos: Record<string, unknown> = {
				biografia: biografia.trim(),
				enlace_url: enlace.trim() || null
			};

			if (recorteAvatar) {
				const medio = await estudio.subirMedio(recorteAvatar, 'avatar', `Logotipo de ${cuenta.nombre}`);
				campos.avatar_uid = medio.id;
			}

			if (recortePortada) {
				const medio = await estudio.subirMedio(recortePortada, 'portada', `Portada de ${cuenta.nombre}`);
				campos.portada_uid = medio.id;
			}

			await estudio.guardarPerfil(cuenta.alias, campos);
			await sesionEstudio.refrescar();

			archivoAvatar = null;
			archivoPortada = null;
			recorteAvatar = null;
			recortePortada = null;
			guardado = true;
		} catch (e) {
			error = e instanceof ErrorEstudio ? e.primero() : 'No se pudo guardar.';
		} finally {
			guardando = false;
		}
	}

	async function salir() {
		await sesionEstudio.salir();
		await goto('/estudio/entrar');
	}
</script>

<div class="ajustes">
	<h1>Ajustes de la cuenta</h1>

	{#if cuenta}
		<p class="identidad">
			<strong>{cuenta.nombre}</strong> · @{cuenta.alias}
		</p>

		<p class="nota">
			El nombre y el @alias no se cambian desde aquí: el alias es la dirección pública del perfil y
			está impreso en oficios y carteles. Se cambian desde el panel, con registro de quién lo hizo.
		</p>

		{#if error}<p class="error" role="alert">{error}</p>{/if}
		{#if guardado}<p class="exito" role="status">Guardado. Ya se ve en el sitio.</p>{/if}

		<section class="bloque">
			<h2>Foto de perfil</h2>

			{#if archivoAvatar}
				<EditorFoto archivo={archivoAvatar} proporcionInicial="1:1" mostrarSello={false} alCambiar={(b) => (recorteAvatar = b)} />
				<button type="button" class="quitar" onclick={() => ((archivoAvatar = null), (recorteAvatar = null))}>
					Cancelar el cambio
				</button>
			{:else}
				<div class="fila-media">
					<span class="avatar">
						{#if cuenta.avatar}<img src={img(cuenta.avatar, 400)} alt="" />{/if}
					</span>

					<label class="boton-archivo">
						Cambiar
						<input
							type="file"
							accept="image/*"
							onchange={(e) => (archivoAvatar = e.currentTarget.files?.[0] ?? null)}
						/>
					</label>
				</div>
			{/if}
		</section>

		<section class="bloque">
			<h2>Portada</h2>

			{#if archivoPortada}
				<EditorFoto archivo={archivoPortada} proporcionInicial="16:9" mostrarSello={false} alCambiar={(b) => (recortePortada = b)} />
				<button type="button" class="quitar" onclick={() => ((archivoPortada = null), (recortePortada = null))}>
					Cancelar el cambio
				</button>
			{:else}
				<div class="portada-actual">
					{#if cuenta.portada}
						<img src={img(cuenta.portada, 1600)} alt="" />
					{:else}
						<span class="vacia"><IconoEstudio nombre="imagen" tamano={26} /> Sin portada</span>
					{/if}
				</div>

				<label class="boton-archivo">
					Cambiar
					<input
						type="file"
						accept="image/*"
						onchange={(e) => (archivoPortada = e.currentTarget.files?.[0] ?? null)}
					/>
				</label>
			{/if}
		</section>

		<section class="bloque">
			<h2>Biografía</h2>

			<label class="campo">
				<span class="sr-only">Biografía</span>
				<textarea bind:value={biografia} rows="4" maxlength="400"></textarea>
				<em>{biografia.length} / 400</em>
			</label>

			<label class="campo">
				<span>Enlace</span>
				<input type="url" bind:value={enlace} maxlength="190" placeholder="https://orellana.gob.ec/…" />
			</label>
		</section>

		<button type="button" class="principal" onclick={guardar} aria-disabled={guardando}>
			{guardando ? 'Guardando…' : 'Guardar cambios'}
		</button>
	{/if}

	<section class="bloque sesion">
		<h2>Sesión</h2>
		<p class="nota">
			La sesión del estudio dura ocho horas. Es lo que da permiso de publicar en nombre del
			municipio: dura una jornada, no seis meses.
		</p>
		<button type="button" class="salir" onclick={salir}>
			<IconoEstudio nombre="salir" tamano={17} />
			Cerrar sesión
		</button>
	</section>
</div>

<style>
	.ajustes {
		max-width: 34rem;
		margin-inline: auto;
		padding: 1.25rem 1rem 3rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	h1 {
		font-size: 1.3rem;
		font-weight: 700;
		font-stretch: 108%;
	}

	h2 {
		font-size: 0.88rem;
		font-weight: 700;
		margin-bottom: 0.6rem;
	}

	.identidad {
		font-size: 0.9rem;
		color: var(--texto-suave);
	}

	.identidad strong {
		color: var(--texto);
	}

	.bloque {
		padding: 1rem;
		border: 1px solid var(--borde);
	}

	.fila-media {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.avatar {
		display: grid;
		place-items: center;
		width: 72px;
		height: 72px;
		overflow: hidden;
		border-radius: 999px;
		background: var(--superficie-alt);
	}

	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.portada-actual {
		aspect-ratio: 3 / 1;
		display: grid;
		place-items: center;
		overflow: hidden;
		margin-bottom: 0.6rem;
		background: var(--superficie-alt);
		color: var(--texto-suave);
	}

	.portada-actual img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.vacia {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.82rem;
	}

	.boton-archivo {
		display: inline-flex;
		align-items: center;
		min-height: 2.5rem;
		padding-inline: 0.9rem;
		border: 1px solid var(--borde);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
	}

	.boton-archivo:hover {
		border-color: var(--marca);
	}

	.boton-archivo input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
	}

	.boton-archivo:focus-within {
		outline: 3px solid var(--foco);
		outline-offset: 2px;
	}

	.campo {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--texto-suave);
	}

	.campo + .campo {
		margin-top: 0.85rem;
	}

	.campo textarea,
	.campo input {
		padding: 0.6rem 0.7rem;
		border: 1px solid var(--borde);
		background: var(--superficie);
		color: var(--texto);
		font-family: inherit;
		font-size: 0.9rem;
		font-weight: 400;
		line-height: 1.5;
		resize: vertical;
	}

	.campo input {
		min-height: 2.75rem;
	}

	.campo em {
		align-self: flex-end;
		font-style: normal;
		font-size: 0.72rem;
		font-weight: 400;
		font-variant-numeric: tabular-nums;
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

	.quitar,
	.salir {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		min-height: 2.5rem;
		margin-top: 0.6rem;
		padding-inline: 0.85rem;
		border: 1px solid var(--borde);
		background: none;
		color: var(--texto);
		font-family: inherit;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
	}

	.nota {
		font-size: 0.78rem;
		line-height: 1.55;
		color: var(--texto-suave);
	}

	.error,
	.exito {
		padding: 0.6rem 0.8rem;
		border-left: 3px solid var(--color-error);
		background: var(--superficie-alt);
		font-size: 0.85rem;
		color: var(--color-error);
	}

	.exito {
		border-left-color: var(--marca);
		color: var(--marca);
	}
</style>
