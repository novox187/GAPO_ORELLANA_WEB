import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { SITE_ORIGIN } from "../config.ts";
import { absoluteUrl, cleanText, extFromUrl } from "../normalize.ts";
import { ingestMedia, type MediaEntry } from "../media.ts";

export type CQ = cheerio.CheerioAPI;

/** Revierte la ofuscación de correos de Cloudflare (data-cfemail="hex XOR"). */
function decodeCfEmail(hex: string): string | null {
  const bytes = hex.match(/../g)?.map((h) => parseInt(h, 16));
  if (!bytes || bytes.length < 2) return null;
  const key = bytes[0];
  return bytes
    .slice(1)
    .map((b) => String.fromCharCode(b ^ key))
    .join("");
}

/**
 * `.text()` de cheerio ignora `<br>` por completo — sin esto, "correo
 * electrónico X<br>2. Las copias..." se extrae como "correo electrónico
 * X2. Las copias...", con las dos líneas pegadas. Se usa en todo campo de
 * texto plano (resúmenes, "qué es", bloques de página) que pueda tener
 * saltos de línea en el HTML de origen; los lugares que sí necesitan el
 * `<br>` real (el HTML preservado en contenido_adicional, el separador de
 * líneas de extraerRequisitos) trabajan sobre el DOM original, no sobre
 * este clon.
 */
export function textoConSaltos($: CQ, el: cheerio.Cheerio<AnyNode>): string {
  const clon = el.clone();
  clon.find("br").replaceWith(" ");
  return cleanText(clon.text());
}

export function load(html: string): CQ {
  const $ = cheerio.load(html);
  // El sitio origen protege los correos con el email-obfuscation de
  // Cloudflare: sin su script de borde, quedarían como "[email protected]"
  // literal. Se decodifican aquí, una sola vez, para que todo el texto
  // extraído aguas abajo (requisitos, contenido adicional, contacto) ya
  // tenga el correo real.
  $("[data-cfemail]").each((_, el) => {
    const hex = $(el).attr("data-cfemail");
    const correo = hex ? decodeCfEmail(hex) : null;
    if (correo) $(el).replaceWith(correo);
  });
  return $;
}

const DOC_EXT = new Set(["pdf", "doc", "docx", "xls", "xlsx"]);
const IMG_EXT = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg"]);

export interface ItemLista {
  texto: string;
  /**
   * Destino del enlace cuando el ítem lo lleva. Buena parte de las páginas
   * de transparencia (LOTAIP sobre todo) son listas de enlaces: guardar
   * sólo el texto convertía la sección en un callejón sin salida.
   */
  url: string | null;
}

export interface BloqueContenido {
  tipo: "titulo" | "parrafo" | "lista" | "tabla" | "html";
  nivel?: number;
  texto?: string;
  items?: ItemLista[];
  filas?: string[][];
  html?: string;
}

export interface DocumentoEnlazado {
  nombre: string;
  url: string;
  tipo: string;
}

/**
 * Extrae de un contenedor arbitrario una secuencia de bloques de contenido
 * (títulos, párrafos, listas, tablas) preservando el orden original, más
 * los documentos descargables (PDF/DOC/XLS) que encuentre dentro.
 *
 * Es el extractor genérico usado por las páginas institucionales, de
 * turismo y de transparencia: su forma de presentación varía, pero todas
 * son "contenido de una sola columna", así que capturarlas como una
 * secuencia de bloques evita inventar una estructura semántica que la
 * fuente no tiene.
 */
export function extraerBloques($: CQ, container: cheerio.Cheerio<AnyNode>): {
  bloques: BloqueContenido[];
  documentos: DocumentoEnlazado[];
} {
  const bloques: BloqueContenido[] = [];
  const documentos: DocumentoEnlazado[] = [];
  const vistos = new Set<string>();

  container.find("h1,h2,h3,h4,h5,p,ul,ol,table,a").each((_, el) => {
    const $el = $(el);
    const tag = (el as { tagName?: string }).tagName?.toLowerCase();

    if (tag === "a") {
      const href = absoluteUrl($el.attr("href"), SITE_ORIGIN);
      if (!href || vistos.has(href)) return;
      const ext = extFromUrl(href);
      if (DOC_EXT.has(ext)) {
        vistos.add(href);
        documentos.push({ nombre: cleanText($el.text()) || href.split("/").pop() || href, url: href, tipo: ext });
      }
      return;
    }

    // Evita duplicar párrafos/listas que ya están dentro de una tabla capturada,
    // y evita capturar encabezados/párrafos anidados dentro de otro ya visitado.
    if ($el.parents("table").length && tag !== "table") return;

    if (/^h[1-5]$/.test(tag ?? "")) {
      const texto = textoConSaltos($, $el);
      if (texto) bloques.push({ tipo: "titulo", nivel: Number(tag![1]), texto });
      return;
    }
    if (tag === "p") {
      const texto = textoConSaltos($, $el);
      if (texto) bloques.push({ tipo: "parrafo", texto });
      return;
    }
    if (tag === "ul" || tag === "ol") {
      if ($el.parents("ul,ol").length) return; // solo listas de primer nivel
      const items = $el
        .find("> li")
        .toArray()
        .map((li) => {
          const $li = $(li);
          const texto = cleanText($li.text());
          // Primer enlace del ítem que no sea un documento descargable: esos
          // ya se recogen aparte en `documentos`.
          const href = $li
            .find("a[href]")
            .toArray()
            .map((a) => absoluteUrl($(a).attr("href"), SITE_ORIGIN))
            .find((u): u is string => Boolean(u) && !DOC_EXT.has(extFromUrl(u!)));
          return { texto, url: href ?? null };
        })
        .filter((i) => i.texto);
      if (items.length) bloques.push({ tipo: "lista", items });
      return;
    }
    if (tag === "table") {
      // OJO: cheerio.fn.map (estilo jQuery) aplana arreglos devueltos por el
      // callback, así que no sirve para producir un array de arrays — se usa
      // .toArray() + Array.prototype.map nativo en su lugar.
      const filas = $el
        .find("tr")
        .toArray()
        .map((tr) =>
          $(tr)
            .find("th,td")
            .toArray()
            .map((cell) => cleanText($(cell).text())),
        )
        .filter((fila) => fila.some(Boolean));
      if (filas.length) bloques.push({ tipo: "tabla", filas });
    }
  });

  return { bloques, documentos };
}

/** Recolecta y descarga todas las imágenes de contenido dentro de un contenedor. */
export async function extraerImagenes(
  $: CQ,
  container: cheerio.Cheerio<AnyNode>,
  seccion: string,
  fuenteUrl: string,
): Promise<MediaEntry[]> {
  const imgs = container
    .find("img")
    .map((_, el) => ({ src: $(el).attr("src"), alt: $(el).attr("alt") ?? "" }))
    .get()
    .filter((i) => i.src);

  const out: MediaEntry[] = [];
  for (const img of imgs) {
    const ext = extFromUrl(img.src!);
    if (!IMG_EXT.has(ext)) continue;
    const entry = await ingestMedia({ urlPath: img.src!, seccion, fuenteUrl, alt: img.alt });
    if (entry) out.push(entry);
  }
  return out;
}

export function bloquesATexto(bloques: BloqueContenido[]): string {
  return bloques
    .map((b) => {
      if (b.tipo === "parrafo" || b.tipo === "titulo") return b.texto ?? "";
      if (b.tipo === "lista") return (b.items ?? []).map((i) => i.texto).join(". ");
      if (b.tipo === "tabla") return (b.filas ?? []).map((f) => f.join(" | ")).join("\n");
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}
