<script lang="ts">
	import { img } from '$lib/api';
	import Insignia from '$lib/components/Insignia.svelte';
	import { sesionEstudio } from '$lib/sesionEstudio.svelte';

	/**
	 * En qué cuenta se está trabajando.
	 *
	 * Sólo aparece para administración, que es la única que puede actuar en
	 * nombre de otra cuenta sin entrar con su contraseña. Quien lleva una
	 * dirección ve el nombre de la suya y nada más: un selector con una sola
	 * opción es un control que no hace nada — el sitio público ya decidió no
	 * tener ninguno de esos.
	 *
	 * Es un `<select>` nativo y no un menú propio: en móvil abre la rueda del
	 * sistema, que se maneja con el pulgar y ya sabe todo el mundo usar, y en
	 * escritorio funciona con teclado sin que haya que escribirlo.
	 */
	let { compacto = false }: { compacto?: boolean } = $props();

	const cuenta = $derived(sesionEstudio.cuenta);
</script>

{#if cuenta}
	<div class="selector" class:compacto>
		<span class="avatar">
			{#if cuenta.avatar}
				<img src={img(cuenta.avatar, 400)} alt="" />
			{:else}
				<span aria-hidden="true">{cuenta.nombre.slice(0, 1)}</span>
			{/if}
		</span>

		{#if sesionEstudio.puedeCambiarDePerfil && sesionEstudio.variasCuentas}
			<label class="envoltura">
				<span class="sr-only">Cuenta en la que publicas</span>
				<select
					value={cuenta.alias}
					onchange={(e) => sesionEstudio.cambiarCuenta(e.currentTarget.value)}
				>
					{#each sesionEstudio.creador?.cuentas ?? [] as c (c.alias)}
						<option value={c.alias}>{c.nombre}</option>
					{/each}
				</select>
			</label>
		{:else}
			<span class="nombre">
				{cuenta.nombre}
				{#if cuenta.verificada}<Insignia tamano={13} />{/if}
			</span>
		{/if}
	</div>
{/if}

<style>
	.selector {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		min-width: 0;
	}

	/* Mismo tratamiento que el avatar grande del perfil: verde de marca y la
	   inicial en papel. Con el gris de superficie, la misma cuenta se veía de
	   dos maneras distintas en la misma pantalla. */
	.avatar {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 30px;
		height: 30px;
		overflow: hidden;
		border-radius: 999px;
		background: var(--color-selva-800);
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--color-papel);
	}

	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.envoltura {
		min-width: 0;
	}

	select {
		max-width: 100%;
		padding: 0.2rem 0.15rem;
		border: none;
		background: transparent;
		color: var(--texto);
		font-family: inherit;
		font-size: 0.85rem;
		font-weight: 700;
		cursor: pointer;
	}

	select:focus-visible {
		outline: 2px solid var(--foco);
		outline-offset: 2px;
	}

	.nombre {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		min-width: 0;
		font-size: 0.85rem;
		font-weight: 700;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.compacto .nombre,
	.compacto select {
		font-size: 0.8rem;
	}
</style>
