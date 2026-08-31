import type { Ciudadano } from './api';
import { misReacciones } from './misReacciones.svelte';

/**
 * Estado de la sesión ciudadana, compartido por todo el sitio.
 *
 * Una sola instancia con `$state`: cualquier componente que reaccione o
 * comente lee `sesion.autenticado` y, si hace falta, llama a
 * `sesion.pedirInicio()` — que abre la misma hoja de inicio de sesión desde
 * cualquier punto del sitio, montada una sola vez en el layout raíz.
 *
 * El propio token de Sanctum nunca pasa por aquí: vive en una cookie
 * httpOnly que gestiona `/api/sesion` del lado del servidor. Este módulo
 * sólo sabe si hay alguien identificado y quién es.
 */
class EstadoSesion {
	ciudadano = $state<Ciudadano | null>(null);
	cargando = $state(false);
	hojaAbierta = $state(false);
	error = $state<string | null>(null);

	get autenticado(): boolean {
		return this.ciudadano !== null;
	}

	/** Abre la hoja de inicio de sesión. Cualquier acción que la exija la llama antes de intentar nada. */
	pedirInicio(): void {
		this.error = null;
		this.hojaAbierta = true;
	}

	cerrarHoja(): void {
		this.hojaAbierta = false;
		this.error = null;
	}

	async iniciar(correo: string, password: string): Promise<boolean> {
		return this.enviar('/api/sesion', 'POST', { correo, password });
	}

	async registrar(nombre: string, correo: string, password: string): Promise<boolean> {
		return this.enviar('/api/registro', 'POST', { nombre, correo, password });
	}

	async salir(): Promise<void> {
		await fetch('/api/sesion', { method: 'DELETE' }).catch(() => null);
		this.ciudadano = null;
		misReacciones.reset();
	}

	private async enviar(ruta: string, metodo: string, cuerpo: Record<string, unknown>): Promise<boolean> {
		this.cargando = true;
		this.error = null;

		try {
			const res = await fetch(ruta, {
				method: metodo,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(cuerpo)
			});
			const datos = await res.json().catch(() => ({}));

			if (!res.ok) {
				const primerCampo = Object.values(datos?.errors ?? {})[0] as string[] | undefined;
				this.error = primerCampo?.[0] ?? datos?.message ?? 'Algo salió mal. Inténtalo otra vez.';
				return false;
			}

			this.ciudadano = datos.data;
			this.hojaAbierta = false;
			return true;
		} catch {
			this.error = 'No se pudo conectar. Revisa tu conexión e inténtalo otra vez.';
			return false;
		} finally {
			this.cargando = false;
		}
	}
}

export const sesion = new EstadoSesion();
