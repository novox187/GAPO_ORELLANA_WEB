/** Utilidades de normalización compartidas por todos los parsers. */

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

/**
 * Recorta un slug a `max` caracteres sin partir una palabra a la mitad: si
 * el corte cae dentro de un segmento, retrocede al último guion completo.
 * Un slug legible ("...-emprendedores") es mejor que uno que corta a mitad
 * de palabra ("...-emprendedores-loca") solo porque el título era largo.
 */
export function truncateSlug(slug: string, max: number): string {
  if (slug.length <= max) return slug;
  const cortado = slug.slice(0, max);
  const ultimoGuion = cortado.lastIndexOf("-");
  return ultimoGuion > 0 ? cortado.slice(0, ultimoGuion) : cortado;
}

/** Colapsa espacios y saltos de línea repetidos, recorta bordes. */
export function cleanText(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/ /g, " ").replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim();
}

const MESES: Record<string, string> = {
  enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06",
  julio: "07", agosto: "08", septiembre: "09", setiembre: "09", octubre: "10",
  noviembre: "11", diciembre: "12",
};

/**
 * Intenta convertir fechas en español ("26 de agosto de 2026",
 * "26/08/2026") a ISO-8601 (YYYY-MM-DD). Devuelve null si no reconoce el
 * formato — nunca inventa una fecha.
 */
export function parseFechaEs(input: string | null | undefined): string | null {
  if (!input) return null;
  const t = cleanText(input).toLowerCase();

  const largo = t.match(/(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/);
  if (largo) {
    const [, d, mesNombre, y] = largo;
    const mes = MESES[mesNombre];
    if (mes) return `${y}-${mes}-${d.padStart(2, "0")}`;
  }

  const corto = t.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (corto) {
    const [, d, m, y] = corto;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const iso = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];

  return null;
}

export function absoluteUrl(href: string | undefined | null, origin: string): string | null {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed || trimmed === "#") return null;
  try {
    return new URL(trimmed, origin).toString();
  } catch {
    return null;
  }
}

export function extFromUrl(url: string): string {
  const clean = url.split("?")[0].split("#")[0];
  const m = clean.match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : "";
}
