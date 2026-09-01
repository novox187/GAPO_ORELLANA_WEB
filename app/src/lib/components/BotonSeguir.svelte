<script lang="ts">
	import { ErrorEscritura, social, type Cuenta } from '$lib/api';
	import { sesion } from '$lib/sesion.svelte';
	import { misSeguimientos } from '$lib/misSeguimientos.svelte';

	/**
	 * Seguir a una cuenta municipal.
	 *
	 * No es un adorno de red social: es lo que convierte «seguidores» en una
	 * cifra real del perfil, y lo que permitirá algún día ordenar el feed por
	 * lo que cada vecino eligió recibir en vez de por la fecha. Hasta
	 * entonces, seguir dice algo por sí solo — cuántas personas quieren
	 * enterarse de lo que hace esta dirección.
	 *
	 * Sin sesión no finge: abre la hoja de inicio de sesión, igual que el
	 * corazón. Un botón que parece funcionar y no guarda nada es peor que uno
	 * que pide identificarse.
	 */
	let {
		cuenta,
		compacto = false,
		alCambiarTotal
	}: {
		cuenta: Cuenta;
		compacto?: boolean;
		/**
		 * El total nuevo tras seguir o dejar de seguir. Lo pide la cabecera del
		 * perfil: sin esto, pulsar «Seguir» dejaba la cifra de al lado clavada
		 * en el valor que trajo el servidor, y la contradicción entre el botón
		 * y el número se veía a simple vista.
		 */
		alCambiarTotal?: (total: number) => void;
	} = $props();

	const siguiendo = $derived(misSeguimientos.vistas.has(cuenta.alias));

	/*
	 | Arranca en cero y lo pone el efecto de abajo, no el inicializador: al
	 | navegar de un perfil a otro SvelteKit reutiliza este componente, y con
	 | el valor capturado al montar el segundo perfil enseñaría los seguidores
	 | del primero hasta que alguien pulsara.
	 */
	let total = $state(0);
	let enviando = $state(false);

	$effect(() => {
		total = cuenta.seguidores_contador ?? 0;
	});

	$effect(() => {
		alCambiarTotal?.(total);
	});

	$effect(() => {
		if (sesion.autenticado) misSeguimientos.pedir(cuenta.alias);
	});

	async function alternar() {
		if (!sesion.autenticado) {
			sesion.pedirInicio();

			return;
		}

		if (enviando) return;

		const previo = siguiendo;
		misSeguimientos.marcar(cuenta.alias, !previo);
		total += previo ? -1 : 1;
		enviando = true;

		try {
			const r = previo ? await social.dejarDeSeguir(cuenta.alias) : await social.seguir(cuenta.alias);
			total = r.data.seguidores;
		} catch (e) {
			misSeguimientos.marcar(cuenta.alias, previo);
			total = cuenta.seguidores_contador ?? 0;
			if (e instanceof ErrorEscritura && e.estado === 401) sesion.pedirInicio();
		} finally {
			enviando = false;
		}
	}
</script>

<button
	type="button"
	class="seguir"
	class:siguiendo
	class:compacto
	aria-pressed={siguiendo}
	aria-disabled={enviando}
	onclick={alternar}
>
	{siguiendo ? 'Siguiendo' : 'Seguir'}
</button>

<style>
	.seguir {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 36px;
		padding-inline: 1.1rem;
		border: 1px solid transparent;
		background: var(--color-achiote-500);
		color: var(--color-carbon-900);
		font-family: inherit;
		font-size: 0.85rem;
		font-weight: 700;
		cursor: pointer;
		transition:
			background-color 0.15s ease-out,
			border-color 0.15s ease-out;
	}

	/*
	  Siguiendo pasa a contorno: el estado activo es el discreto, no el
	  llamativo. Al revés —relleno cuando ya sigues— el botón grita justo
	  cuando ya no hay nada que pedirle a nadie.
	*/
	.seguir.siguiendo {
		background: none;
		border-color: var(--borde);
		color: var(--texto);
	}

	.seguir.siguiendo:hover {
		border-color: var(--color-error);
		color: var(--color-error);
	}

	.seguir.compacto {
		min-height: 30px;
		padding-inline: 0.8rem;
		font-size: 0.78rem;
	}

	.seguir[aria-disabled='true'] {
		opacity: 0.65;
	}

	@media (prefers-reduced-motion: reduce) {
		.seguir {
			transition: none;
		}
	}
</style>
