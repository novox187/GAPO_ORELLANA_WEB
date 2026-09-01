import { estudio, ErrorEstudio, type Creador, type CuentaEstudio } from './estudio';

/**
 * Quién está dentro del estudio y en qué cuenta está trabajando.
 *
 * La cuenta activa es estado de aquí y no de la URL a propósito. Quien
 * administra gestiona las veintiuna y va a moverse entre el perfil, el
 * compositor y las estadísticas sin cambiar de cuenta: llevarla en cada ruta
 * significaría escribirla en todos los enlaces y perderla en cuanto uno se
 * olvide. Se recuerda en `localStorage` para que volver mañana no empiece
 * otra vez por la Alcaldía.
 *
 * El token no pasa por aquí: vive en una cookie httpOnly que gestiona
 * `/api/estudio/sesion` del lado del servidor, igual que la del ciudadano.
 */
const CLAVE_RECORDADA = 'estudio:cuenta';

class EstadoEstudio {
	creador = $state<Creador | null>(null);
	aliasActivo = $state<string | null>(null);
	cargando = $state(false);
	error = $state<string | null>(null);

	get autenticado(): boolean {
		return this.creador !== null;
	}

	/** La cuenta en la que se está trabajando ahora mismo. */
	get cuenta(): CuentaEstudio | null {
		const cuentas = this.creador?.cuentas ?? [];

		return cuentas.find((c) => c.alias === this.aliasActivo) ?? cuentas[0] ?? null;
	}

	get variasCuentas(): boolean {
		return (this.creador?.cuentas.length ?? 0) > 1;
	}

	/**
	 * Si puede cambiar de perfil sin volver a entrar con la contraseña de esa
	 * cuenta. Sólo administración.
	 *
	 * Se pregunta por el rol y no por «¿tiene más de una cuenta?», aunque hoy
	 * las dos preguntas den lo mismo: contar cuentas describe el efecto, el
	 * rol dice la razón. El día que alguien gestione dos direcciones sin ser
	 * administrador, la versión que cuenta le daría el selector sin que nadie
	 * lo hubiera decidido.
	 *
	 * Esto no protege nada por sí solo —lo hace `gestionaTodasLasCuentas()`
	 * en la API, y cada controlador resuelve la cuenta con `firstOrFail()`—;
	 * decide qué se ofrece, no qué se acepta.
	 */
	get puedeCambiarDePerfil(): boolean {
		return this.creador?.roles.includes('administrador') ?? false;
	}

    /**
     * Coloca lo que trajo `+layout.ts` y resuelve qué cuenta queda activa.
     *
     * Se comprueba que la recordada siga estando entre las suyas: alguien
     * puede haber cambiado de dirección adscrita desde la última visita, y
     * dejar activa una cuenta que ya no gestiona haría que todas las
     * peticiones devolvieran 404 sin explicar por qué.
     */
	sincronizar(creador: Creador | null): void {
		this.creador = creador;

		if (!creador) {
			this.aliasActivo = null;

			return;
		}

		const suyas = creador.cuentas.map((c) => c.alias);

		if (this.aliasActivo && suyas.includes(this.aliasActivo)) return;

		const recordada = leer(CLAVE_RECORDADA);
		this.aliasActivo = recordada && suyas.includes(recordada) ? recordada : (suyas[0] ?? null);
	}

	/**
	 * Cambia la cuenta activa, si es una de las suyas.
	 *
	 * La comprobación no es la que protege nada —cada controlador del estudio
	 * resuelve la cuenta con `cuentasQueGestiona()->firstOrFail()`, así que
	 * pedir una ajena devuelve 404 se ponga lo que se ponga aquí— pero evita
	 * que un alias inventado deje la interfaz apuntando a una cuenta que no
	 * existe y todas las peticiones fallando sin explicar por qué. Es la misma
	 * razón por la que `sincronizar` revalida la cuenta recordada.
	 */
	cambiarCuenta(alias: string): void {
		const suyas = this.creador?.cuentas.map((c) => c.alias) ?? [];
		if (!suyas.includes(alias)) return;

		this.aliasActivo = alias;
		escribir(CLAVE_RECORDADA, alias);
	}

	/** Refresca las cifras de la cabecera tras publicar o retirar algo. */
	async refrescar(): Promise<void> {
		const alias = this.cuenta?.alias;
		if (!alias || !this.creador) return;

		try {
			const { data } = await estudio.perfil(alias);
			this.creador.cuentas = this.creador.cuentas.map((c) => (c.alias === alias ? data : c));
		} catch {
			// Sin red: las cifras se quedan como estaban hasta la próxima carga.
		}
	}

	async entrar(correo: string, password: string): Promise<boolean> {
		this.cargando = true;
		this.error = null;

		try {
			this.sincronizar(await estudio.entrar(correo, password));

			return true;
		} catch (e) {
			this.error =
				e instanceof ErrorEstudio
					? e.primero()
					: 'No se pudo conectar. Revisa tu conexión e inténtalo otra vez.';

			return false;
		} finally {
			this.cargando = false;
		}
	}

	async salir(): Promise<void> {
		await estudio.salir().catch(() => null);
		this.creador = null;
		this.aliasActivo = null;
	}
}

function leer(clave: string): string | null {
	try {
		return localStorage.getItem(clave);
	} catch {
		return null;
	}
}

function escribir(clave: string, valor: string): void {
	try {
		localStorage.setItem(clave, valor);
	} catch {
		// Navegación privada o almacenamiento bloqueado: se pierde la
		// preferencia, no la sesión.
	}
}

export const sesionEstudio = new EstadoEstudio();
