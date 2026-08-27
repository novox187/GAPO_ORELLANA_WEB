import { NOTICIAS_PAGINAS, SITE_ORIGIN } from "../config.ts";
import { fetchText } from "../fetcher.ts";
import { absoluteUrl, cleanText, slugify, truncateSlug } from "../normalize.ts";
import { ingestMedia, type MediaEntry } from "../media.ts";
import { load } from "./shared.ts";

export interface NoticiaResumen {
  id: number;
  slug: string;
  titulo: string;
  resumen: string;
  fecha: string | null;
  imagen: MediaEntry | null;
  url: string;
  fuente_url: string;
}

export interface NoticiaDetalle extends NoticiaResumen {
  cuerpo: string;
  imagenes: MediaEntry[];
}

/**
 * Django imprime las fechas en estilo AP, que abrevia unos meses y otros
 * no: "Feb. 27, 2026" pero "March 2, 2026". Hay que aceptar ambas formas —
 * leer sólo los nombres completos dejaba sin fecha a más de la mitad del
 * archivo de noticias.
 */
const MESES_EN: Record<string, string> = {
  january: "01", jan: "01",
  february: "02", feb: "02",
  march: "03", mar: "03",
  april: "04", apr: "04",
  may: "05",
  june: "06", jun: "06",
  july: "07", jul: "07",
  august: "08", aug: "08",
  september: "09", sept: "09", sep: "09",
  october: "10", oct: "10",
  november: "11", nov: "11",
  december: "12", dec: "12",
};

function parseFechaEnInglés(texto: string): string | null {
  // El punto de la abreviatura es opcional: "Feb. 27" y "March 2" por igual.
  const m = cleanText(texto)
    .toLowerCase()
    .match(/([a-z]+)\.?\s+(\d{1,2}),\s+(\d{4})/);
  if (!m) return null;
  const mes = MESES_EN[m[1]];
  if (!mes) return null;
  return `${m[3]}-${mes}-${m[2].padStart(2, "0")}`;
}

function idFromHref(href: string | undefined): number | null {
  const m = (href ?? "").match(/\/noticia\/(\d+)\//);
  return m ? Number(m[1]) : null;
}

/** Parsea una página de listado (/noticias/?page=N) y devuelve sus tarjetas. */
export async function parseNoticiasPagina(pagina: number): Promise<{
  items: NoticiaResumen[];
  ultimaPagina: number;
}> {
  const { html } = await fetchText(pagina === 1 ? "/noticias/" : `/noticias/?page=${pagina}`);
  const $ = load(html);
  const fuenteUrl = new URL(pagina === 1 ? "/noticias/" : `/noticias/?page=${pagina}`, SITE_ORIGIN).toString();

  const items: NoticiaResumen[] = [];
  const cards = $(".card-h");
  for (const el of cards.toArray()) {
    const $card = $(el);
    const href = $card.find('a[href^="/noticia/"]').attr("href");
    const id = idFromHref(href);
    if (!id) continue;
    const titulo = cleanText($card.find(".card-title").text());
    const resumen = cleanText($card.find(".card-text").text());
    const fechaTexto = $card.find(".card-footer").text();
    const imgSrc = $card.find("img.card-img").attr("src");
    const imgAlt = $card.find("img.card-img").attr("alt") ?? "";

    const imagen = imgSrc ? await ingestMedia({ urlPath: imgSrc, seccion: "noticias", fuenteUrl, alt: imgAlt }) : null;

    items.push({
      id,
      // El id va después de truncar el título (ver el mismo fix en
      // tramites.ts): varios titulares superan los 100 caracteres y
      // truncarían el id, causando que dos noticias distintas produzcan el
      // mismo slug y una pise el archivo de la otra.
      slug: `${truncateSlug(slugify(titulo), 80)}-${id}`,
      titulo,
      resumen,
      fecha: parseFechaEnInglés(fechaTexto),
      imagen,
      // La ruta de detalle en el sitio origen es singular ("/noticia/{id}/"),
      // a diferencia del listado ("/noticias/") — usar el plural aquí hacía
      // que cada ficha de detalle se pidiera a una URL que da 404.
      url: `/noticia/${id}/`,
      fuente_url: fuenteUrl,
    });
  }

  // El paginador de Django no muestra números de página como texto en los
  // extremos (usa "siguiente" / "último »"): el número real va en el href
  // ("?page=32"), así que se extrae de ahí en vez del texto del enlace.
  let ultimaPagina = pagina;
  $(".pagination a[href*='page=']").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const m = href.match(/page=(\d+)/);
    if (m) ultimaPagina = Math.max(ultimaPagina, Number(m[1]));
  });

  return { items, ultimaPagina: ultimaPagina || NOTICIAS_PAGINAS };
}

export async function parseNoticiaDetalle(resumen: NoticiaResumen): Promise<NoticiaDetalle> {
  const { html } = await fetchText(resumen.url);
  const $ = load(html);
  const col = $(".col-sm-8").first();

  const titulo = cleanText(col.find("h2").first().text()) || resumen.titulo;
  const cuerpo = cleanText(
    col
      .find("p")
      .filter((_, p) => !$(p).find("small").length && cleanText($(p).text()).length > 0)
      .map((_, p) => $(p).text())
      .get()
      .join("\n\n"),
  );
  const fechaTexto = col.find("p small").text();
  const fecha = parseFechaEnInglés(fechaTexto) ?? resumen.fecha;

  const imagenes: MediaEntry[] = [];
  for (const el of col.find("img").toArray()) {
    const $img = $(el);
    const src = $img.attr("src");
    if (!src) continue;
    const entry = await ingestMedia({
      urlPath: src,
      seccion: "noticias",
      fuenteUrl: resumen.url,
      alt: $img.attr("alt") ?? titulo,
    });
    if (entry) imagenes.push(entry);
  }

  return {
    ...resumen,
    titulo,
    fecha,
    cuerpo,
    imagenes,
    imagen: imagenes[0] ?? resumen.imagen,
    fuente_url: absoluteUrl(resumen.url, SITE_ORIGIN) ?? resumen.fuente_url,
  };
}
