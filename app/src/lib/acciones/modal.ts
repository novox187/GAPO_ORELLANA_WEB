import type { Action } from 'svelte/action';

interface OpcionesModal {
	/** Se invoca con Escape o al tocar fuera. */
	alCerrar: () => void;
	/**
	 * Qué enfocar al abrir. Por defecto, el primer elemento focalizable —
	 * que casi nunca es el que conviene: en un panel de navegación interesa
	 * el botón de cerrar, no el primer enlace.
	 */
	focoInicial?: () => HTMLElement | null | undefined;
}

const FOCALIZABLES =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Convierte un elemento en diálogo modal: trampa de foco, cierre con
 * Escape, bloqueo del scroll de fondo y devolución del foco al cerrar.
 *
 * Va como acción y no como efecto porque el ciclo de vida que necesitamos
 * es exactamente el del elemento: se aplica cuando el panel se monta y
 * `destroy` deshace todo cuando se desmonta. Con un `$effect` sobre un
 * booleano hay que distinguir a mano el estado inicial de un cierre real,
 * y olvidarlo significa robarle el foco al documento en cada carga de
 * página.
 *
 * Quien lo use sigue teniendo que poner `role="dialog"`, `aria-modal` y un
 * nombre accesible: esto gobierna el comportamiento, no la semántica.
 */
export const modal: Action<HTMLElement, OpcionesModal> = (nodo, opciones) => {
	let actuales = opciones;

	// El elemento que tenía el foco al abrir: casi siempre el botón pulsado.
	const devolverA = document.activeElement as HTMLElement | null;

	// Bloqueo del scroll de fondo, compensando el ancho de la barra de
	// desplazamiento para que la página no dé un salto lateral al abrir.
	const anchoBarra = window.innerWidth - document.documentElement.clientWidth;
	const overflowPrevio = document.body.style.overflow;
	const paddingPrevio = document.body.style.paddingRight;
	document.body.style.overflow = 'hidden';
	if (anchoBarra > 0) document.body.style.paddingRight = `${anchoBarra}px`;

	// En microtarea: al aplicarse la acción el contenido del panel puede no
	// estar aún en el DOM, y `bind:this` de los hijos todavía no ha corrido.
	queueMicrotask(() => {
		const destino = actuales.focoInicial?.() ?? nodo.querySelector<HTMLElement>(FOCALIZABLES);
		(destino ?? nodo).focus();
	});

	function alPulsarTecla(evento: KeyboardEvent) {
		if (evento.key === 'Escape') {
			evento.preventDefault();
			actuales.alCerrar();
			return;
		}

		if (evento.key !== 'Tab') return;

		// Un diálogo modal no puede dejar que el tabulador se escape a la
		// página de detrás: quien navega con teclado o con lector de pantalla
		// se perdería en contenido que visualmente no existe.
		const focalizables = [...nodo.querySelectorAll<HTMLElement>(FOCALIZABLES)].filter(
			(e) => e.offsetParent !== null || e === document.activeElement
		);
		if (!focalizables.length) return;

		const primero = focalizables[0];
		const ultimo = focalizables[focalizables.length - 1];

		if (evento.shiftKey && document.activeElement === primero) {
			evento.preventDefault();
			ultimo.focus();
		} else if (!evento.shiftKey && document.activeElement === ultimo) {
			evento.preventDefault();
			primero.focus();
		}
	}

	nodo.addEventListener('keydown', alPulsarTecla);

	return {
		update(nuevas: OpcionesModal) {
			actuales = nuevas;
		},
		destroy() {
			nodo.removeEventListener('keydown', alPulsarTecla);
			document.body.style.overflow = overflowPrevio;
			document.body.style.paddingRight = paddingPrevio;
			// Sin esto el foco cae en <body> y quien navega con teclado vuelve
			// al principio del documento en vez de a donde estaba.
			devolverA?.focus();
		}
	};
};
