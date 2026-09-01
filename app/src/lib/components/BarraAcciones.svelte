<script lang="ts">
	import type { PublicacionResumen, PublicacionSocial } from '$lib/api';
	import { ErrorEscritura, social } from '$lib/api';
	import { sesion } from '$lib/sesion.svelte';
	import { misReacciones } from '$lib/misReacciones.svelte';
	import { misGuardados } from '$lib/misGuardados.svelte';
	import { registrar } from '$lib/metricas';

	/**
	 * La fila de iconos y el recuento de reacciones — nada más. El pie de
	 * foto, el enlace a comentarios y la fecha los compone cada página
	 * alrededor de este componente, en el orden de Instagram (iconos →
	 * recuento → pie → comentarios → fecha), porque ese orden cambia según
	 * el contexto: en el feed hace falta un enlace a comentarios que en la
	 * ficha de la publicación sobra, porque el hilo ya está debajo.
	 *
	 * Reaccionar ya es un botón de verdad —con la identidad ciudadana en su
	 * sitio, dejó de ser el «botón que no hace nada» que TarjetaFeed evitaba
	 * a propósito—. Sin sesión, pulsarlo abre la hoja de inicio de sesión en
	 * vez de fingir que reaccionó.
	 *
	 * El corazón propio («¿ya reaccioné yo?») vive en `misReacciones`, no
	 * aquí: la API pública del feed no lo dice —eso exigiría autenticar
	 * también las lecturas—, así que se pide aparte, en lote, y este
	 * componente sólo lee el resultado compartido. El total sí es siempre
	 * el real del servidor.
	 */
	let { publicacion }: { publicacion: PublicacionResumen | PublicacionSocial } = $props();

	const reaccionado = $derived(misReacciones.vistas.has(publicacion.slug));
	const guardado = $derived(misGuardados.vistas.has(publicacion.slug));
	let total = $state(publicacion.reacciones_contador);
	let enviando = $state(false);
	let guardando = $state(false);
	let copiado = $state(false);

	$effect(() => {
		if (sesion.autenticado) {
			misReacciones.pedir(publicacion.slug);
			misGuardados.pedir(publicacion.slug);
		}
	});

	async function alReaccionar() {
		if (!sesion.autenticado) {
			sesion.pedirInicio();
			return;
		}
		if (enviando) return;

		// Optimista: el corazón cambia antes de que responda el servidor, y
		// se revierte si la petición falla.
		const previo = reaccionado;
		misReacciones.marcar(publicacion.slug, !previo);
		total += previo ? -1 : 1;
		enviando = true;

		try {
			const r = previo ? await social.quitarReaccion(publicacion.slug) : await social.reaccionar(publicacion.slug);
			total = (r as { data: { total: number } }).data.total;
		} catch (e) {
			misReacciones.marcar(publicacion.slug, previo);
			total = publicacion.reacciones_contador;
			if (e instanceof ErrorEscritura && e.estado === 401) sesion.pedirInicio();
		} finally {
			enviando = false;
		}
	}

	/**
	 * Guardar para después.
	 *
	 * Privado de verdad: no toca ningún contador de la publicación ni aparece
	 * en las estadísticas de quien publicó. En un sitio municipal la función
	 * tiene un uso muy concreto —«el aviso del cierre de la vía, que lo
	 * necesito el jueves»— y ese uso se rompe en cuanto guardar se convierte
	 * en una señal que alguien más ve.
	 */
	async function alGuardar() {
		if (!sesion.autenticado) {
			sesion.pedirInicio();

			return;
		}

		if (guardando) return;

		const previo = guardado;
		misGuardados.marcar(publicacion.slug, !previo);
		guardando = true;

		try {
			if (previo) await social.quitarGuardado(publicacion.slug);
			else await social.guardar(publicacion.slug);
		} catch (e) {
			misGuardados.marcar(publicacion.slug, previo);
			if (e instanceof ErrorEscritura && e.estado === 401) sesion.pedirInicio();
		} finally {
			guardando = false;
		}
	}

	async function compartir() {
		const url = new URL(publicacion.url, location.origin).href;
		const titulo = publicacion.tipo === 'nota' ? publicacion.titulo : publicacion.pie;
		const datos = { title: titulo, text: publicacion.tipo === 'nota' ? publicacion.resumen : '', url };
		// Compartir sí se mide: es de los pocos gestos que dicen que algo llegó
		// más allá de quien lo vio. Se registra antes del diálogo del sistema,
		// que puede no devolver nunca el control si la persona cambia de app.
		registrar({ tipo: 'compartido', recurso: 'publicacion', id: publicacion.slug });

		try {
			if (navigator.share) {
				await navigator.share(datos);
				return;
			}
			await navigator.clipboard.writeText(url);
			copiado = true;
			setTimeout(() => (copiado = false), 2200);
		} catch {
			// El usuario canceló el diálogo, o el navegador bloqueó el portapapeles.
		}
	}
