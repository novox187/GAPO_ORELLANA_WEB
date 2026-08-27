import type { Action } from 'svelte/action';

/**
 * Revela un bloque cuando entra en el viewport.
 *
 * El elemento se marca oculto *desde JavaScript*, no desde el HTML. Si el
 * script no llega a ejecutarse (red caída a mitad de carga, JS bloqueado
 * por una red institucional restrictiva), el contenido se ve igual: nunca
 * queda una sección invisible por culpa de una animación. Es la diferencia
 * entre progresivo y frágil, y en un sitio municipal importa.
 *
 * Se desconecta tras revelar: la entrada ocurre una vez, no cada vez que
 * el bloque vuelve a cruzar el borde.
 */
export const revelar: Action<HTMLElement, { retraso?: number } | undefined> = (nodo, opciones) => {
	const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (reducido || !('IntersectionObserver' in window)) return;

	if (opciones?.retraso) nodo.style.setProperty('--retraso', `${opciones.retraso}ms`);
	nodo.dataset.oculto = 'si';

	const observador = new IntersectionObserver(
		(entradas) => {
			for (const e of entradas) {
				if (!e.isIntersecting) continue;
				nodo.dataset.visible = 'si';
				observador.disconnect();
			}
		},
		// 12 % de margen inferior negativo: el bloque entra cuando ya está
		// francamente dentro, no al asomar el primer píxel.
		{ rootMargin: '0px 0px -12% 0px', threshold: 0.05 }
	);

	observador.observe(nodo);

	return {
		destroy() {
			observador.disconnect();
		}
	};
};

/**
 * Cuenta un número de 0 a su valor final cuando el elemento aparece.
 *
 * Escribe en textContent en vez de en un estado de Svelte: son ~60
 * escrituras por segundo por contador y pasar cada una por el ciclo de
 * reactividad no aporta nada. El valor final ya está en el HTML servido,
 * así que sin JS la cifra se lee correcta desde el primer pintado.
 */
export const contar: Action<
	HTMLElement,
	{ hasta: number; decimales?: number; agrupar?: boolean }
> = (nodo, opciones) => {
	const formato = new Intl.NumberFormat('es-EC', {
		minimumFractionDigits: opciones.decimales ?? 0,
		maximumFractionDigits: opciones.decimales ?? 0,
		// Un año (1969) no se agrupa; una población (72.795) sí.
		useGrouping: opciones.agrupar ?? true
	});

	const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (reducido || !('IntersectionObserver' in window)) return;

	const observador = new IntersectionObserver(
		(entradas) => {
			for (const e of entradas) {
				if (!e.isIntersecting) continue;
				observador.disconnect();
				animar();
			}
		},
		{ threshold: 0.35 }
	);

	function animar() {
		const duracion = 1100;
		const inicio = performance.now();

		const paso = (ahora: number) => {
			const t = Math.min((ahora - inicio) / duracion, 1);
			// easeOutExpo: arranca rápido y frena, que es como se lee un marcador.
			const suave = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
			nodo.textContent = formato.format(opciones.hasta * suave);
			if (t < 1) requestAnimationFrame(paso);
		};

		requestAnimationFrame(paso);
	}

	observador.observe(nodo);

	return {
		destroy() {
			observador.disconnect();
		}
	};
};
