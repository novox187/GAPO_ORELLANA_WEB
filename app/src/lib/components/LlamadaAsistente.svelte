<script lang="ts">
	import { goto } from '$app/navigation';
	import Pictograma from '$lib/components/Pictograma.svelte';

	/**
	 * La invitación al asistente en la portada.
	 *
	 * Va después de las puertas por intención y no antes: quien ya sabe lo que
	 * busca tiene delante las seis puertas, y esto es para quien NO sabe cómo
	 * se llama lo que necesita — que es justo el problema que el asistente
	 * resuelve. Ponerlo primero empujaría hacia el chat a gente a la que le
	 * bastaba un clic.
	 *
	 * El campo es real, no un señuelo que lleva a otra caja: lo que se escriba
	 * aquí llega al chat y se envía solo.
	 */
	let consulta = $state('');

	function abrir(e: SubmitEvent) {
		e.preventDefault();
		const texto = consulta.trim();
		goto(texto.length >= 2 ? `/asistente?q=${encodeURIComponent(texto)}` : '/asistente');
	}
</script>

<section class="bg-carbon-900 text-papel" aria-labelledby="titulo-asistente">
	<div class="contenedor py-14 md:py-20">
		<div class="grid items-center gap-8 md:grid-cols-[auto_1fr]">
			<!-- El jaguar a tamaño grande: es la cara del asistente y un
			     pictograma del propio municipio, no un icono de catálogo. -->
			<div class="hidden md:block" aria-hidden="true">
				<span class="tesela-grande grid h-32 w-32 place-items-center bg-selva-600 text-carbon-900">
					<Pictograma nombre="cultura" clase="h-20 w-20" />
				</span>
			</div>

			<div>
				<p class="text-sm font-semibold tracking-[0.18em] text-achiote-400 uppercase">
					Asistente del municipio
				</p>

				<h2 id="titulo-asistente" class="display mt-3 text-[clamp(1.8rem,4.4vw,3rem)] leading-[1.05]">
					¿No sabe cómo se llama<br class="hidden sm:block" /> el trámite que necesita?
				</h2>

				<p class="mt-4 max-w-xl text-lg text-papel/75">
					Descríbalo con sus palabras. Le muestro la ficha oficial, con sus requisitos y a
					qué dirección acudir.
				</p>

				<form class="mt-7 flex flex-col gap-3 sm:flex-row" onsubmit={abrir}>
					<label for="consulta-portada" class="sr-only">Escriba lo que necesita hacer</label>
					<input
						id="consulta-portada"
						type="text"
						bind:value={consulta}
						maxlength="500"
						placeholder="Quiero poner un local…"
						class="min-h-14 flex-1 rounded-lg border-2 border-white/15 bg-white/5 px-5 text-lg text-papel placeholder:text-papel/40 focus:border-selva-400 focus:bg-white/10 focus:outline-none"
					/>
					<button
						type="submit"
						class="grupo flex min-h-14 items-center justify-center gap-2 rounded-lg bg-achiote-500 px-7 text-lg font-semibold text-carbon-900 transition hover:bg-achiote-400 focus-visible:ring-2 focus-visible:ring-achiote-400 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-900 focus-visible:outline-none"
					>
						Preguntar
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
							<path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</button>
				</form>

				<p class="mt-4 text-sm text-papel/55">
					Funciona en servidores del municipio. Sus consultas no salen de aquí.
				</p>
			</div>
		</div>
	</div>
</section>

<style>
	/* El bisel diagonal en esquina, firma del logotipo municipal. */
	.tesela-grande {
		clip-path: polygon(0 0, 100% 0, 100% calc(100% - 1.75rem), calc(100% - 1.75rem) 100%, 0 100%);
	}
</style>
