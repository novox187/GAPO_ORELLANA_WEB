<script lang="ts">
	import Marca from './Marca.svelte';

	const columnas = [
		{
			titulo: 'Noticias',
			enlaces: [
				{ href: '/noticias', texto: 'El feed' },
				{ href: '/noticias/perfil/alcaldia', texto: 'Alcaldía' },
				{ href: '/noticias/cuentas', texto: 'Todas las cuentas' }
			]
		},
		{
			titulo: 'Trámites',
			enlaces: [
				{ href: '/tramites?categoria=negocios', texto: 'Negocios y patentes' },
				{ href: '/tramites?categoria=vivienda-y-construccion', texto: 'Construcción' },
				{ href: '/tramites?categoria=agua-y-ambiente', texto: 'Agua y ambiente' },
				{ href: '/tramites', texto: 'Ver todos' }
			]
		},
		{
			titulo: 'Transparencia',
			enlaces: [
				{ href: '/transparencia/lotaip', texto: 'LOTAIP' },
				{ href: '/transparencia/ordenanzas', texto: 'Ordenanzas' },
				{ href: '/transparencia/rendicion-cuentas', texto: 'Rendición de cuentas' },
				{ href: '/transparencia/pac', texto: 'Contratación (PAC)' }
			]
		},
		{
			titulo: 'El cantón',
			enlaces: [
				{ href: '/canton/datos-canton', texto: 'Datos del cantón' },
				{ href: '/canton/historia-simbolos', texto: 'Historia y símbolos' },
				{ href: '/canton/alcaldia', texto: 'Alcaldía' },
				{ href: '/canton/concejo', texto: 'Concejo Municipal' }
			]
		}
	];

	const redes = [
		{ red: 'Facebook', url: 'https://www.facebook.com/MunicipiodeFranciscodeOrellana' },
		{ red: 'Instagram', url: 'https://www.instagram.com/gadmforellana' },
		{ red: 'YouTube', url: 'https://www.youtube.com/@GADFranciscodeOrellana' },
		{ red: 'X', url: 'https://x.com/GADMFOrellana' },
		{ red: 'TikTok', url: 'https://www.tiktok.com/@munifranciscodeorellana' }
	];
</script>

<footer class="mt-24 bg-[var(--color-carbon-900)] text-white/80">
	<div class="contenedor grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(4,1fr)] md:py-20">
		<div>
			<Marca invertido alto="h-16" />
			<p class="mt-5 max-w-xs text-sm leading-relaxed text-white/60">
				Gobierno Autónomo Descentralizado Municipal de Francisco de Orellana, en el corazón de la
				Amazonía ecuatoriana.
			</p>
			<a
				href="/contacto"
				class="mt-6 inline-flex min-h-11 items-center bg-[var(--color-achiote-400)] px-5 text-sm font-semibold text-[var(--color-carbon-900)] no-underline transition-transform duration-150 hover:-translate-y-px"
			>
				Atención ciudadana
			</a>
		</div>

		{#each columnas as col (col.titulo)}
			<div>
				<h2 class="mb-4 text-sm font-semibold text-white">{col.titulo}</h2>
				<ul class="space-y-2.5">
					{#each col.enlaces as e (e.href)}
						<li>
							<a
								href={e.href}
								class="text-sm text-white/60 no-underline transition-colors hover:text-[var(--color-achiote-400)]"
								>{e.texto}</a
							>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>

	<div class="border-t border-white/10">
		<div
			class="contenedor flex flex-col gap-4 py-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between"
		>
			<p>© {new Date().getFullYear()} GAD Municipal Francisco de Orellana</p>
			<ul class="flex flex-wrap gap-x-5 gap-y-2">
				{#each redes as r (r.red)}
					<li>
						<a
							href={r.url}
							target="_blank"
							rel="noopener"
							class="text-white/50 no-underline hover:text-white">{r.red}</a
						>
					</li>
				{/each}
			</ul>
		</div>
	</div>
</footer>
