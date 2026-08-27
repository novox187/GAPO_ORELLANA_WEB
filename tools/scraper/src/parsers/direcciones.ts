import { SITE_ORIGIN } from "../config.ts";
import { fetchText } from "../fetcher.ts";
import { cleanText, slugify } from "../normalize.ts";
import { ingestMedia, type MediaEntry } from "../media.ts";
import { load } from "./shared.ts";

export interface EntradaDirectorio {
  cargo: string;
  extension: string;
}

export interface Direccion {
  id: number;
  slug: string;
  nombre: string;
  responsable: string | null;
  foto: MediaEntry | null;
  mision: string;
  directorio_telefonico: EntradaDirectorio[];
  fuente_url: string;
}

/**
 * Parsea /direcciones/: pestañas verticales, una por dirección municipal,
 * cada una con responsable, misión y un directorio telefónico en filas de
 * dos columnas (cargo / extensión).
 */
export async function parseDirecciones(): Promise<Direccion[]> {
  const { html } = await fetchText("/direcciones/");
  const $ = load(html);
  const fuenteUrl = new URL("/direcciones/", SITE_ORIGIN).toString();
  const direcciones: Direccion[] = [];

  const tabs = $('.nav-link-direcciones[id^="v-pills-direccion-"]');
  for (const tabEl of tabs.toArray()) {
    const $tab = $(tabEl);
    const targetSel = $tab.attr("data-bs-target");
    if (!targetSel) continue;
    const pane = $(targetSel);
    const nombre = cleanText($tab.text());
    const idMatch = ($tab.attr("id") ?? "").match(/\d+/);
    const id = idMatch ? Number(idMatch[0]) : direcciones.length + 1;

    const responsable = cleanText(pane.find("h3").first().text()) || null;
    const mision = cleanText(
      pane
        .find("h5")
        .filter((_, h) => /misi[oó]n/i.test($(h).text()))
        .first()
        .next("p")
        .text(),
    );

    let foto: MediaEntry | null = null;
    const imgSrc = pane.find("img").first().attr("src");
    if (imgSrc) {
      foto = await ingestMedia({ urlPath: imgSrc, seccion: "direcciones", fuenteUrl, alt: `${nombre} — responsable` });
    }

    const directorio: EntradaDirectorio[] = [];
    pane.find(".row").each((_, row) => {
      const $row = $(row);
      const cols = $row.find("> div");
      if (cols.length !== 2) return;
      const cargo = cleanText(cols.eq(0).text());
      const extension = cleanText(cols.eq(1).text());
      if (cargo && extension && /^\d{2,6}$/.test(extension.replace(/\s+/g, ""))) {
        directorio.push({ cargo, extension });
      }
    });

    direcciones.push({
      id,
      slug: slugify(nombre),
      nombre,
      responsable,
      foto,
      mision,
      directorio_telefonico: directorio,
      fuente_url: fuenteUrl,
    });
  }

  return direcciones;
}
