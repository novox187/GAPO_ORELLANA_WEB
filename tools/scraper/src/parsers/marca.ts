import { ingestMedia, type MediaEntry } from "../media.ts";
import { SITE_ORIGIN } from "../config.ts";

/** Descarga los activos de marca conocidos: logotipos vectoriales y favicon. */
export async function parseMarca(): Promise<Record<string, MediaEntry | null>> {
  const fuenteUrl = new URL("/", SITE_ORIGIN).toString();
  const activos = {
    logo_header: "/static/img/header-main.svg",
    logo_blanco: "/static/img/logo-blanco.svg",
    favicon: "/static/img/favicon.ico",
  };

  const resultado: Record<string, MediaEntry | null> = {};
  for (const [clave, ruta] of Object.entries(activos)) {
    resultado[clave] = await ingestMedia({ urlPath: ruta, seccion: "marca", fuenteUrl, alt: `Logotipo GAD Municipal Francisco de Orellana (${clave})` });
  }
  return resultado;
}
