import { SITE_ORIGIN } from "../config.ts";
import { fetchText } from "../fetcher.ts";
import { cleanText } from "../normalize.ts";
import type { MediaEntry } from "../media.ts";
import { bloquesATexto, extraerBloques, extraerImagenes, load, type BloqueContenido, type DocumentoEnlazado } from "./shared.ts";

export interface Pagina {
  slug: string;
  seccion: string;
  titulo: string;
  bloques: BloqueContenido[];
  texto: string;
  imagenes: MediaEntry[];
  documentos: DocumentoEnlazado[];
  fuente_url: string;
}

/**
 * Extractor genérico de "página institucional de una columna": remueve el
 * cascarón compartido (logo, nav, footer, scripts, modales de terceros) y
 * captura el resto del `<body>` como una secuencia ordenada de bloques,
 * imágenes y documentos descargables. Usado por las secciones institucional,
 * turismo y transparencia, cuya maquetación varía pero cuya forma —
 * contenido de una sola columna, sin interactividad propia— es la misma.
 */
export async function parsePaginaGenerica(
  rutaPath: string,
  slug: string,
  seccion: string,
  tituloMenu?: string,
): Promise<Pagina> {
  const { html } = await fetchText(rutaPath);
  const $ = load(html);
  const fuenteUrl = new URL(rutaPath, SITE_ORIGIN).toString();

  const body = $("body").clone();
  body.find("nav, footer, script, style, .modal, div.container-fluid.w-75").remove();

  // Varias páginas (concejo, direcciones, listados de transparencia) no
  // traen un encabezado propio: van directo a pestañas o tablas. En esos
  // casos se usa el rótulo del menú de navegación del propio sitio — nunca
  // un título inventado — antes de caer al primer encabezado que aparezca.
  const titulo =
    tituloMenu || cleanText(body.find("h1,h2,h3").first().text()) || cleanText($("title").text()) || slug;

  const { bloques, documentos } = extraerBloques($, body);
  const imagenes = await extraerImagenes($, body, seccion, fuenteUrl);

  return {
    slug,
    seccion,
    titulo,
    bloques,
    texto: bloquesATexto(bloques),
    imagenes,
    documentos,
    fuente_url: fuenteUrl,
  };
}
