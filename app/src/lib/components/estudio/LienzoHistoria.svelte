<script lang="ts">
	import { onMount } from 'svelte';
	import Konva from 'konva';
	import { animate } from 'motion';
	import IconoEstudio from './IconoEstudio.svelte';
	import { STICKERS } from './stickers';
	import type { ElementoHistoria } from '$lib/estudio';

	/**
	 * El lienzo del compositor de historias: la fotografía a 9:16 y encima
	 * los elementos, sobre un `<canvas>` de Konva en vez de DOM.
	 *
	 * Antes este archivo pintaba con el MISMO componente que el visor
	 * público (`ElementoHistoria.svelte`) y por eso la previsualización era
	 * exacta, no una aproximación. Konva no puede reutilizar ese componente
	 * —dibuja en un `<canvas>`, no en el DOM— así que la garantía se movió
	 * un nivel más abajo: ya no es «mismo código», es «mismos datos»
	 * (`x`/`y`/`escala`/`rotacion`, fracción del lienzo) interpretados por
	 * dos motores de dibujo distintos que tienen que coincidir en el
	 * resultado. Konva gana lo que el DOM no daba gratis: capas de verdad,
	 * arrastre y transformación nativos con asas reales, y un trazo a mano
	 * alzada que en DOM habría necesitado reinventar la captura de puntero
	 * pixel a pixel.
	 *
	 * El teclado y un lector de pantalla no pueden entrar en un `<canvas>`
	 * —son píxeles, no elementos—, así que la tira de «Capas» de abajo es la
	 * ÚNICA vía accesible para seleccionar, mover y quitar: no un añadido de
	 * cortesía, es el camino que reemplaza lo que antes hacía el propio
	 * elemento arrastrable como `<button>`.
	 */
	let {
		fondo,
		elementos = $bindable<ElementoHistoria[]>([]),
		seleccionado = $bindable<number | null>(null),
		dibujando = $bindable(false),
		subirImagen
	}: {
		fondo: string;
		elementos?: ElementoHistoria[];
		seleccionado?: number | null;
		/** Armado desde la paleta: mientras esté a `true` el lienzo capta trazos en vez de arrastrar elementos. */
		dibujando?: boolean;
		/** Sube un archivo y, si sale bien, añade un elemento de imagen — vive en la página para compartir el mismo `estudio.subirMedio` que ya usa la fotografía de fondo. */
		subirImagen: (archivo: File) => void;
	} = $props();

	const ROTULOS: Record<string, string> = Object.fromEntries(STICKERS.map((s) => [s.clave, s.nombre]));
	const MAX_TRAZOS = 12;
	const MAX_PUNTOS_POR_TRAZO = 480;
	const ZOOM_MIN = 1;
	const ZOOM_MAX = 3;

	let marco = $state<HTMLDivElement | null>(null);
	let contenedor = $state<HTMLDivElement | null>(null);
	let zoomActual = $state(1);

	let stage: Konva.Stage | null = null;
	let capaFondo: Konva.Layer;
	let capaElementos: Konva.Layer;
	let capaDibujo: Konva.Layer;
	let transformador: Konva.Transformer;
	let grupos: (Konva.Group | null)[] = [];
	let longitudAnterior = 0;
	let observador: ResizeObserver | null = null;

	let colorTrazo = $state('#1E1F1D');
	let grosorTrazo = $state(0.012);
	let trazoActual: Konva.Line | null = null;
	let trazosPendientes = $state<{ puntos: number[]; color: string; grosor: number }[]>([]);
	let pellizco: { distancia: number; centro: { x: number; y: number } } | null = null;

	/** Tokens del sistema Mosaico leídos del CSS: Konva pinta con valores de verdad, no con variables, y así sigue el tema claro/oscuro sin duplicar la paleta a mano. */
	let colores = $state({
		papel: '#fbfaf6',
		carbon: '#1e1f1d',
		selva: '#0c843a',
		achiote: '#f6d907'
	});

	const PALETA_TRAZO = [
		{ clave: 'carbon', valor: '#1E1F1D' },
		{ clave: 'papel', valor: '#FBFAF6' },
		{ clave: 'selva', valor: '#0C843A' },
		{ clave: 'achiote', valor: '#F6D907' }
	];

	/** Cómo se anuncia cada elemento en la tira de capas, a quien no puede verlo en el lienzo. */
	function etiquetaDe(e: ElementoHistoria): string {
		const c = e.contenido as Record<string, unknown>;

		return (
			{
				texto: `Texto: ${c.texto ?? ''}`,
				sticker: `Sticker: ${ROTULOS[c.clave as string] ?? c.clave ?? ''}`,
				encuesta: `Encuesta: ${c.pregunta ?? ''}`,
				pregunta: `Caja de preguntas: ${c.titulo ?? ''}`,
				emoji: 'Emoji',
				dibujo: 'Dibujo',
				imagen: 'Imagen'
			}[e.tipo] ?? 'Elemento'
		);
	}

	onMount(() => {
		const estilo = getComputedStyle(document.documentElement);
		const leer = (v: string, reserva: string) => estilo.getPropertyValue(v).trim() || reserva;

		colores = {
			papel: leer('--color-papel', colores.papel),
			carbon: leer('--color-carbon-900', colores.carbon),
			selva: leer('--color-selva-800', colores.selva),
			achiote: leer('--color-achiote-500', colores.achiote)
		};

		construirEscenario();

		observador = new ResizeObserver(() => sincronizarTamano());
		if (contenedor) observador.observe(contenedor);

		document.addEventListener('paste', manejarPaste);
		contenedor?.addEventListener('touchmove', manejarTouchMove, { passive: false });
		contenedor?.addEventListener('touchend', manejarTouchEnd);
		contenedor?.addEventListener('touchcancel', manejarTouchEnd);

		return () => {
			observador?.disconnect();
			document.removeEventListener('paste', manejarPaste);
			contenedor?.removeEventListener('touchmove', manejarTouchMove);
			contenedor?.removeEventListener('touchend', manejarTouchEnd);
			contenedor?.removeEventListener('touchcancel', manejarTouchEnd);
			stage?.destroy();
		};
	});

	function construirEscenario() {
		if (!contenedor) return;

		const ancho = contenedor.clientWidth;
		const alto = (ancho * 16) / 9;

		stage = new Konva.Stage({ container: contenedor, width: ancho, height: alto });

		capaFondo = new Konva.Layer({ listening: false });
		capaElementos = new Konva.Layer();
		capaDibujo = new Konva.Layer();
		stage.add(capaFondo, capaElementos, capaDibujo);

		transformador = new Konva.Transformer({
			rotateEnabled: true,
			keepRatio: true,
			enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
			anchorSize: 16,
			anchorCornerRadius: 8,
			anchorStroke: colores.carbon,
			anchorFill: colores.papel,
			borderStroke: colores.achiote,
			borderDash: [4, 4],
			// Sólo evita que un redimensionado colapse la caja a la nada; el
			// clamp de verdad (0.2..4, el mismo rango que acepta el backend)
			// se aplica una vez en `confirmarTransform`, al soltar. Compararlo
			// contra la caja ANTERIOR aquí es una trampa: en el primer ajuste,
			// nada más seleccionar, Konva llama con una caja anterior de
			// anchura 0 — dividir por eso da Infinity y la caja de verdad
			// queda rechazada para siempre, con las asas colapsadas en un
			// punto en vez de rodear el elemento.
			boundBoxFunc: (cajaAnterior, cajaNueva) => {
				if (cajaNueva.width < 12 || cajaNueva.height < 12) return cajaAnterior;
				return cajaNueva;
			}
		});
		// En la MISMA capa que los elementos que selecciona: Konva calcula
		// la caja de las asas a partir del `getClientRect` del nodo relativo
		// a su propia capa, así que un Transformer en una capa aparte ve una
		// caja degenerada — asas todas apiladas en un punto, sin borde.
		capaElementos.add(transformador);

		dibujarFondo();

		stage.on('click tap', (e) => {
			if (e.target === stage) seleccionado = null;
		});

		stage.on('wheel', (e) => {
			e.evt.preventDefault();
			const direccion = e.evt.deltaY > 0 ? -1 : 1;
			const centro = stage!.getPointerPosition() ?? { x: stage!.width() / 2, y: stage!.height() / 2 };
			aplicarZoom(1 + direccion * 0.08, centro);
		});

		stage.on('pointerdown', (e) => {
			if (!dibujando) return;
			if (e.evt.pointerType === 'mouse' && e.evt.button !== 0) return;
			const pos = stage!.getRelativePointerPosition();
			if (pos) empezarTrazo(pos);
		});
		stage.on('pointermove', () => {
			if (!dibujando || !trazoActual) return;
			const pos = stage!.getRelativePointerPosition();
			if (pos) continuarTrazo(pos);
		});
		stage.on('pointerup pointercancel', () => {
			if (dibujando) terminarTrazo();
		});

		reconstruir();
	}

	function dibujarFondo() {
		if (!stage) return;

		const img = new window.Image();
		img.onload = () => {
			capaFondo.destroyChildren();
			capaFondo.add(new Konva.Image({ image: img, width: stage!.width(), height: stage!.height() }));
			capaFondo.batchDraw();
		};
		img.src = fondo;
	}

	function sincronizarTamano() {
		if (!stage || !contenedor) return;

		const ancho = contenedor.clientWidth;
		const alto = (ancho * 16) / 9;
		if (Math.abs(stage.width() - ancho) < 1) return;

		stage.width(ancho);
		stage.height(alto);
		restablecerZoom();
		dibujarFondo();
		reconstruir();
	}

	$effect(() => {
		// Referenciar `fondo` para que un recorte nuevo repinte la fotografía sin reconstruir los elementos.
		void fondo;
		if (stage) dibujarFondo();
	});

	$effect(() => {
		void elementos;
		void seleccionado;
		if (stage) reconstruir();
	});

	$effect(() => {
		const activo = dibujando;
		for (const g of grupos) g?.draggable(!activo);
		if (activo) seleccionado = null;
		else {
			trazosPendientes = [];
			capaDibujo?.destroyChildren();
			capaDibujo?.batchDraw();
		}
	});

	function reconstruir() {
		if (!stage) return;

		// Sólo se destruyen los nodos de elementos, nunca `destroyChildren()`
		// en la capa entera: eso se llevaría también al Transformer, que
		// vive en la misma capa y no sobrevive a su propio `destroy()`.
		for (const g of grupos) g?.destroy();
		grupos = [];

		const esNuevo = elementos.length > longitudAnterior;
		longitudAnterior = elementos.length;

		elementos.forEach((elemento, i) => {
			const grupo = construirNodo(elemento, i);
			capaElementos.add(grupo);
			grupos[i] = grupo;

			if (esNuevo && i === elementos.length - 1) {
				const destino = elemento.escala;
				grupo.scale({ x: 0, y: 0 });
				animate(0, destino, {
					type: 'spring',
					stiffness: 340,
					damping: 20,
					onUpdate: (v) => {
						grupo.scale({ x: v, y: v });
						capaElementos.batchDraw();
					}
				});
			}
		});

		transformador.moveToTop();
		transformador.nodes(seleccionado !== null && grupos[seleccionado] ? [grupos[seleccionado]!] : []);
		capaElementos.batchDraw();
	}

	function construirNodo(elemento: ElementoHistoria, indice: number): Konva.Group {
		const anchoL = stage!.width();
		const altoL = stage!.height();

		const grupo = new Konva.Group({
			x: elemento.x * anchoL,
			y: elemento.y * altoL,
			scaleX: elemento.escala,
			scaleY: elemento.escala,
			rotation: elemento.rotacion,
			draggable: !dibujando
		});

		const c = elemento.contenido as Record<string, never>;

		switch (elemento.tipo) {
			case 'texto':
				nodoTexto(grupo, c, anchoL);
				break;
			case 'sticker':
				nodoSticker(grupo, c, anchoL);
				break;
			case 'emoji':
				nodoEmoji(grupo, c, anchoL);
				break;
			case 'dibujo':
				nodoDibujo(grupo, c, anchoL, altoL);
				break;
			case 'imagen':
				nodoImagen(grupo, c, anchoL);
				break;
			case 'encuesta':
				nodoTarjeta(grupo, String(c.pregunta ?? ''), `${((c.opciones as string[]) ?? []).length} opciones`, anchoL);
				break;
			case 'pregunta':
				nodoTarjeta(grupo, String(c.titulo ?? ''), 'Caja de preguntas', anchoL);
				break;
		}

		grupo.on('click tap', (e) => {
			e.cancelBubble = true;
			if (!dibujando) seleccionado = indice;
		});
		grupo.on('dragend', () => confirmarTransform(grupo, indice));
		grupo.on('transformend', () => confirmarTransform(grupo, indice));

		return grupo;
	}

	function confirmarTransform(grupo: Konva.Group, indice: number) {
		if (!stage) return;

		const x = Math.max(0.04, Math.min(0.96, grupo.x() / stage.width()));
		const y = Math.max(0.04, Math.min(0.96, grupo.y() / stage.height()));
		const escala = Math.max(0.2, Math.min(4, grupo.scaleX()));

		let rotacion = Math.round(grupo.rotation()) % 360;
		if (rotacion > 180) rotacion -= 360;
		if (rotacion < -180) rotacion += 360;

		elementos[indice] = { ...elementos[indice], x, y, escala, rotacion };
	}

	// --------------------------------------------------------- constructores de nodo

	function nodoTexto(grupo: Konva.Group, c: Record<string, never>, anchoL: number) {
		const color = String(c.color ?? 'papel');
		const conFondo = c.fondo !== false;
		const alineacion = String(c.alineacion ?? 'centro');
		const align = alineacion === 'izquierda' ? 'left' : alineacion === 'derecha' ? 'right' : 'center';

		const relleno: Record<string, string> = {
			papel: colores.papel,
			carbon: colores.carbon,
			selva: colores.papel,
			achiote: colores.carbon
		};
		const fondos: Record<string, string> = {
			papel: 'rgba(30,31,29,0.55)',
			carbon: 'rgba(251,250,246,0.88)',
			selva: colores.selva,
			achiote: colores.achiote
		};

		const fontSize = Math.max(anchoL * 0.052, 26);
		const texto = new Konva.Text({
			text: String(c.texto ?? ''),
			fontFamily: 'Archivo, sans-serif',
			fontStyle: 'bold',
			fontSize,
			fill: relleno[color] ?? colores.papel,
			align,
			width: Math.min(anchoL * 0.8, 900),
			padding: conFondo ? fontSize * 0.35 : 0
		});

		if (conFondo) {
			const etiqueta = new Konva.Label();
			etiqueta.add(new Konva.Tag({ fill: fondos[color] ?? fondos.papel, cornerRadius: 4 }));
			etiqueta.add(texto);
			etiqueta.offsetX(etiqueta.width() / 2);
			etiqueta.offsetY(etiqueta.height() / 2);
			grupo.add(etiqueta);
		} else {
			texto.offsetX(texto.width() / 2);
			texto.offsetY(texto.height() / 2);
			grupo.add(texto);
		}
	}

	function nodoSticker(grupo: Konva.Group, c: Record<string, never>, anchoL: number) {
		const rotulo = (ROTULOS[c.clave as string] ?? String(c.clave ?? '')).toUpperCase();
		const detalle = String(c.detalle ?? '');
		const fontSize = Math.max(anchoL * 0.034, 20);

		const etiqueta = new Konva.Label();
		etiqueta.add(
			new Konva.Tag({
				fill: colores.achiote,
				cornerRadius: 3,
				shadowColor: 'black',
				shadowOpacity: 0.25,
				shadowBlur: 10,
				shadowOffsetY: 3
			})
		);
		etiqueta.add(
			new Konva.Text({
				text: detalle ? `${rotulo}  ·  ${detalle}` : rotulo,
				fontFamily: 'Archivo, sans-serif',
				fontStyle: '800',
				fontSize,
				fill: colores.carbon,
				padding: fontSize * 0.5,
				// Insignia de una sola línea: si «detalle» es largo se corta con
				// puntos suspensivos en vez de desbordar el lienzo — un rótulo
				// más ancho que la propia historia dejaría las asas de
				// selección fuera de la vista al elegirlo.
				width: Math.min(anchoL * 0.86, 640),
				wrap: 'none',
				ellipsis: true
			})
		);
		etiqueta.offsetX(etiqueta.width() / 2);
		etiqueta.offsetY(etiqueta.height() / 2);
		grupo.add(etiqueta);
	}

	function nodoEmoji(grupo: Konva.Group, c: Record<string, never>, anchoL: number) {
		const tam = Math.min(Math.max(anchoL * 0.16, 70), 160);
		const img = new window.Image();
		img.onload = () => {
			grupo.add(new Konva.Image({ image: img, width: tam, height: tam, offsetX: tam / 2, offsetY: tam / 2 }));
			capaElementos?.batchDraw();
		};
		img.src = `/openmoji/${c.hexcode}.svg`;
	}

	function nodoDibujo(grupo: Konva.Group, c: Record<string, never>, anchoL: number, altoL: number) {
		const anchoBox = Number(c.ancho ?? 0.3) * anchoL;
		const altoBox = Number(c.alto ?? 0.3) * altoL;
		const sub = new Konva.Group({ x: -anchoBox / 2, y: -altoBox / 2 });

		for (const trazo of (c.trazos as { puntos: number[]; color: string; grosor: number }[]) ?? []) {
			const puntos: number[] = [];
			for (let i = 0; i < trazo.puntos.length - 1; i += 2) {
				puntos.push(trazo.puntos[i] * anchoBox, trazo.puntos[i + 1] * altoBox);
			}
			sub.add(
				new Konva.Line({
					points: puntos,
					stroke: trazo.color,
					strokeWidth: Math.max(trazo.grosor * anchoBox, 1),
					lineCap: 'round',
					lineJoin: 'round'
				})
			);
		}

		grupo.add(sub);
	}

	function nodoImagen(grupo: Konva.Group, c: Record<string, never>, anchoL: number) {
		const url = String(c.url ?? '');
		if (!url) return;

		const img = new window.Image();
		img.onload = () => {
			const ancho = Math.min(anchoL * 0.42, img.naturalWidth || anchoL * 0.42);
			const alto = ancho * ((img.naturalHeight || 1) / (img.naturalWidth || 1));
			grupo.add(new Konva.Image({ image: img, width: ancho, height: alto, offsetX: ancho / 2, offsetY: alto / 2 }));
			capaElementos?.batchDraw();
		};
		img.src = url;
	}

	function nodoTarjeta(grupo: Konva.Group, titulo: string, pie: string, anchoL: number) {
		const anchoCaja = Math.min(anchoL * 0.62, 420);
		const fontSize = Math.max(anchoL * 0.032, 18);

		const texto = new Konva.Text({
			text: titulo,
			x: 18,
			y: 16,
			width: anchoCaja - 36,
			fontFamily: 'Archivo, sans-serif',
			fontStyle: '700',
			fontSize,
			fill: colores.carbon,
			lineHeight: 1.3
		});
		const pieTexto = new Konva.Text({
			text: pie,
			x: 18,
			y: 16 + texto.height() + 10,
			width: anchoCaja - 36,
			fontFamily: 'Archivo, sans-serif',
			fontSize: fontSize * 0.7,
			fill: colores.carbon,
			opacity: 0.7
		});
		const altoCaja = 16 + texto.height() + 10 + pieTexto.height() + 16;

		const sub = new Konva.Group({ x: -anchoCaja / 2, y: -altoCaja / 2 });
		sub.add(
			new Konva.Rect({
				width: anchoCaja,
				height: altoCaja,
				fill: 'rgba(251,250,246,0.94)',
				cornerRadius: 4,
				shadowColor: 'black',
				shadowOpacity: 0.28,
				shadowBlur: 20
			}),
			texto,
			pieTexto
		);
		grupo.add(sub);
	}

	// ------------------------------------------------------------------ dibujar a mano

	function empezarTrazo(pos: { x: number; y: number }) {
		if (!stage || trazosPendientes.length >= MAX_TRAZOS) return;

		trazoActual = new Konva.Line({
			points: [pos.x, pos.y],
			stroke: colorTrazo,
			strokeWidth: Math.max(grosorTrazo * stage.width(), 1),
			lineCap: 'round',
			lineJoin: 'round'
		});
		capaDibujo.add(trazoActual);
	}

	function continuarTrazo(pos: { x: number; y: number }) {
		if (!trazoActual) return;

		const puntos = trazoActual.points();
		if (puntos.length / 2 >= MAX_PUNTOS_POR_TRAZO) return;

		trazoActual.points([...puntos, pos.x, pos.y]);
		capaDibujo.batchDraw();
	}

	function terminarTrazo() {
		if (!trazoActual) return;

		const puntos = trazoActual.points();
		if (puntos.length >= 4) {
			trazosPendientes = [...trazosPendientes, { puntos: [...puntos], color: colorTrazo, grosor: grosorTrazo }];
		} else {
			trazoActual.destroy();
		}

		trazoActual = null;
		capaDibujo.batchDraw();
	}

	function deshacerTrazo() {
		if (trazoActual || trazosPendientes.length === 0) return;

		trazosPendientes = trazosPendientes.slice(0, -1);
		const hijos = capaDibujo.getChildren();
		hijos[hijos.length - 1]?.destroy();
		capaDibujo.batchDraw();
	}

	function terminarDibujo() {
		if (!stage || trazosPendientes.length === 0) {
			dibujando = false;
			return;
		}

		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;

		for (const t of trazosPendientes) {
			for (let i = 0; i < t.puntos.length - 1; i += 2) {
				minX = Math.min(minX, t.puntos[i]);
				maxX = Math.max(maxX, t.puntos[i]);
				minY = Math.min(minY, t.puntos[i + 1]);
				maxY = Math.max(maxY, t.puntos[i + 1]);
			}
		}

		const margen = 14;
		minX -= margen;
		minY -= margen;
		maxX += margen;
		maxY += margen;

		const anchoL = stage.width();
		const altoL = stage.height();
		const anchoCaja = Math.max(maxX - minX, 1);
		const altoCaja = Math.max(maxY - minY, 1);

		const trazos = trazosPendientes.map((t) => ({
			puntos: t.puntos.map((v, i) => (i % 2 === 0 ? (v - minX) / anchoCaja : (v - minY) / altoCaja)),
			color: t.color,
			grosor: Math.max(0.004, Math.min(0.05, t.grosor))
		}));

		elementos = [
			...elementos,
			{
				tipo: 'dibujo',
				contenido: {
					trazos,
					ancho: Math.min(1, anchoCaja / anchoL),
					alto: Math.min(1, altoCaja / altoL)
				},
				x: Math.max(0.04, Math.min(0.96, (minX + anchoCaja / 2) / anchoL)),
				y: Math.max(0.04, Math.min(0.96, (minY + altoCaja / 2) / altoL)),
				escala: 1,
				rotacion: 0
			}
		];

		seleccionado = elementos.length - 1;
		dibujando = false;
	}

	// ------------------------------------------------------------------------- zoom

	function aplicarZoom(factor: number, centro: { x: number; y: number }) {
		if (!stage || !contenedor) return;

		const nuevo = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, stage.scaleX() * factor));
		const punto = { x: (centro.x - stage.x()) / stage.scaleX(), y: (centro.y - stage.y()) / stage.scaleY() };

		stage.scale({ x: nuevo, y: nuevo });
		stage.position({ x: centro.x - punto.x * nuevo, y: centro.y - punto.y * nuevo });
		limitarPosicion();
		stage.batchDraw();
		zoomActual = nuevo;
	}

	function limitarPosicion() {
		if (!stage || !contenedor) return;

		const escala = stage.scaleX();
		const anchoVista = contenedor.clientWidth;
		const altoVista = contenedor.clientHeight;
		const minX = Math.min(0, anchoVista - anchoVista * escala);
		const minY = Math.min(0, altoVista - altoVista * escala);

		stage.position({
			x: Math.max(minX, Math.min(0, stage.x())),
			y: Math.max(minY, Math.min(0, stage.y()))
		});
	}

	function restablecerZoom() {
		if (!stage) return;
		stage.scale({ x: 1, y: 1 });
		stage.position({ x: 0, y: 0 });
		zoomActual = 1;
		stage.batchDraw();
	}

	function distanciaEntre(a: Touch, b: Touch) {
		return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
	}

	function manejarTouchMove(e: TouchEvent) {
		if (e.touches.length !== 2 || !contenedor) return;
		e.preventDefault();

		const [a, b] = [e.touches[0], e.touches[1]];
		const caja = contenedor.getBoundingClientRect();
		const centro = { x: (a.clientX + b.clientX) / 2 - caja.left, y: (a.clientY + b.clientY) / 2 - caja.top };
		const distancia = distanciaEntre(a, b);

		if (pellizco) aplicarZoom(distancia / pellizco.distancia, centro);
		pellizco = { distancia, centro };
	}

	function manejarTouchEnd(e: TouchEvent) {
		if (e.touches.length < 2) pellizco = null;
	}

	// --------------------------------------------------------------- portapapeles y archivos

	function manejarPaste(e: ClipboardEvent) {
		if (!marco?.matches(':hover, :focus-within') && document.activeElement !== document.body) return;

		const items = e.clipboardData?.items;
		if (!items) return;

		for (const item of items) {
			if (item.type.startsWith('image/')) {
				e.preventDefault();
				const archivo = item.getAsFile();
				if (archivo) subirImagen(archivo);
				return;
			}
		}
	}

	function manejarDragOver(e: DragEvent) {
		e.preventDefault();
	}

	function manejarDrop(e: DragEvent) {
		e.preventDefault();
		const archivo = e.dataTransfer?.files?.[0];
		if (archivo?.type.startsWith('image/')) subirImagen(archivo);
	}

	// ------------------------------------------------------------------- tira de capas

	function conTeclado(indice: number, evento: KeyboardEvent) {
		const salto = 0.02;
		const movimientos: Record<string, [number, number]> = {
			ArrowLeft: [-salto, 0],
			ArrowRight: [salto, 0],
			ArrowUp: [0, -salto],
			ArrowDown: [0, salto]
		};

		const m = movimientos[evento.key];
		if (!m) return;

		evento.preventDefault();
		seleccionado = indice;

		elementos[indice] = {
			...elementos[indice],
			x: Math.max(0.04, Math.min(0.96, elementos[indice].x + m[0])),
			y: Math.max(0.04, Math.min(0.96, elementos[indice].y + m[1]))
		};
	}

	function quitar(indice: number) {
		elementos = elementos.filter((_, i) => i !== indice);
		seleccionado = null;
	}
