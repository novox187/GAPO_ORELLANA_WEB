<script lang="ts">
	import {
		CAJA,
		TRAZO,
		TRAZO_ALTO,
		area,
		diaCorto,
		diaLargo,
		linea,
		marcas,
		numero,
		saltoEtiquetas,
		techo,
		x,
		y,
		type Punto
	} from './viz';

	/**
	 * La serie temporal del panel: una línea de datos y, opcionalmente, otra
	 * de contexto detrás.
	 *
	 * Dos series y no cinco, y la segunda en gris: es la forma «énfasis». El
	 * alcance es lo que se está mirando; las impresiones son el fondo contra
	 * el que se entiende. Con dos colores fuertes el ojo tiene que decidir
	 * cuál de los dos es el asunto, y en un panel que alguien consulta de
	 * pasada esa decisión se resuelve mirando el más llamativo, que puede no
	 * ser el importante.
	 *
	 * La línea es recta entre días, nunca curvada: una curva dibuja valores
	 * intermedios que nadie midió. Entre el lunes y el miércoles no hubo un
	 * martes suave.
	 */
	let {
		titulo,
		puntos,
		contexto = null,
		nombre,
		nombreContexto = ''
	}: {
		titulo: string;
		puntos: Punto[];
		contexto?: Punto[] | null;
		nombre: string;
		nombreContexto?: string;
	} = $props();

	const maximo = $derived(techo([...puntos.map((p) => p.valor), ...(contexto ?? []).map((p) => p.valor)]));
	const lineas = $derived(marcas(maximo));
	const salto = $derived(saltoEtiquetas(puntos.length));
	const total = $derived(puntos.reduce((suma, p) => suma + p.valor, 0));

	/** Índice sobre el que está el puntero, o null. */
	let activo = $state<number | null>(null);
	let svg = $state<SVGSVGElement | null>(null);

	/**
	 * El punto más cercano al puntero en horizontal.
	 *
	 * Se persigue la posición en X y no el elemento bajo el cursor: los
	 * vértices de una línea son objetivos de dos píxeles y apuntarlos con el
	 * dedo es imposible. Así toda la columna del día es zona sensible.
	 */
	function alMover(evento: PointerEvent) {
		if (!svg || puntos.length === 0) return;

		const caja = svg.getBoundingClientRect();
		const relativa = ((evento.clientX - caja.left) / caja.width) * CAJA.ancho;
		const dentro = (relativa - CAJA.margen.izquierda) / TRAZO.ancho;

		activo = Math.max(0, Math.min(puntos.length - 1, Math.round(dentro * (puntos.length - 1))));
	}

	const puntoActivo = $derived(activo === null ? null : puntos[activo]);
	const contextoActivo = $derived(activo === null ? null : (contexto?.[activo] ?? null));
</script>

