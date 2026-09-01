import { browser } from '$app/environment';

/**
 * La medición desde el navegador.
 *
 * Tres reglas que definen este módulo:
 *
 * 1. **Nunca bloquea ni rompe.** Todo va en lotes diferidos y todos los
 *    fallos se tragan. Una página municipal no puede quedarse en blanco
 *    porque la analítica tuvo un mal día.
 *
 * 2. **Nada identifica a nadie desde aquí.** No se genera ni se guarda ningún
 *    identificador de visitante en el navegador —ni cookie, ni localStorage—.
 *    El seudónimo lo calcula el servidor a partir de datos que ya tiene y no
 *    guarda (ver RegistroMetricas en el backend). Este archivo sólo dice
 *    «esto se vio»; quién lo vio no es asunto suyo.
 *
 * 3. **Se envía tarde y junto.** Un `fetch` por publicación que entra en
 *    pantalla serían docenas de peticiones al bajar por el feed. Se acumulan
 *    y salen cada pocos segundos, y el último lote sale con `sendBeacon` al
 *    ocultarse la pestaña —lo único que sobrevive a que alguien cierre.
 */
export type TipoEvento =
	| 'impresion'
	| 'visita'
	| 'reproduccion'
	| 'compartido'
	| 'enlace'
	| 'apertura_historia'
	| 'visita_perfil';

export type Recurso = 'publicacion' | 'historia' | 'cuenta';

export type Origen = 'feed' | 'perfil' | 'ficha' | 'historia' | 'externo';

interface Evento {
	tipo: TipoEvento;
	recurso: Recurso;
	id: string;
	origen?: Origen;
}

const RUTA = '/api/metricas';

/** Cada cuánto sale un lote mientras la página está viva. */
const INTERVALO = 4000;

/** Tope del lote, el mismo que acepta el backend. */
const MAXIMO = 40;

let cola: Evento[] = [];
let temporizador: ReturnType<typeof setTimeout> | null = null;
let escuchando = false;

/**
 * Lo ya enviado en esta página, para no repetir.
 *
 * El servidor deduplica también —es quien puede hacerlo de verdad, entre
 * pestañas y recargas— pero filtrar aquí ahorra el viaje: el observador de
 * intersección dispara cada vez que una tarjeta vuelve a entrar en pantalla,
 * y bajar y subir por el feed generaría el mismo evento una docena de veces.
 */
const yaEnviados = new Set<string>();

export function registrar(evento: Evento): void {
	if (!browser) return;

	// Compartir y pulsar un enlace son actos deliberados: si alguien lo hace
	// dos veces, son dos. El resto se manda una sola vez por página.
	const repetible = evento.tipo === 'compartido' || evento.tipo === 'enlace';
	const clave = `${evento.tipo}:${evento.recurso}:${evento.id}`;

	if (!repetible) {
		if (yaEnviados.has(clave)) return;
		yaEnviados.add(clave);
	}

	cola.push(evento);
	escuchar();

	if (cola.length >= MAXIMO) {
		vaciar();

		return;
	}

	temporizador ??= setTimeout(vaciar, INTERVALO);
}

/**
 * Marca una publicación como vista cuando entra de verdad en pantalla.
 *
 * «De verdad» es lo que decide si el número significa algo: la mitad del
 * elemento visible durante medio segundo. Sin el umbral de tiempo, pasar el
 * dedo rápido por el feed contaría como haber visto quince publicaciones;
 * sin el de área, contaría una que asoma dos píxeles por el borde.
 *
 * Devuelve la función de limpieza que espera un `$effect` de Svelte.
 */
export function observarImpresion(
	nodo: HTMLElement,
	evento: Evento,
	{ ms = 500, area = 0.5 } = {}
): () => void {
	if (!browser || !('IntersectionObserver' in window)) return () => {};

	let espera: ReturnType<typeof setTimeout> | null = null;

	const observador = new IntersectionObserver(
		([entrada]) => {
			if (entrada?.isIntersecting) {
				espera ??= setTimeout(() => {
					registrar(evento);
					observador.disconnect();
				}, ms);
			} else if (espera) {
				clearTimeout(espera);
				espera = null;
			}
		},
		{ threshold: area }
	);

	observador.observe(nodo);

	return () => {
		if (espera) clearTimeout(espera);
		observador.disconnect();
	};
}

function escuchar(): void {
	if (escuchando || !browser) return;
	escuchando = true;

	// `visibilitychange` y no `beforeunload`: en móvil, cerrar una pestaña o
	// cambiar de aplicación no siempre dispara `beforeunload`, y en iOS casi
	// nunca. `hidden` es el único momento fiable.
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') vaciar(true);
	});
}

function vaciar(cerrando = false): void {
	if (temporizador) {
		clearTimeout(temporizador);
		temporizador = null;
	}

	if (cola.length === 0) return;

	const lote = cola.slice(0, MAXIMO);
	cola = cola.slice(MAXIMO);

	const cuerpo = JSON.stringify({ eventos: lote });

	try {
		if (cerrando && navigator.sendBeacon) {
			// Lo único que sobrevive a que la pestaña se cierre. Contra el
			// propio origen no dispara comprobación previa de CORS.
			navigator.sendBeacon(RUTA, new Blob([cuerpo], { type: 'application/json' }));

			return;
		}

		void fetch(RUTA, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: cuerpo,
			keepalive: true
		}).catch(() => null);
	} catch {
		// Sin red, con el almacenamiento bloqueado, o con la API ausente: el
		// lote se pierde. Es medición, no contenido.
	}
}
