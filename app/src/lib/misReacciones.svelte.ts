import { SvelteSet } from 'svelte/reactivity';

/**
 * Qué publicaciones ya reaccionó el ciudadano de esta sesión — el corazón
 * necesita saberlo al montar, no sólo después de pulsarlo. La lectura
 * pública del feed no lo dice (no autentica), así que esto pide sólo lo que
 * hace falta: cada `BarraAcciones` se apunta al montar con `pedir()`, y una
 * única petición por lote —30 ms después, cuando ya se apuntaron todas las
 * de la tanda visible— resuelve todos los slugs pendientes juntos, en vez
 * de una petición por tarjeta.
 */
class MisReacciones {
	vistas = new SvelteSet<string>();
	private consultados = new Set<string>();
	private pendientes = new Set<string>();
	private temporizador: ReturnType<typeof setTimeout> | null = null;

	pedir(slug: string): void {
		if (this.consultados.has(slug) || this.pendientes.has(slug)) return;
		this.pendientes.add(slug);
		if (this.temporizador) return;
		this.temporizador = setTimeout(() => this.despachar(), 30);
	}

	/** Optimista, desde el propio botón de reaccionar: no espera a `pedir()`. */
	marcar(slug: string, reaccionado: boolean): void {
		this.consultados.add(slug);
		if (reaccionado) this.vistas.add(slug);
		else this.vistas.delete(slug);
	}

	/** Al cerrar sesión: lo que reaccionó esta persona no debe sobrevivir a la siguiente en el mismo navegador. */
	reset(): void {
		this.vistas.clear();
		this.consultados.clear();
		this.pendientes.clear();
	}

	private async despachar(): Promise<void> {
		const slugs = [...this.pendientes];
		this.pendientes.clear();
		this.temporizador = null;

		try {
			const res = await fetch(`/api/mis-reacciones?slugs=${slugs.map(encodeURIComponent).join(',')}`);
			if (!res.ok) return;
			const { data } = (await res.json()) as { data: string[] };
			for (const s of slugs) this.consultados.add(s);
			for (const s of data) this.vistas.add(s);
		} catch {
			// Sin red: no se marca como consultado, se reintenta en el próximo montaje.
		}
	}
}

export const misReacciones = new MisReacciones();
