<script lang="ts">
	import { img } from '$lib/api';
	import IconoEstudio from '$lib/components/estudio/IconoEstudio.svelte';
	import TarjetaCifra from '$lib/components/estudio/TarjetaCifra.svelte';
	import GraficoSerie from '$lib/components/estudio/GraficoSerie.svelte';
	import GraficoBarras from '$lib/components/estudio/GraficoBarras.svelte';
	import GraficoColumnas from '$lib/components/estudio/GraficoColumnas.svelte';
	import SelectorPeriodo from '$lib/components/estudio/SelectorPeriodo.svelte';
	import AvisoCobertura from '$lib/components/estudio/AvisoCobertura.svelte';
	import { estudio, cifra, type Audiencia, type PublicacionEstudio, type ResumenMetricas } from '$lib/estudio';
	import { sesionEstudio } from '$lib/sesionEstudio.svelte';

	/**
	 * El panel de estadísticas de la cuenta.
	 *
	 * Dos pestañas porque son dos preguntas distintas: «cómo va» (lo que se
	 * publicó, cuánto llegó) y «quién mira» (dispositivo, hora, parroquia,
	 * edad). Mezclarlas en una sola pantalla larga hace que la segunda no se
	 * lea nunca.
	 *
	 * Todo lo que aparece sale de filas reales. Donde no hay medición, se dice
	 * — ver AvisoCobertura— en vez de enseñar ceros que se leen como fracaso.
	 */
	let dias = $state(7);
	let vista = $state<'rendimiento' | 'audiencia'>('rendimiento');

	let resumen = $state<ResumenMetricas | null>(null);
	let mejores = $state<{ publicacion: PublicacionEstudio; alcance: number; impresiones: number }[]>([]);
	let audiencia = $state<Audiencia | null>(null);
	let cargando = $state(true);
	let error = $state<string | null>(null);

	const cuenta = $derived(sesionEstudio.cuenta);

	$effect(() => {
		const alias = cuenta?.alias;
		const ventana = dias;
		const cual = vista;

		if (!alias) return;

		let vigente = true;
		cargando = true;
		error = null;

		(async () => {
			try {
				if (cual === 'rendimiento') {
					const r = await estudio.metricas(alias, ventana);
					if (!vigente) return;
					resumen = r.data;
					mejores = r.mejores;
				} else {
					const r = await estudio.audiencia(alias, ventana);
					if (!vigente) return;
					audiencia = r.data;
				}
			} catch (e) {
				if (vigente) error = e instanceof Error ? e.message : 'No se pudieron cargar las estadísticas.';
			} finally {
				if (vigente) cargando = false;
			}
		})();

		return () => {
			vigente = false;
		};
	});

	/**
	 * Los dispositivos llegan como clave (`movil`, `tableta`, `escritorio`)
	 * porque así se guardan y así se consultan. Traducirlos a algo legible es
	 * cosa de la interfaz: un gráfico que dice «movil» sin tilde delata que
	 * nadie miró la pantalla antes de darla por terminada.
	 */
	const NOMBRE_DISPOSITIVO: Record<string, string> = {
		movil: 'Teléfono',
		tableta: 'Tableta',
		escritorio: 'Computadora'
	};

	/** Rótulo y explicación de cada cifra. La explicación importa: «alcance» e «impresiones» se confunden. */
	const CIFRAS = [
		{ clave: 'alcance', rotulo: 'Alcance', ayuda: 'Personas distintas que vieron algo de esta cuenta.' },
		{ clave: 'impresiones', rotulo: 'Impresiones', ayuda: 'Veces que se vio, contando repeticiones de la misma persona.' },
		{ clave: 'visitas', rotulo: 'Visitas', ayuda: 'Veces que alguien abrió una publicación entera.' },
		{ clave: 'reacciones', rotulo: 'Reacciones', ayuda: 'Corazones de vecinos con cuenta.' },
		{ clave: 'comentarios', rotulo: 'Comentarios', ayuda: 'Comentarios publicados en el periodo.' },
		{ clave: 'compartidos', rotulo: 'Compartidos', ayuda: 'Veces que se compartió o se copió el enlace.' },
		{ clave: 'guardados', rotulo: 'Guardados', ayuda: 'Veces que alguien la guardó para leerla después.' },
		{ clave: 'reproducciones', rotulo: 'Reproducciones', ayuda: 'Vídeos vistos más de tres segundos.' },
		{ clave: 'seguidores_nuevos', rotulo: 'Seguidores nuevos', ayuda: 'Altas de seguimiento en el periodo.' }
	] as const;
