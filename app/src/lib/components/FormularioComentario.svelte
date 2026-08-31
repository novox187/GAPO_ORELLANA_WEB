<script lang="ts">
	import { ErrorEscritura, social, type Comentario } from '$lib/api';
	import { sesion } from '$lib/sesion.svelte';

	let {
		slug,
		alEnviar
	}: {
		slug: string;
		/** Se llama con el comentario recién creado, para anteponerlo a la lista sin recargar. */
		alEnviar: (comentario: Comentario) => void;
	} = $props();

	let texto = $state('');
	let enviando = $state(false);
	let error = $state<string | null>(null);

	async function enviar(evento: SubmitEvent) {
		evento.preventDefault();
		if (!texto.trim() || enviando) return;

		enviando = true;
		error = null;

		try {
			const r = await social.comentar(slug, texto.trim());
			alEnviar(r.data);
			texto = '';
		} catch (e) {
			if (e instanceof ErrorEscritura) {
				if (e.estado === 401) {
					sesion.pedirInicio();
				} else {
					error = e.primero();
				}
			} else {
				error = 'No se pudo publicar el comentario.';
			}
		} finally {
			enviando = false;
		}
	}
</script>

{#if sesion.autenticado}
	<form onsubmit={enviar} class="flex items-start gap-2.5">
		<label for="nuevo-comentario" class="sr-only">Escribe un comentario</label>
		<textarea
			id="nuevo-comentario"
			bind:value={texto}
			rows="1"
			maxlength="1000"
			placeholder="Escribe un comentario…"
			class="campo min-h-10 flex-1 resize-y"
		></textarea>
		<button
			type="submit"
			aria-disabled={enviando || !texto.trim()}
			class="inline-flex min-h-10 shrink-0 items-center justify-center bg-[var(--color-achiote-500)] px-4 text-[0.85rem] font-bold text-[var(--color-carbon-900)] disabled:opacity-50"
		>
			{enviando ? 'Enviando…' : 'Publicar'}
		</button>
	</form>
	{#if error}
		<p role="alert" class="mt-1.5 text-[0.8rem] text-[var(--color-error)]">{error}</p>
	{/if}
{:else}
	<button
		type="button"
		onclick={() => sesion.pedirInicio()}
		class="inline-flex min-h-11 w-full cursor-pointer items-center justify-center border border-[var(--borde)] px-4 text-[0.88rem] font-semibold transition-colors hover:border-[var(--marca)]"
	>
		Inicia sesión para comentar
	</button>
{/if}

<style>
	.campo {
		border: 1px solid var(--borde);
		background: var(--superficie);
		color: var(--texto);
		padding: 0.5rem 0.75rem;
		font-size: 0.88rem;
		font-family: inherit;
	}

	.campo:focus-visible {
		outline: 2px solid var(--foco);
		outline-offset: 1px;
	}
</style>
