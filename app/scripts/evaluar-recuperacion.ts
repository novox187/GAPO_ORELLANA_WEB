/**
 * Banco de pruebas de la recuperación, sin levantar la web.
 *
 * Es la herramienta que decide si el asistente sirve: si la recuperación
 * falla aquí, ninguna capa por encima lo va a arreglar. Mide dos cosas
 * distintas y las reporta por separado:
 *
 * 1. **Acierto** — ¿sale la ficha correcta primera, para preguntas que sí
 *    tienen respuesta en el sitio?
 * 2. **Calibración** — ¿la confianza que declara el sistema se corresponde
 *    con la realidad? Concretamente: ninguna pregunta sin respuesta debería
 *    salir con confianza `alta`, y ninguna con respuesta debería salir
 *    `baja`. Es lo que evita que el asistente afirme cosas que no sabe.
 *
 * Compara además contra el buscador léxico que ya tenía el sitio, para que
 * la mejora sea un número y no una impresión.
 *
 *     node scripts/evaluar-recuperacion.ts            # la tabla completa
 *     node scripts/evaluar-recuperacion.ts "mi consulta"
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { consultar, type Confianza } from '../src/lib/server/recuperacion.ts';
import { buscar, type DocumentoIndice } from '../src/lib/api.ts';
import { rutaPublica } from '../src/lib/rutas.ts';

const AQUI = dirname(fileURLToPath(import.meta.url));
const API = join(AQUI, '..', '..', 'data', 'api', 'v1');

/**
 * `espera` es el prefijo de la ruta que debería salir primera. `null`
 * significa que la pregunta no tiene respuesta en el sitio: el asistente no
 * tiene que adivinarla, tiene que no afirmarla.
 */
const CASOS: { consulta: string; espera: string | null }[] = [
	// Lenguaje del ciudadano → vocabulario del municipio
	{ consulta: 'quiero poner un local', espera: '/tramites/patente' },
	{ consulta: 'necesito construir mi casa', espera: '/tramites/requisitos-para-permiso-de-const' },
	{ consulta: 'no me llega el agua', espera: '/tramites/servicio-de-agua-potable' },
	{ consulta: 'como saco la patente municipal', espera: '/tramites/' },
	{ consulta: 'quiero abrir un restaurante', espera: '/tramites/' },
	{ consulta: 'necesito el titulo de mi terreno', espera: '/tramites/' },
	{ consulta: 'me quiero llevar la basura de mi barrio', espera: '/tramites/' },

	// Términos exactos del municipio
	{ consulta: 'permiso de construccion', espera: '/tramites/requisitos-para-permiso-de-const' },
	{ consulta: 'servicio de agua potable', espera: '/tramites/servicio-de-agua-potable' },
	{ consulta: 'rendicion de cuentas', espera: '/transparencia/rendicion-cuentas' },
	{ consulta: 'ordenanzas municipales', espera: '/transparencia/ordenanzas' },
	{ consulta: 'lotaip', espera: '/transparencia/lotaip' },

	// Institucional y turismo
	{ consulta: 'quien es el alcalde', espera: '/canton/alcaldia' },
	{ consulta: 'historia del canton', espera: '/canton/historia-simbolos' },
	{ consulta: 'que visitar en el coca', espera: '/canton/lugares' },
	{ consulta: 'cuanta gente vive en orellana', espera: '/canton/datos-canton' },
	{ consulta: 'coca zoo', espera: '/canton/coca-zoo' },

	// Sin respuesta en el sitio: son competencia de otra institución, o no
	// tienen nada que ver con el municipio.
	{ consulta: 'cuanto cuesta el pasaporte', espera: null },
	{ consulta: 'como saco la cedula', espera: null },
	{ consulta: 'como renuevo mi licencia de conducir', espera: null },
	{ consulta: 'quiero matricular mi carro en quito', espera: null },
	{ consulta: 'necesito una cita medica', espera: null },
	{ consulta: 'quiero comprar bitcoin', espera: null },
	{ consulta: 'receta de ceviche', espera: null },
	{ consulta: 'donde queda la torre eiffel', espera: null },
	{ consulta: 'quien gano el mundial', espera: null }
];