</script>

<div class="panel">
	<header class="cabecera">
		<div>
			<h1>Estadísticas</h1>
			{#if cuenta}<p class="cuenta">{cuenta.nombre}</p>{/if}
		</div>
		<SelectorPeriodo bind:dias />
	</header>

	<nav class="pestanas" aria-label="Vista">
		<button type="button" class:activa={vista === 'rendimiento'} onclick={() => (vista = 'rendimiento')}>
			Rendimiento
		</button>
		<button type="button" class:activa={vista === 'audiencia'} onclick={() => (vista = 'audiencia')}>
			Audiencia
		</button>
	</nav>

	{#if error}
		<p class="error" role="alert">{error}</p>
	{:else if vista === 'rendimiento'}
		{#if resumen}
			<AvisoCobertura cobertura={resumen.cobertura} {dias} />

			<p class="publicado">
				En este periodo publicaste
				<strong>{resumen.publicado.publicaciones}</strong>
				{resumen.publicado.publicaciones === 1 ? 'publicación' : 'publicaciones'}
				y
				<strong>{resumen.publicado.historias}</strong>
				{resumen.publicado.historias === 1 ? 'historia' : 'historias'}.
			</p>

			<div class="tarjetas">
				{#each CIFRAS as c (c.clave)}
					<TarjetaCifra
						rotulo={c.rotulo}
						dato={resumen.cifras[c.clave]}
						ayuda={c.ayuda}
						serie={c.clave === 'alcance' ? resumen.series.alcance : []}
					/>
				{/each}

				<div class="tarjeta-tasa">
					<p class="rotulo">Tasa de interacción</p>
					{#if resumen.tasa_interaccion === null}
						<!--
							Nulo y no cero: sin alcance no hay denominador, y un 0 %
							se leería como «no le interesó a nadie», que es una
							afirmación distinta y falsa.
						-->
						<p class="sin-dato">Sin alcance en el periodo, no hay con qué dividir.</p>
					{:else}
						<p class="valor">{resumen.tasa_interaccion.toLocaleString('es-EC')} %</p>
						<p class="ayuda">
							Reacciones, comentarios, compartidos y guardados entre las personas que lo vieron.
						</p>
					{/if}
				</div>
			</div>

			<section class="grafico">
				<GraficoSerie
					titulo="Cuánta gente lo vio"
					puntos={resumen.series.alcance}
					contexto={resumen.series.impresiones}
					nombre="Alcance"
					nombreContexto="Impresiones"
				/>
			</section>

			<section class="grafico">
				<GraficoSerie
					titulo="Reacciones y comentarios"
					puntos={resumen.series.interacciones}
					nombre="Interacciones"
				/>
			</section>

			<section class="mejores">
				<h2>Lo que más llegó</h2>

				{#if mejores.length === 0}
					<p class="vacio">
						Todavía no hay suficiente medición para ordenar nada. Aparecerá cuando la haya.
					</p>
				{:else}
					<ol>
						{#each mejores as m (m.publicacion.id)}
							<li>
								<a href="/estudio/publicacion/{m.publicacion.id}">
									<span class="miniatura">
										{#if m.publicacion.imagen}
											<img src={img(m.publicacion.imagen, 400)} alt="" loading="lazy" />
										{:else}
											<IconoEstudio nombre="imagen" tamano={20} />
										{/if}
									</span>

									<span class="texto">
										{m.publicacion.tipo === 'nota'
											? m.publicacion.titulo
											: m.publicacion.pie || 'Sin pie'}
									</span>

									<span class="numeros">
										<strong>{cifra(m.alcance)}</strong>
										<em>alcance</em>
									</span>
								</a>
							</li>
						{/each}
					</ol>
				{/if}
			</section>
		{:else if cargando}
			<p class="cargando" role="status">Cargando estadísticas…</p>
		{/if}
	{:else if audiencia}
		<AvisoCobertura
			cobertura={{ midiendo_desde: audiencia.cobertura.desde, periodo_incompleto: false }}
			{dias}
		/>

		<section class="grafico">
			<GraficoBarras
				titulo="Desde qué dispositivo"
				filas={audiencia.dispositivos.map((d) => ({
					...d,
					etiqueta: NOMBRE_DISPOSITIVO[d.etiqueta] ?? d.etiqueta
				}))}
				unidad="visitantes"
				vacio="Sin visitas medidas en el periodo."
			/>
			<p class="nota">
				Sale del propio acceso, así que cubre a toda la audiencia. Sirve para decidir cómo encuadrar
				la próxima fotografía.
			</p>
		</section>

		<section class="grafico">
			<GraficoColumnas
				titulo="A qué hora miran"
				columnas={audiencia.horas.map((h) => ({ etiqueta: `${h.hora}`, total: h.total }))}
				nota="Hora de Ecuador."
			/>
		</section>

		<section class="grafico">
			<GraficoColumnas
				titulo="Qué días"
				columnas={audiencia.dias_semana.map((d) => ({ etiqueta: d.etiqueta, total: d.total }))}
			/>
		</section>

		<!--
			La demografía se separa del resto y lleva su propia advertencia
			porque tiene una honestidad distinta: dispositivo y hora salen del
			acceso y cubren a todo el mundo; parroquia y edad sólo existen para
			quien tiene cuenta Y decidió declararlas. Sin decirlo, estos dos
			gráficos parecerían el reparto del cantón.
		-->
		<section class="declarado">
			<h2>Lo que la gente declaró</h2>

			<p class="alcance-declarado">
				{#if audiencia.cobertura.personas_identificadas === 0}
					Nadie con cuenta ciudadana vio esta cuenta en el periodo, así que no hay nada que
					repartir. No se deduce la parroquia de la conexión ni la edad del comportamiento.
				{:else}
					<strong>{audiencia.cobertura.personas_que_declararon}</strong>
					de {audiencia.cobertura.personas_identificadas} personas identificadas declararon estos
					datos
					{#if audiencia.cobertura.porcentaje_declarado !== null}
						({audiencia.cobertura.porcentaje_declarado} %)
					{/if}. El resto de la audiencia no aparece aquí: es opcional y nadie la infiere.
				{/if}
			</p>

			<div class="par">
				<GraficoBarras
					titulo="Parroquia"
					filas={audiencia.parroquias}
					vacio="Nadie ha declarado su parroquia todavía."
				/>
				<GraficoBarras
					titulo="Edad"
					filas={audiencia.edades}
					vacio="Nadie ha declarado su año de nacimiento todavía."
				/>
			</div>
		</section>
	{:else if cargando}
		<p class="cargando" role="status">Cargando audiencia…</p>
	{/if}
</div>

<style>
	.panel {
		max-width: 62rem;
		margin-inline: auto;
		padding: 1.25rem 1rem 3rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.cabecera {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 0.75rem 1rem;
	}

	h1 {
		font-size: 1.35rem;
		font-weight: 700;
		font-stretch: 108%;
	}

	.cuenta {
		font-size: 0.85rem;
		color: var(--texto-suave);
	}

	.pestanas {
		display: flex;
		gap: 0.25rem;
		border-bottom: 1px solid var(--borde);
	}

	.pestanas button {
		position: relative;
		min-height: 42px;
		padding-inline: 0.9rem;
		border: none;
		background: none;
		color: var(--texto-suave);
		font-family: inherit;
		font-size: 0.85rem;
		font-weight: 700;
		cursor: pointer;
	}

	.pestanas button.activa {
		color: var(--texto);
	}

	.pestanas button.activa::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: -1px;
		height: 2px;
		background: var(--texto);
	}

	.publicado {
		font-size: 0.88rem;
		color: var(--texto-suave);
	}

	.publicado strong {
		color: var(--texto);
	}

	.tarjetas {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
		gap: 0.75rem;
	}

	.tarjeta-tasa {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 1rem 1.05rem;
		background: var(--superficie-elevada);
		/* Canto de marca en vez de sombra más fuerte: es la cifra que resume
		   a las otras y se distingue por color, no por altura. */
		border: 1px solid var(--marca);
		border-radius: var(--radius-md);
		box-shadow: var(--elev-1);
	}

	/* Mismo bloque de rótulo que TarjetaCifra, para que las dos clases de
	   tarjeta alineen su cifra a la misma altura dentro de la hilera. */
	.tarjeta-tasa .rotulo {
		display: block;
		min-height: 2.1em;
		font-size: 0.72rem;
		font-weight: 600;
		line-height: 1.35;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--texto-suave);
	}

	.tarjeta-tasa .valor {
		font-size: 1.9rem;
		font-weight: 700;
		font-stretch: 112%;
		line-height: 1.02;
		letter-spacing: -0.01em;
		font-variant-numeric: tabular-nums;
	}

	.tarjeta-tasa .ayuda,
	.tarjeta-tasa .sin-dato {
		font-size: 0.72rem;
		line-height: 1.45;
		color: var(--texto-suave);
	}

	.grafico {
		padding: 1.25rem;
		background: var(--superficie-elevada);
		border: var(--canto);
		border-radius: var(--radius-md);
		box-shadow: var(--elev-1);
	}

	.par {
		display: grid;
		gap: 1.5rem;
	}

	@media (width >= 48rem) {
		.par {
			grid-template-columns: 1fr 1fr;
		}
	}

	.declarado {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.25rem;
		background: var(--superficie-elevada);
		border: var(--canto);
		border-radius: var(--radius-md);
		box-shadow: var(--elev-1);
	}

	h2 {
		font-size: 1rem;
		font-weight: 700;
	}

	.alcance-declarado {
		font-size: 0.84rem;
		line-height: 1.6;
		color: var(--texto-suave);
	}

	.alcance-declarado strong {
		color: var(--texto);
	}

	.mejores ol {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background: var(--superficie-elevada);
		border: var(--canto);
		border-radius: var(--radius-md);
		box-shadow: var(--elev-1);
	}

	.mejores a {
		display: grid;
		grid-template-columns: 52px 1fr auto;
		align-items: center;
		gap: 0.85rem;
		padding: 0.7rem 0.85rem;
		color: inherit;
		text-decoration: none;
		transition: background-color var(--transicion);
	}

	.mejores li + li a {
		border-top: var(--canto);
	}

	.mejores a:hover {
		background: var(--superficie-alt);
	}

	.miniatura {
		display: grid;
		place-items: center;
		width: 52px;
		height: 52px;
		overflow: hidden;
		border-radius: var(--radius-sm);
		background: var(--superficie-alt);
		color: var(--texto-suave);
	}

	.miniatura img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.mejores .texto {
		font-size: 0.85rem;
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.numeros {
		text-align: right;
	}

	.numeros strong {
		display: block;
		font-size: 1rem;
		font-variant-numeric: tabular-nums;
	}

	.numeros em {
		font-style: normal;
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--texto-suave);
	}

	.mejores h2 {
		margin-bottom: 0.6rem;
	}

	.nota,
	.vacio,
	.cargando {
		font-size: 0.8rem;
		line-height: 1.55;
		color: var(--texto-suave);
	}

	.nota {
		margin-top: 0.6rem;
	}

	.error {
		padding: 0.7rem 0.85rem;
		border-left: 3px solid var(--color-error);
		background: var(--superficie-alt);
		font-size: 0.85rem;
		color: var(--color-error);
	}
</style>