</script>

<div class="flex items-center gap-1 px-3 pt-2.5">
	{#if publicacion.permite_reacciones}
		<button
			type="button"
			onclick={alReaccionar}
			aria-pressed={reaccionado}
			aria-disabled={enviando}
			class="icono-accion"
			class:corazon-activo={reaccionado}
		>
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill={reaccionado ? 'currentColor' : 'none'}
				aria-hidden="true"
				class="transition-transform duration-150"
				class:scale-110={reaccionado}
			>
				<path
					d="M12 20.2s-7.4-4.5-9.6-8.9A5 5 0 0 1 12 6.3 5 5 0 0 1 21.6 11.3c-2.2 4.4-9.6 8.9-9.6 8.9Z"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linejoin="round"
				/>
			</svg>
			<span class="sr-only">{reaccionado ? 'Quitar reacción' : 'Reaccionar'}</span>
		</button>
	{/if}

	<a href="{publicacion.url}#comentarios" class="icono-accion" aria-label="Ir a los comentarios">
		<svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path
				d="M4.5 6.5A2 2 0 0 1 6.5 4.5h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4 3.5v-3.5H6.5a2 2 0 0 1-2-2Z"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linejoin="round"
			/>
		</svg>
	</a>

	<button type="button" onclick={compartir} class="icono-accion" aria-label={copiado ? 'Enlace copiado' : 'Compartir'}>
		<svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path
				d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 15V3m0 0L8 7m4-4 4 4"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	</button>

	<!-- Guardar va al final y separado del resto, como en cualquier red
	     social: los tres primeros son gestos hacia fuera —reaccionar,
	     comentar, compartir— y este es hacia dentro. -->
	<button
		type="button"
		onclick={alGuardar}
		aria-pressed={guardado}
		aria-disabled={guardando}
		class="icono-accion guardar"
	>
		<svg width="22" height="22" viewBox="0 0 24 24" fill={guardado ? 'currentColor' : 'none'} aria-hidden="true">
			<path
				d="M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-4.4-6.5 4.4v-16a1 1 0 0 1 1-1Z"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linejoin="round"
			/>
		</svg>
		<span class="sr-only">{guardado ? 'Quitar de guardados' : 'Guardar para después'}</span>
	</button>
</div>

{#if publicacion.permite_reacciones && total > 0}
	<p class="px-3 pt-1 text-[0.86rem] font-bold">
		{total} {total === 1 ? 'reacción' : 'reacciones'}
	</p>
{/if}

<style>
	.icono-accion {
		display: inline-flex;
		min-height: 44px;
		min-width: 44px;
		align-items: center;
		justify-content: center;
		margin-inline: -0.375rem;
		cursor: pointer;
		color: var(--texto);
		text-decoration: none;
		transition: opacity 0.15s ease-out;
	}

	.icono-accion:hover {
		opacity: 0.6;
	}

	.corazon-activo {
		color: var(--color-error);
	}

	.guardar {
		margin-left: auto;
	}

	@media (prefers-reduced-motion: reduce) {
		.icono-accion svg {
			transition: none !important;
		}
	}
</style>