const VERDE = '\x1b[32m';
const ROJO = '\x1b[31m';
const AMBAR = '\x1b[33m';
const GRIS = '\x1b[90m';
const FIN = '\x1b[0m';

const COLOR: Record<Confianza, string> = { alta: VERDE, media: AMBAR, baja: GRIS };

const documentos = (
	JSON.parse(readFileSync(join(API, 'search/index.json'), 'utf8')) as { data: DocumentoIndice[] }
).data;

async function evaluarUno(consulta: string, espera: string | null, detalle: boolean) {
	const t0 = Date.now();
	const { oficiales, noticias, confianza } = await consultar(consulta, 5);
	const ms = Date.now() - t0;

	const primera = oficiales[0];
	const url = primera?.fragmento.url ?? '';
	const acierta = espera === null ? confianza !== 'alta' : url.startsWith(espera);

	const marca = acierta ? `${VERDE}ok   ${FIN}` : `${ROJO}FALLA${FIN}`;
	console.log(
		`${marca} ${COLOR[confianza]}${confianza.padEnd(5)}${FIN} ${GRIS}${String(ms).padStart(4)} ms` +
			` sem=${(primera?.semantico ?? 0).toFixed(3)} bm=${(primera?.lexico ?? 0).toFixed(1).padStart(5)}${FIN}` +
			`  «${consulta}»${espera === null ? '' : `  ${GRIS}→ ${url.slice(0, 46)}${FIN}`}`
	);

	if (detalle || !acierta) {
		for (const r of oficiales.slice(0, 4)) {
			console.log(
				`        ${GRIS}sem=${r.semantico.toFixed(3)} bm=${r.lexico.toFixed(1).padStart(5)}${FIN} ` +
					`${r.fragmento.url.slice(0, 56)}`
			);
		}
		if (noticias.length) console.log(`        ${GRIS}noticia: ${noticias[0].fragmento.url.slice(0, 56)}${FIN}`);
		const lexico = buscar(documentos, consulta).slice(0, 2);
		console.log(
			`        ${GRIS}buscador actual: ${lexico.length ? lexico.map((d) => rutaPublica(d.url).slice(0, 40)).join(' · ') : '(nada)'}${FIN}`
		);
	}
	return { acierta, confianza, espera };
}

async function principal() {
	const argumento = process.argv[2];
	if (argumento) {
		await evaluarUno(argumento, '', true);
		return;
	}

	console.log('\nRecuperación híbrida — semántica + BM25, con lo oficial separado de las noticias\n');
	let aciertos = 0;
	let total = 0;
	let falsaAlta = 0;
	let falsaBaja = 0;
	let conRespuesta = 0;
	let sinRespuesta = 0;

	for (const c of CASOS) {
		const { acierta, confianza, espera } = await evaluarUno(c.consulta, c.espera, false);
		if (espera === null) {
			sinRespuesta++;
			if (confianza === 'alta') falsaAlta++;
		} else {
			conRespuesta++;
			total++;
			if (acierta) aciertos++;
			if (confianza === 'baja') falsaBaja++;
		}
	}

	console.log(`\n  Acierto:      ${aciertos}/${total} preguntas con respuesta dan la ficha correcta primera.`);
	console.log(
		`  Calibración:  ${falsaAlta}/${sinRespuesta} preguntas SIN respuesta se declararon "alta" ` +
			`${falsaAlta === 0 ? VERDE + '(ninguna: el asistente no afirma lo que no sabe)' : ROJO + '(afirma cosas que no sabe)'}${FIN}`
	);
	console.log(
		`                ${falsaBaja}/${conRespuesta} preguntas CON respuesta se declararon "baja" ` +
			`${falsaBaja === 0 ? VERDE + '(ninguna: no descarta lo que sí tiene)' : AMBAR + '(descarta de más)'}${FIN}\n`
	);
}

principal().catch((e) => {
	console.error(e);
	process.exit(1);
});
