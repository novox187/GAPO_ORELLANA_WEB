import { SvelteSet } from 'svelte/reactivity';

/**
 * «¿Yo qué hice con esto?», en lote.
 *
 * El feed y los perfiles se leen sin autenticar —son contenido público y así
 * se cachean—, así que la respuesta no puede decir si quien mira ya reaccionó,
 * ya guardó o ya sigue. Cada componente se apunta al montar y una única
 * petición, unos milisegundos después, resuelve de golpe todo lo que hay en
 * pantalla. Sin el lote sería una petición por tarjeta.
 *
 * Esta clase generaliza el patrón que estrenó `misReacciones`. Las tres cosas
 * que se preguntan son distintas pero el mecanismo es idéntico, y tenerlo
 * escrito tres veces garantizaba que las tres acabaran comportándose distinto.
 */
export class MarcasPropias {
	/** Las claves marcadas: slugs de publicación o alias de cuenta. */
	vistas = new SvelteSet<string>();

	private consultadas = new Set<string>();
	private pendientes = new Set<string>();
	private temporizador: ReturnType<typeof setTimeout> | null = null;

	/**
	 * @param consultar Resuelve, de las claves dadas, cuáles están marcadas.
	 * @param espera Milisegundos que se acumulan antes de preguntar.
	 */
	constructor(
		private readonly consultar: (claves: string[]) => Promise<string[]>,
		private readonly espera = 30
	) {}

	pedir(clave: string): void {
		if (this.consultadas.has(clave) || this.pendientes.has(clave)) return;

		this.pendientes.add(clave);

		this.temporizador ??= setTimeout(() => this.despachar(), this.espera);
	}

	/** Optimista, desde el propio botón: no espera a `pedir()`. */
	marcar(clave: string, activa: boolean): void {
		this.consultadas.add(clave);

		if (activa) this.vistas.add(clave);
		else this.vistas.delete(clave);
	}

	/** Al cerrar sesión: lo de una persona no debe sobrevivir a la siguiente en el mismo navegador. */
	reset(): void {
		this.vistas.clear();
		this.consultadas.clear();
		this.pendientes.clear();
	}

	private async despachar(): Promise<void> {
		const claves = [...this.pendientes];
		this.pendientes.clear();
		this.temporizador = null;

		try {
			const marcadas = await this.consultar(claves);

			for (const c of claves) this.consultadas.add(c);
			for (const c of marcadas) this.vistas.add(c);
		} catch {
			// Sin red: no se marcan como consultadas y se reintenta al próximo montaje.
		}
	}
}
