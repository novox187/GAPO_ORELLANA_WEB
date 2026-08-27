import { SITE_ORIGIN } from "../config.ts";
import { fetchText } from "../fetcher.ts";
import { load } from "./shared.ts";

export interface RedSocial {
  red: string;
  url: string;
}

export interface Contacto {
  redes_sociales: RedSocial[];
  mapa_embed_url: string | null;
  direccion_fisica: string | null;
  telefono: string | null;
  correo: string | null;
  nota: string;
  fuente_url: string;
}

const REDES: Array<[RegExp, string]> = [
  [/facebook\.com/, "facebook"],
  [/(twitter\.com|x\.com)/, "x"],
  [/instagram\.com/, "instagram"],
  [/tiktok\.com/, "tiktok"],
  [/youtube\.com/, "youtube"],
];

/**
 * /contactos/ solo trae un iframe de Google Maps, sin texto: no hay
 * dirección, teléfono ni correo publicados en esa página. En vez de
 * inventar esos datos, se documentan las redes sociales oficiales
 * (confirmadas en el pie de la portada) y se deja explícito que el resto
 * requiere que el municipio lo confirme.
 */
export async function parseContacto(): Promise<Contacto> {
  const [home, contactos] = await Promise.all([fetchText("/"), fetchText("/contactos/")]);
  const $home = load(home.html);
  const $contactos = load(contactos.html);

  const redesMap = new Map<string, string>();
  $home('a[href^="http"]').each((_, a) => {
    const href = $home(a).attr("href");
    if (!href) return;
    for (const [re, nombre] of REDES) {
      if (re.test(href) && !redesMap.has(nombre)) redesMap.set(nombre, href);
    }
  });

  const mapaSrc = $contactos("iframe").attr("src") ?? null;

  return {
    redes_sociales: [...redesMap.entries()].map(([red, url]) => ({ red, url })),
    mapa_embed_url: mapaSrc,
    direccion_fisica: null,
    telefono: null,
    // Único correo institucional confirmado en el sitio origen: aparece
    // (ofuscado con el email-protection de Cloudflare) en /tramites_m/,
    // en los pasos de "Certificación de Documentos" de Secretaría General
    // — no en /contactos/, que no publica ninguno. Se documenta la
    // procedencia exacta para que quede claro que no es un dato inventado.
    correo: "alcaldia@orellana.gob.ec",
    nota:
      "La página /contactos/ del sitio original no publica dirección, teléfono ni correo en texto — solo un mapa embebido. " +
      "El único correo institucional confirmado en todo el sitio (alcaldia@orellana.gob.ec) se encontró en /tramites_m/, " +
      "en el trámite de Certificación de Documentos de Secretaría General. Dirección física y teléfono deben ser " +
      "confirmados por la Dirección de Comunicación Social antes de publicarse en el sitio nuevo.",
    fuente_url: new URL("/contactos/", SITE_ORIGIN).toString(),
  };
}
