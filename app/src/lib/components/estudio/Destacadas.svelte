<script lang="ts">
	import { img, type Destacada } from '$lib/api';
	import { estudio } from '$lib/estudio';
	import IconoEstudio from './IconoEstudio.svelte';

	/**
	 * La fila de destacadas del perfil.
	 *
	 * Sólo enseña; gestionar es cosa de `/estudio/destacadas`. Antes esta
	 * misma fila creaba una destacada con un título y ahí se acababa: no
	 * había forma de meterle historias, así que lo que quedaba en el perfil
	 * era un aro gris sin nada dentro y sin nada que explicara para qué
	 * servía. Una función a medias hecha desde el sitio donde menos espacio
	 * hay para explicarla.
	 *
	 * En un municipio son la parte más útil del formato historia: «Cómo sacar
	 * la patente» o «Horarios de recolección» se preguntan todo el año y sin
	 * destacada caducarían en tres días.
	 */
	let { alias }: { alias: string } = $props();

	let destacadas = $state<Destacada[]>([]);

	$effect(() => {
		const cual = alias;
		let vigente = true;

		estudio
			.destacadas(cual)
			.then(({ data }) => vigente && (destacadas = data))
			.catch(() => vigente && (destacadas = []));

		return () => {
			vigente = false;
		};
	});
</script>

<section class="destacadas" aria-label="Destacadas del perfil">
	<ul>
		{#each destacadas as d (d.id)}
			<li>
				<a href="/noticias/historias/{alias}?destacada={d.id}" class="aro">
					<span class="circulo">
						{#if d.portada}
							<img src={img(d.portada, 400)} alt="" />
						{:else}
							<IconoEstudio nombre="historia" tamano={20} />
						{/if}
					</span>
					<span class="nombre">{d.titulo}</span>
				</a>
			</li>
		{/each}

		<li>
			<a href="/estudio/destacadas" class="aro">
				<span class="circulo nueva">
					<IconoEstudio nombre={destacadas.length ? 'ajustes' : 'mas'} tamano={22} />
				</span>
				<span class="nombre">{destacadas.length ? 'Gestionar' : 'Nueva'}</span>
			</a>
		</li>
	</ul>
</section>

<style>
	.destacadas {
		padding: 0.25rem 1rem 1rem;
	}

	ul {
		display: flex;
		gap: 1.1rem;
		overflow-x: auto;
		scrollbar-width: none;
		padding-bottom: 0.25rem;
	}

	ul::-webkit-scrollbar {
		display: none;
	}

	.aro {
		display: flex;
		width: 4.6rem;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		border: none;
		background: none;
		color: inherit;
		font-family: inherit;
		cursor: pointer;
		text-decoration: none;
	}

	.circulo {
		display: grid;
		place-items: center;
		width: 62px;
		height: 62px;
		overflow: hidden;
		border: 1px solid var(--borde);
		border-radius: 999px;
		background: var(--superficie-alt);
	}

	.circulo img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.nueva {
		border-style: dashed;
		color: var(--texto-suave);
	}

	.nombre {
		width: 100%;
		font-size: 0.7rem;
		color: var(--texto-suave);
		text-align: center;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}




</style>
