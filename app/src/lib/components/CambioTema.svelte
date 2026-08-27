<script lang="ts">
	import { onMount } from 'svelte';

	/**
	 * Conmutador de tema. El icono visible se resuelve por CSS (media query
	 * + data-theme), no por JavaScript: así aparece correcto ya en el primer
	 * pintado, sin el parpadeo típico de leer el estado tras hidratar.
	 *
	 * El JS solo cambia el atributo, lo persiste y mantiene la etiqueta
	 * accesible al día.
	 */
	let tema = $state<'light' | 'dark' | null>(null);

	function temaEfectivo(): 'light' | 'dark' {
		const fijado = document.documentElement.dataset.theme;
		if (fijado === 'light' || fijado === 'dark') return fijado;
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	onMount(() => {
		tema = temaEfectivo();

		// Si el visitante no ha elegido, seguir los cambios del sistema.
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const alCambiar = () => {
			if (!document.documentElement.dataset.theme) tema = mq.matches ? 'dark' : 'light';
		};
		mq.addEventListener('change', alCambiar);
		return () => mq.removeEventListener('change', alCambiar);
	});

	function alternar() {
		const nuevo = temaEfectivo() === 'dark' ? 'light' : 'dark';
		document.documentElement.dataset.theme = nuevo;
		tema = nuevo;
		try {
			localStorage.setItem('tema', nuevo);
		} catch {
			// Almacenamiento bloqueado: el cambio vale para esta sesión.
		}
	}

	// Antes de montar no se conoce el tema real, así que la etiqueta es
	// neutra en lugar de arriesgar una descripción equivocada.
	const etiqueta = $derived(
		tema === null
			? 'Cambiar entre modo claro y oscuro'
			: tema === 'dark'
				? 'Cambiar a modo claro'
				: 'Cambiar a modo oscuro'
	);
</script>

<button
	type="button"
	onclick={alternar}
	class="conmutador inline-flex h-10 w-10 items-center justify-center border border-[var(--borde)] transition-colors hover:border-[var(--marca)] hover:text-[var(--marca)]"
	aria-label={etiqueta}
	title={etiqueta}
>
	<!-- Luna: visible en modo claro (la acción es pasar a oscuro) -->
	<svg
		class="icono-luna"
		width="17"
		height="17"
		viewBox="0 0 24 24"
		fill="none"
		aria-hidden="true"
	>
		<path
			d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z"
			stroke="currentColor"
			stroke-width="2"
			stroke-linejoin="round"
		/>
	</svg>

	<!-- Sol: visible en modo oscuro (la acción es pasar a claro) -->
	<svg class="icono-sol" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
		<circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="2" />
		<path
			d="M12 2.6v2.2M12 19.2v2.2M4.2 12H2M22 12h-2.2M6.3 6.3 4.8 4.8M19.2 19.2l-1.5-1.5M17.7 6.3l1.5-1.5M4.8 19.2l1.5-1.5"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
		/>
	</svg>
</button>

<style>
	/* Estado por defecto (claro): luna visible, sol oculto. */
	.conmutador .icono-sol {
		display: none;
	}

	@media (prefers-color-scheme: dark) {
		:global(:root:not([data-theme='light'])) .conmutador .icono-luna {
			display: none;
		}
		:global(:root:not([data-theme='light'])) .conmutador .icono-sol {
			display: block;
		}
	}

	:global(:root[data-theme='dark']) .conmutador .icono-luna {
		display: none;
	}
	:global(:root[data-theme='dark']) .conmutador .icono-sol {
		display: block;
	}

	/* La elección explícita de modo claro gana sobre la media query. */
	:global(:root[data-theme='light']) .conmutador .icono-luna {
		display: block;
	}
	:global(:root[data-theme='light']) .conmutador .icono-sol {
		display: none;
	}
</style>