</script>

<div class="marco" bind:this={marco}>
	<div class="envoltura">
		<div
			class="lienzo"
			class:dibujando
			bind:this={contenedor}
			ondragover={manejarDragOver}
			ondrop={manejarDrop}
			role="img"
			aria-label="Vista previa de la historia. Usa la tira de capas de abajo para seleccionar, mover o quitar elementos."
		></div>

		<div class="zoom">
			{#if zoomActual > 1}
				<button type="button" onclick={restablecerZoom} title="Restablecer zoom">
					{Math.round(zoomActual * 100)}%
				</button>
			{/if}
			<button
				type="button"
				aria-label="Alejar"
				disabled={zoomActual <= ZOOM_MIN}
				onclick={() => stage && aplicarZoom(0.85, { x: stage.width() / 2, y: stage.height() / 2 })}
			>
				<IconoEstudio nombre="lupa-menos" tamano={17} />
			</button>
			<button
				type="button"
				aria-label="Acercar"
				disabled={zoomActual >= ZOOM_MAX}
				onclick={() => stage && aplicarZoom(1.18, { x: stage.width() / 2, y: stage.height() / 2 })}
			>
				<IconoEstudio nombre="lupa-mas" tamano={17} />
			</button>
		</div>

		{#if dibujando}
			<div class="herramienta-dibujo">
				<div class="colores">
					{#each PALETA_TRAZO as p (p.clave)}
						<button
							type="button"
							class="color"
							class:activo={colorTrazo === p.valor}
							style="background:{p.valor}"
							aria-label="Color {p.clave}"
							onclick={() => (colorTrazo = p.valor)}
						></button>
					{/each}
				</div>

				<label class="grosor">
					<span class="sr-only">Grosor del trazo</span>
					<input type="range" min="0.006" max="0.03" step="0.002" bind:value={grosorTrazo} />
				</label>

				<button type="button" class="accion" disabled={trazosPendientes.length === 0} onclick={deshacerTrazo}>
					<IconoEstudio nombre="deshacer" tamano={17} />
					Deshacer
				</button>

				<button type="button" class="listo" onclick={terminarDibujo}>Listo</button>
			</div>
		{/if}
	</div>

	{#if elementos.length > 0}
		<ul class="capas" aria-label="Capas de la historia">
			{#each elementos as elemento, i (i)}
				<li>
					<button
						type="button"
						class="capa"
						class:activa={seleccionado === i}
						onclick={() => (seleccionado = i)}
						onkeydown={(e) => conTeclado(i, e)}
						aria-pressed={seleccionado === i}
					>
						{etiquetaDe(elemento)}
					</button>
					{#if seleccionado === i}
						<button type="button" class="quitar-capa" onclick={() => quitar(i)} aria-label="Quitar {etiquetaDe(elemento)}">
							<IconoEstudio nombre="basura" tamano={14} />
						</button>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.marco {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.envoltura {
		position: relative;
		width: 100%;
		max-width: 22rem;
		margin-inline: auto;
	}

	.lienzo {
		width: 100%;
		aspect-ratio: 9 / 16;
		overflow: hidden;
		background: var(--color-carbon-900);
		touch-action: none;
	}

	.lienzo.dibujando {
		cursor: crosshair;
	}

	.zoom {
		position: absolute;
		right: 0.5rem;
		bottom: 0.5rem;
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.zoom button {
		display: grid;
		place-items: center;
		min-width: 2.1rem;
		min-height: 2.1rem;
		padding-inline: 0.4rem;
		border: none;
		border-radius: 3px;
		background: rgb(30 31 29 / 0.62);
		color: var(--color-papel);
		font-family: inherit;
		font-size: 0.72rem;
		font-weight: 700;
		cursor: pointer;
		backdrop-filter: blur(4px);
	}

	.zoom button:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.herramienta-dibujo {
		position: absolute;
		top: 0.5rem;
		left: 0.5rem;
		right: 0.5rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.6rem;
		border-radius: 4px;
		background: rgb(30 31 29 / 0.72);
		backdrop-filter: blur(6px);
	}

	.colores {
		display: flex;
		gap: 0.3rem;
	}

	.color {
		width: 1.6rem;
		height: 1.6rem;
		border: 2px solid transparent;
		border-radius: 50%;
		cursor: pointer;
	}

	.color.activo {
		border-color: var(--color-papel);
	}

	.grosor {
		flex: 1;
		min-width: 5rem;
	}

	.grosor input {
		width: 100%;
		min-height: 30px;
		accent-color: var(--color-achiote-500);
	}

	.accion {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		min-height: 2.1rem;
		padding-inline: 0.5rem;
		border: 1px solid rgb(251 250 246 / 0.35);
		border-radius: 3px;
		background: none;
		color: var(--color-papel);
		font-family: inherit;
		font-size: 0.74rem;
		font-weight: 600;
		cursor: pointer;
	}

	.accion:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.listo {
		min-height: 2.1rem;
		padding-inline: 0.75rem;
		border: none;
		border-radius: 3px;
		background: var(--color-achiote-500);
		color: var(--color-carbon-900);
		font-family: inherit;
		font-size: 0.78rem;
		font-weight: 700;
		cursor: pointer;
	}

	.capas {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		max-width: 22rem;
		margin-inline: auto;
	}

	.capas li {
		display: flex;
		align-items: stretch;
	}

	.capa {
		min-height: 2.1rem;
		padding-inline: 0.6rem;
		border: 1px solid var(--borde);
		background: var(--superficie);
		color: var(--texto-suave);
		font-family: inherit;
		font-size: 0.74rem;
		font-weight: 600;
		max-width: 9rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		cursor: pointer;
	}

	.capa.activa {
		border-color: var(--color-achiote-400);
		color: var(--texto);
	}

	.quitar-capa {
		display: grid;
		place-items: center;
		width: 2.1rem;
		border: 1px solid var(--borde);
		border-left: none;
		background: var(--superficie-alt);
		color: var(--color-error);
		cursor: pointer;
	}
</style>
