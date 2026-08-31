<script lang="ts">
	import type { Cuenta } from '$lib/api';
	import Avatar from './Avatar.svelte';

	/**
	 * La bandeja de historias, sobre el feed. Cada anillo lleva a su propia
	 * ruta (`/noticias/historias/{alias}`), no a un modal que este componente
	 * abra: así una historia se puede compartir y enlazar, y el botón atrás
	 * del navegador hace lo que promete.
	 *
	 * El desplazamiento es scroll nativo con `scroll-snap`, nunca un
	 * manejador de arrastre propio: secuestrar el gesto horizontal en un
	 * sitio que ya scrollea verticalmente es la fuente de conflicto de gestos
	 * más común en móvil.
	 *
	 * Sin ninguna historia activa no se esconde la bandeja entera: se
	 * muestra un esqueleto — la misma fila, con aros apagados en vez de
	 * fotos — para que quien entra sepa que el formato existe aunque hoy no
	 * tenga nada que mostrar. Esconderla del todo es indistinguible de "esto
	 * no existe"; el esqueleto dice "existe, hoy está vacío".
	 */
	let { cuentas }: { cuentas: Cuenta[] } = $props();

	/**
	 * Historias ya vistas, recordadas en este dispositivo. Es un detalle de
	 * cortesía por viewer, no estado que importe compartir: por eso vive en
	 * localStorage y no en la API.
	 */
	function vista(alias: string): boolean {
		try {
			return localStorage.getItem(`historia-vista:${alias}`) === '1';
		} catch {
			return false;
		}
	}
</script>

{#if cuentas.length}
	<nav aria-label="Historias de la Alcaldía y las direcciones" class="carrusel -mx-1 flex gap-4 overflow-x-auto px-1 pt-2 pb-3">
		{#each cuentas as c (c.id)}
			<a
				href="/noticias/historias/{c.alias}"
				class="item flex w-16 shrink-0 flex-col items-center gap-1 text-center no-underline"
			>
				<Avatar cuenta={c} tamano={60} conAnillo visto={vista(c.alias)} />
				<span class="w-full truncate text-[0.68rem] leading-tight text-[var(--texto-suave)]">
					{c.tipo === 'alcaldia' ? 'Alcaldía' : c.nombre.replace(/^Dirección de /i, '')}
				</span>
			</a>
		{/each}
	</nav>
{:else}
	<div class="carrusel -mx-1 flex gap-4 overflow-x-auto px-1 pt-2 pb-3" aria-hidden="true">
		{#each { length: 6 } as _, i (i)}
			<div class="flex w-16 shrink-0 flex-col items-center gap-1">
				<span class="esqueleto-aro grid size-[60px] place-items-center rounded-full">
					<span class="block size-[54px] rounded-full bg-[var(--superficie-alt)]"></span>
				</span>
				<span class="esqueleto-linea h-[0.55rem] w-10 rounded-full bg-[var(--superficie-alt)]"></span>
			</div>
		{/each}
	</div>
	<p class="-mt-1 mb-2 text-[0.78rem] text-[var(--texto-suave)]">
		Aquí aparecerán las historias de la Alcaldía y las direcciones cuando publiquen alguna.
	</p>
{/if}

<style>
	.carrusel {
		scroll-snap-type: x proximity;
		scrollbar-width: none;
	}

	.carrusel::-webkit-scrollbar {
		display: none;
	}

	.item {
		scroll-snap-align: start;
	}

	/* Aro sin foto: el mismo espesor que el anillo real, en el color de
	   borde en vez del cono de teselas. Se nota que ahí falta un anillo,
	   no que sea un anillo distinto. */
	.esqueleto-aro {
		padding: 2.5px;
		background: var(--borde);
	}

	.esqueleto-aro,
	.esqueleto-linea {
		animation: respiro-esqueleto 2.2s ease-in-out infinite;
	}

	.esqueleto-linea {
		animation-delay: 0.15s;
	}

	@keyframes respiro-esqueleto {
		0%,
		100% {
			opacity: 0.6;
		}
		50% {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.esqueleto-aro,
		.esqueleto-linea {
			animation: none;
			opacity: 0.8;
		}
	}
</style>
