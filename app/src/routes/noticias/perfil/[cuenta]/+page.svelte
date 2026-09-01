<script lang="ts">
	import { page } from '$app/state';
	import Migas from '$lib/components/Migas.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import Insignia from '$lib/components/Insignia.svelte';
	import CuadriculaPerfil from '$lib/components/CuadriculaPerfil.svelte';
	import BotonSeguir from '$lib/components/BotonSeguir.svelte';
	import { img, social, type PublicacionResumen } from '$lib/api';
	import { registrar } from '$lib/metricas';
	import { perfilCuenta } from '$lib/seo';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const c = $derived(data.cuenta);

	/**
	 * Los seguidores en vivo. Salen del servidor y los actualiza el propio
	 * botón: la cifra y el estado del botón tienen que decir lo mismo en el
	 * mismo instante.
	 */
	let seguidores = $state(0);

	let publicaciones = $state<PublicacionResumen[]>(data.publicaciones);
	let cursor = $state<number | null>(data.siguienteCursor);
	let cargando = $state(false);
	let centinela = $state<HTMLElement | null>(null);

	$effect(() => {
		publicaciones = data.publicaciones;
		cursor = data.siguienteCursor;
	});

	// Abrir un perfil cuenta como visita: es lo que distingue «llegaron a la
	// publicación» de «vinieron a ver a esta dirección».
	$effect(() => {
		registrar({ tipo: 'visita_perfil', recurso: 'cuenta', id: c.alias, origen: 'perfil' });
	});

	async function cargarMas() {
		if (cargando || cursor === null) return;
		cargando = true;
		try {
			const pagina = await social.publicacionesDeCuenta(fetch, c.alias, cursor);
			publicaciones = [...publicaciones, ...pagina.data];
			cursor = pagina.meta.siguiente_cursor;
		} finally {
			cargando = false;
		}
	}

	$effect(() => {
		const nodo = centinela;
		if (!nodo) return;
		const obs = new IntersectionObserver(
			(e) => {
				if (e[0]?.isIntersecting) cargarMas();
			},
			{ rootMargin: '600px 0px' }
		);
		obs.observe(nodo);
		return () => obs.disconnect();
	});
</script>

<Seo
	titulo={c.nombre}
	descripcion={c.biografia || `Publicaciones de ${c.nombre} en el sitio del GAD Municipal de Francisco de Orellana.`}
	imagen={c.portada ? img(c.portada, 1600) : undefined}
	datos={perfilCuenta(page.url, {
		slug: c.alias,
		nombre: c.nombre,
		biografia: c.biografia,
		avatar: c.avatar ? img(c.avatar, 800) : null,
		tipo: c.tipo
	})}
/>

<div class="contenedor py-8 md:py-12">
	<Migas
		tramos={[
			{ texto: 'Inicio', href: '/' },
			{ texto: 'Noticias', href: '/noticias' },
			{ texto: c.nombre }
		]}
	/>

	<div class="mx-auto max-w-xl">
		{#if c.portada}
			<div class="aspect-[3/1] w-full bg-[var(--superficie-alt)]">
				<img src={img(c.portada, 1600)} alt="" class="h-full w-full object-cover" />
			</div>
		{/if}

		<header class="flex flex-col items-center gap-3 py-6 text-center">
			{#if c.tiene_historias_activas}
				<a href="/noticias/historias/{c.alias}" aria-label="Ver historias activas de {c.nombre}">
					<Avatar cuenta={c} tamano={92} conAnillo />
				</a>
			{:else}
				<Avatar cuenta={c} tamano={92} />
			{/if}

			<div>
				<h1 class="flex items-center justify-center gap-1.5 text-[1.25rem] font-bold">
					{c.nombre}
					{#if c.verificada}<Insignia tamano={16} />{/if}
				</h1>
				<p class="text-[0.85rem] text-[var(--texto-suave)]">@{c.alias}</p>
			</div>

			<!--
				Las tres cifras del perfil. Salen de filas reales —publicaciones
				publicadas, quién sigue a esta cuenta, a quién sigue ella— y no
				de una estimación. Ver Cuenta::recontar() en la API.
			-->
			<ul class="flex flex-wrap justify-center gap-x-6 gap-y-1 text-[0.88rem] text-[var(--texto-suave)]">
				<li><strong class="text-[var(--texto)] tabular-nums">{c.publicaciones_contador ?? 0}</strong> publicaciones</li>
				<li><strong class="text-[var(--texto)] tabular-nums">{seguidores}</strong> seguidores</li>
				<li><strong class="text-[var(--texto)] tabular-nums">{c.seguidos_contador ?? 0}</strong> seguidos</li>
			</ul>

			<BotonSeguir cuenta={c} alCambiarTotal={(n) => (seguidores = n)} />

			{#if c.biografia}
				<p class="max-w-md text-[0.9rem] leading-relaxed text-[var(--texto-suave)]">{c.biografia}</p>
			{/if}

			{#if c.enlace_url}
				<a
					href={c.enlace_url}
					target="_blank"
					rel="noopener"
					class="text-[0.85rem] font-semibold text-[var(--color-selva-800)] hover:underline"
				>
					{c.enlace_url.replace(/^https?:\/\//, '')}
				</a>
			{/if}
		</header>

		{#if c.destacadas?.length}
			<div class="flex gap-4 overflow-x-auto pb-5">
				{#each c.destacadas as d (d.id)}
					<a
						href="/noticias/historias/{c.alias}?destacada={d.id}"
						class="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 text-center no-underline"
					>
						<span
							class="flex size-16 items-center justify-center overflow-hidden rounded-full border border-[var(--borde)] bg-[var(--superficie-alt)]"
						>
							{#if d.portada}
								<img src={img(d.portada, 400)} alt="" class="h-full w-full object-cover" />
							{/if}
						</span>
						<span class="w-full truncate text-[0.7rem] text-[var(--texto-suave)]">{d.titulo}</span>
					</a>
				{/each}
			</div>
		{/if}

		<div class="border-t border-[var(--borde)] pt-0.5">
			<CuadriculaPerfil {publicaciones} />
		</div>

		<div class="mt-6 text-center">
			{#if cursor !== null}
				<button
					bind:this={centinela}
					type="button"
					onclick={cargarMas}
					aria-disabled={cargando}
					class="inline-flex min-h-12 items-center justify-center border border-[var(--borde)] px-7 font-semibold transition-colors hover:border-[var(--marca)]"
				>
					{cargando ? 'Cargando…' : 'Cargar más'}
				</button>
			{/if}
		</div>
	</div>
</div>
