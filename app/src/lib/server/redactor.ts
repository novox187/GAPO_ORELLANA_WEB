/**
 * Fase 2: el párrafo que conecta la pregunta con la ficha.
 *
 * Es la única pieza del asistente que genera texto, y está construida para
 * ser prescindible. Si no hay modelo, si va lento o si responde algo que no
 * pasa el control, la respuesta se entrega igual — sin el párrafo, y sin que
 * el ciudadano vea un error. La ficha ya contiene la respuesta completa.
 *
 * **Modelo local, nunca un tercero.** El servicio corre en el mismo Coolify
 * que la web, en la red interna de Docker, y no se expone a internet. Ningún
 * dato del municipio ni ninguna pregunta de un ciudadano sale del perímetro.
 *
 * Configuración:
 *   REDACTOR_URL      http://ollama:11434   (vacío = fase 1 pura, sin párrafo)
 *   REDACTOR_MODELO   qwen3:4b-instruct
 *   REDACTOR_TIMEOUT  4000
 */

import type { Ficha } from './ficha';

const URL_BASE = process.env.REDACTOR_URL?.replace(/\/+$/, '') ?? '';
const MODELO = process.env.REDACTOR_MODELO ?? 'qwen3:4b-instruct';
const TIMEOUT = Number(process.env.REDACTOR_TIMEOUT ?? 4000);

/** Tope de salida. Una frase, no un ensayo: es lo que lo mantiene rápido. */
const MAX_TOKENS = 80;

export const REDACTOR_ACTIVO = URL_BASE !== '';

/**
 * La tarea es deliberadamente diminuta. No se le pide enumerar requisitos,
 * ni citar importes, ni explicar el trámite: para eso está la ficha, que ya
 * va debajo con el texto oficial. Se le pide una sola frase de enlace. Un
 * modelo al que no se le pide un dato no puede equivocarse en ese dato.
 */
const SISTEMA = `Eres el asistente del municipio de Francisco de Orellana (El Coca, Ecuador).
Recibes la pregunta de un ciudadano y la ficha oficial que el buscador encontró.
Escribe UNA sola frase, en español de Ecuador, que le explique al ciudadano por qué
esa ficha responde a su pregunta.

Reglas estrictas:
- Una frase. Máximo 30 palabras.
- No inventes requisitos, costos, plazos, teléfonos ni artículos legales.
- No repitas la lista de requisitos: el ciudadano ya la tiene debajo.
- No cites cifras que no estén en la ficha.
- Si la ficha no responde bien a la pregunta, dilo en esa frase.
- Trata al ciudadano de "usted".`;

function indicacion(consulta: string, ficha: Ficha): string {
	const partes = [
		`Pregunta del ciudadano: ${consulta}`,
		``,
		`Ficha encontrada: ${ficha.titulo}`,
		ficha.entradilla ? `Descripción: ${ficha.entradilla.slice(0, 500)}` : '',
		...ficha.datos.map((d) => `${d.etiqueta}: ${d.valor}`),
		ficha.requisitos.length ? `Tiene ${ficha.requisitos.length} requisitos listados.` : ''
	];
	return partes.filter(Boolean).join('\n');
}

/**
 * Control numérico. Las alucinaciones peligrosas en un sitio municipal son
 * casi siempre cifras: un costo, un plazo, el número de una ordenanza. Si
 * el párrafo contiene un número que no aparece en la ficha, se descarta el
 * párrafo entero.
 *
 * Se ignoran los números de una sola cifra: "una sola vez", "los 3 pasos" y
 * similares son lenguaje, no datos, y bloquearlos dejaría fuera casi
 * cualquier frase natural.
 */
export function pasaControlNumerico(parrafo: string, ficha: Ficha): boolean {
	const enLaFicha = [
		ficha.titulo,
		ficha.entradilla,
		...ficha.datos.map((d) => `${d.etiqueta} ${d.valor}`),
		...ficha.requisitos,
		...ficha.pasos.map((p) => `${p.titulo} ${p.descripcion}`)
	]
		.join(' ')
		.replace(/[.,]/g, '');

	const cifras = parrafo.replace(/[.,](?=\d)/g, '').match(/\d{2,}/g) ?? [];
	return cifras.every((c) => enLaFicha.includes(c));
}

interface RespuestaOllama {
	message?: { content?: string };
}

/**
 * Pide el párrafo al modelo local. Devuelve `null` en cualquier situación
 * que no sea un éxito limpio: sin servicio, timeout, error HTTP, respuesta
 * vacía o párrafo que no pasa el control numérico. Nunca lanza.
 */
export async function redactar(consulta: string, ficha: Ficha): Promise<string | null> {
	if (!REDACTOR_ACTIVO) return null;

	try {
		const res = await fetch(`${URL_BASE}/api/chat`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				model: MODELO,
				stream: false,
				messages: [
					{ role: 'system', content: SISTEMA },
					{ role: 'user', content: indicacion(consulta, ficha) }
				],
				options: { temperature: 0.2, num_predict: MAX_TOKENS }
			}),
			signal: AbortSignal.timeout(TIMEOUT)
		});
		if (!res.ok) return null;

		const datos = (await res.json()) as RespuestaOllama;
		const texto = (datos.message?.content ?? '')
			// Los modelos con razonamiento (Qwen3 entre ellos) anteponen un
			// bloque <think> que no es parte de la respuesta.
			.replace(/<think>[\s\S]*?<\/think>/g, '')
			.trim();

		if (!texto || texto.length > 400) return null;
		if (!pasaControlNumerico(texto, ficha)) return null;
		return texto;
	} catch {
		// Timeout, servicio caído, JSON ilegible: todos acaban igual. El
		// ciudadano ve su ficha y no se entera de que había un modelo.
		return null;
	}
}
