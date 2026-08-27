<script lang="ts">
	import Pictograma from './Pictograma.svelte';
	import { revelar, contar } from '$lib/acciones/revelar';

	/**
	 * Banda de cifras del cantón, en oscuro.
	 *
	 * La inversión de fondo no es decorativa: separa el bloque de dato duro
	 * de las dos secciones de navegación que lo rodean y le da a la página
	 * un respiro entre tanto color de marca. Es el único punto del recorrido
	 * donde el fondo cambia de papel a carbón.
	 *
	 * Las cuatro cifras están verificadas en /datos_canton/ del sitio
	 * municipal (VII Censo de Población y VI de Vivienda). No se redondean
	 * ni se "actualizan" a ojo: son el dato que el municipio publica.
	 */
	interface Cifra {
		valor: number;
		decimales?: number;
		/**
		 * Un año no se agrupa: "1.969" no es una cifra, es una errata. Todo
		 * lo demás sí lleva separador de millares en formato es-EC.
		 */
		agrupar?: boolean;
		sufijo?: string;
		/** Lo que se sirve en el HTML y lo que lee un lector de pantalla. */
		texto: string;
		etiqueta: string;
		nota: string;
	}

	const cifras: Cifra[] = [
		{
			valor: 72795,
			texto: '72.795',
			etiqueta: 'habitantes',
			nota: 'VII Censo de Población'
		},
		{
			valor: 7047,
			texto: '7.047',
			etiqueta: 'km² de territorio',
			nota: 'Entre los ríos Napo, Coca y Payamino'
		},
		{
			valor: 26,
			texto: '26',
			sufijo: '°C',
			etiqueta: 'temperatura media',
			nota: 'Clima tropical húmedo todo el año'
		},
		{
			valor: 1969,
			agrupar: false,
			texto: '1969',
			etiqueta: 'año de cantonización',
			nota: '30 de abril, fiesta cantonal'
		}
	];
</script>

<section class="banda" aria-labelledby="titulo-cifras">
	<Pictograma
		nombre="canton"
		clase="pointer-events-none absolute -right-16 top-1/2 hidden h-[34rem] w-auto -translate-y-1/2 text-[var(--color-selva-400)] opacity-[0.07] lg:block"
	/>

	<div class="contenedor relative">
		<div class="flex flex-wrap items-end justify-between gap-4 border-b border-white/15 pb-6">
			<h2 id="titulo-cifras" class="display text-[clamp(1.6rem,3.2vw,2.3rem)] text-white">
				Francisco de Orellana en cifras
			</h2>
			<a
				href="/canton/datos-canton"
				class="text-[0.85rem] font-bold text-[var(--color-achiote-400)] no-underline hover:underline"
			>
				Datos completos del cantón
			</a>
		</div>

		<!--
			Cada grupo va como <dt> + dos <dd> (el valor y su procedencia), que
			es HTML válido y lo que espera un lector de pantalla: "habitantes:
			72.795, VII Censo de Población". El orden visual — cifra grande
			arriba, etiqueta debajo — se resuelve con `order`, no metiendo un
			<p> suelto dentro del <dl>, que no está permitido.
		-->
		<dl class="grid grid-cols-2 gap-x-6 gap-y-10 pt-10 md:gap-x-10 lg:grid-cols-4">
			{#each cifras as c, i (c.etiqueta)}
				<div
					use:revelar={{ retraso: i * 100 }}
					class="revelable flex flex-col border-l-[3px] border-[var(--color-achiote-500)] pl-4 md:pl-5"
				>
					<dt class="order-2 mt-2.5 text-[0.86rem] font-bold text-white">{c.etiqueta}</dt>
					<dd class="display cifra-tabular order-1 text-[clamp(2.4rem,5.2vw,3.9rem)] leading-none text-white">
						<span use:contar={{ hasta: c.valor, decimales: c.decimales, agrupar: c.agrupar }}>{c.texto}</span
						>{#if c.sufijo}<span class="text-[0.55em] text-[var(--color-achiote-400)]">{c.sufijo}</span>{/if}
					</dd>
					<dd class="order-3 mt-1 text-[0.78rem] leading-snug text-white/60">{c.nota}</dd>
				</div>
			{/each}
		</dl>
	</div>
</section>

<style>
	.banda {
		position: relative;
		overflow: hidden;
		/*
		   Carbón del logotipo, un punto más oscuro para que funcione igual
		   sobre el papel del tema claro y sobre el fondo del tema oscuro:
		   esta banda se ve idéntica en los dos, a propósito.
		*/
		background: #16170f;
		padding-block: 3.5rem;
	}

	@media (width >= 48rem) {
		.banda {
			padding-block: 5rem;
		}
	}
</style>