<figure class="grafico">
	<figcaption class="cabecera">
		<div>
			<h3 class="titulo">{titulo}</h3>
			<p class="total">{numero(total)} en el periodo</p>
		</div>

		{#if contexto}
			<!-- Con dos series la leyenda va siempre: el color no puede ser el
			     único canal que diga cuál es cuál. -->
			<ul class="leyenda">
				<li><span class="llave acento" aria-hidden="true"></span>{nombre}</li>
				<li><span class="llave contexto" aria-hidden="true"></span>{nombreContexto}</li>
			</ul>
		{/if}
	</figcaption>

	<svg
		bind:this={svg}
		viewBox="0 0 {CAJA.ancho} {CAJA.alto}"
		preserveAspectRatio="none"
		role="img"
		aria-label="{titulo}: {numero(total)} en total. Los valores día a día están en la tabla que sigue."
		onpointermove={alMover}
		onpointerleave={() => (activo = null)}
	>
		<!-- Rejilla: un paso de gris sobre la superficie, de un píxel y continua.
		     Discontinua compite con los datos por la atención. -->
		{#each lineas as valor (valor)}
			<line
				x1={CAJA.margen.izquierda}
				x2={CAJA.ancho - CAJA.margen.derecha}
				y1={y(valor, maximo)}
				y2={y(valor, maximo)}
				class="rejilla"
			/>
			<text x={CAJA.margen.izquierda - 8} y={y(valor, maximo) + 4} class="marca" text-anchor="end">
				{numero(valor)}
			</text>
		{/each}

		{#if contexto}
			<path d={linea(contexto, maximo)} class="trazo-contexto" />
		{/if}

		<path d={area(puntos, maximo)} class="velo" />
		<path d={linea(puntos, maximo)} class="trazo" />

		<!-- Punto final: donde termina la serie, con su anillo del color de la
		     superficie para que no se funda con la línea ni con la rejilla. -->
		{#if puntos.length}
			<circle
				cx={x(puntos.length - 1, puntos.length)}
				cy={y(puntos[puntos.length - 1].valor, maximo)}
				r="5"
				class="punta"
			/>
		{/if}

		{#each puntos as p, i (p.fecha)}
			{#if i % salto === 0 || i === puntos.length - 1}
				<text x={x(i, puntos.length)} y={CAJA.alto - 6} class="marca" text-anchor="middle">
					{diaCorto(p.fecha)}
				</text>
			{/if}
		{/each}

		{#if activo !== null && puntoActivo}
			<line
				x1={x(activo, puntos.length)}
				x2={x(activo, puntos.length)}
				y1={CAJA.margen.arriba}
				y2={CAJA.margen.arriba + TRAZO_ALTO}
				class="cruz"
			/>
			<circle cx={x(activo, puntos.length)} cy={y(puntoActivo.valor, maximo)} r="5" class="punta" />
		{/if}
	</svg>

	{#if activo !== null && puntoActivo}
		<p class="globo" role="status">
			<strong>{diaLargo(puntoActivo.fecha)}</strong>
			<span>{numero(puntoActivo.valor)} {nombre.toLowerCase()}</span>
			{#if contextoActivo}
				<span class="suave">{numero(contextoActivo.valor)} {nombreContexto.toLowerCase()}</span>
			{/if}
		</p>
	{/if}

	<!--
		La tabla no es un extra de accesibilidad marcado por cumplir: es la
		única forma de leer el valor exacto de un día concreto con teclado o
		con lector de pantalla, y de copiarlo a un informe. Va plegada para no
		competir con el gráfico, no escondida.
	-->
	<details class="tabla">
		<summary>Ver los datos día a día</summary>
		<div class="envoltorio">
			<table>
				<caption class="sr-only">{titulo}, día a día</caption>
				<thead>
					<tr>
						<th scope="col">Día</th>
						<th scope="col">{nombre}</th>
						{#if contexto}<th scope="col">{nombreContexto}</th>{/if}
					</tr>
				</thead>
				<tbody>
					{#each puntos as p, i (p.fecha)}
						<tr>
							<th scope="row">{diaLargo(p.fecha)}</th>
							<td>{numero(p.valor)}</td>
							{#if contexto}<td>{numero(contexto[i]?.valor ?? 0)}</td>{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</details>
</figure>

<style>
	.grafico {
		margin: 0;
	}

	.cabecera {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem 1rem;
		margin-bottom: 0.75rem;
	}

	.titulo {
		font-size: 0.95rem;
		font-weight: 700;
	}

	.total {
		font-size: 0.8rem;
		color: var(--texto-suave);
	}

	.leyenda {
		display: flex;
		gap: 1rem;
		font-size: 0.78rem;
		color: var(--texto-suave);
	}

	.leyenda li {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.llave {
		display: block;
		width: 14px;
		height: 3px;
		border-radius: 2px;
	}

	.llave.acento {
		background: var(--viz-acento);
	}

	.llave.contexto {
		background: var(--viz-contexto);
	}

	svg {
		display: block;
		width: 100%;
		height: 220px;
		touch-action: pan-y;
	}

	.rejilla {
		stroke: var(--viz-rejilla);
		stroke-width: 1;
		vector-effect: non-scaling-stroke;
	}

	.marca {
		fill: var(--texto-suave);
		font-size: 11px;
	}

	.trazo {
		fill: none;
		stroke: var(--viz-acento);
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}

	.trazo-contexto {
		fill: none;
		stroke: var(--viz-contexto);
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}

	/* Velo bajo la línea al 10 %: un tinte, nunca un bloque saturado. */
	.velo {
		fill: var(--viz-acento);
		opacity: 0.1;
	}

	/* El anillo es del color de la superficie, no un borde: separa sin añadir
	   tinta que no es dato. */
	.punta {
		fill: var(--viz-acento);
		stroke: var(--superficie);
		stroke-width: 2;
		vector-effect: non-scaling-stroke;
	}

	.cruz {
		stroke: var(--texto-suave);
		stroke-width: 1;
		opacity: 0.45;
		vector-effect: non-scaling-stroke;
	}

	.globo {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.75rem;
		margin-top: 0.4rem;
		font-size: 0.82rem;
	}

	.globo .suave {
		color: var(--texto-suave);
	}

	.tabla {
		margin-top: 0.75rem;
		font-size: 0.82rem;
	}

	.tabla summary {
		cursor: pointer;
		color: var(--texto-suave);
	}

	.envoltorio {
		max-height: 15rem;
		overflow: auto;
		margin-top: 0.5rem;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th,
	td {
		padding: 0.3rem 0.5rem;
		text-align: left;
		border-bottom: 1px solid var(--borde);
		font-weight: 400;
	}

	thead th {
		position: sticky;
		top: 0;
		background: var(--superficie);
		font-weight: 700;
	}

	td {
		font-variant-numeric: tabular-nums;
	}
</style>
