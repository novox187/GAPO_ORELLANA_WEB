<script lang="ts">
	import Migas from '$lib/components/Migas.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import Insignia from '$lib/components/Insignia.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const alcaldia = $derived(data.cuentas.filter((c) => c.tipo === 'alcaldia'));
	const direcciones = $derived(data.cuentas.filter((c) => c.tipo === 'direccion'));
</script>

<Seo
	titulo="Cuentas"
	descripcion="La Alcaldía y las direcciones municipales que publican en Noticias: una cuenta por cada una."
/>

<div class="contenedor py-8 md:py-12">
	<Migas
		tramos={[{ texto: 'Inicio', href: '/' }, { texto: 'Noticias', href: '/noticias' }, { texto: 'Cuentas' }]}
	/>

	<div class="mx-auto max-w-2xl">
		<header class="mb-6">
			<h1 class="display text-[clamp(1.8rem,4vw,2.6rem)]">Cuentas</h1>
			<p class="mt-2 text-[0.95rem] leading-relaxed text-[var(--texto-suave)]">
				La Alcaldía y cada una de las direcciones municipales publican con su propia voz.
			</p>
		</header>

		<ul class="divide-y divide-[var(--borde)] border-y border-[var(--borde)]">
			{#each [...alcaldia, ...direcciones] as c (c.id)}
				<li>
					<a
						href="/noticias/perfil/{c.alias}"
						class="flex items-center gap-3.5 py-3.5 no-underline transition-colors hover:bg-[var(--superficie-alt)]"
					>
						<Avatar cuenta={c} tamano={48} conAnillo={c.tiene_historias_activas} />
						<div class="min-w-0 flex-1">
							<p class="flex items-center gap-1 leading-tight font-bold text-[var(--texto)]">
								{c.nombre}
								{#if c.verificada}<Insignia tamano={13} />{/if}
							</p>
							<p class="text-[0.8rem] text-[var(--texto-suave)]">@{c.alias}</p>
						</div>
					</a>
				</li>
			{/each}
		</ul>
	</div>
</div>
