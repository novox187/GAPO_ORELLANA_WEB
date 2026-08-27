import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { fetchBinary } from "./fetcher.ts";
import { PATHS, ROOT, SITE_ORIGIN } from "./config.ts";
import { extFromUrl } from "./normalize.ts";

export interface MediaEntry {
  id: string;
  hash: string;
  urlOriginal: string;
  rutaOriginal: string;
  rutaDerivados: Record<string, string>;
  ancho: number | null;
  alto: number | null;
  bytes: number;
  alt: string;
  altPendiente: boolean;
  seccion: string;
  fuenteUrl: string;
}

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const DERIVED_WIDTHS = [400, 800, 1600];

const byHash = new Map<string, MediaEntry>();
const byUrl = new Map<string, MediaEntry>();
let cachePrecargada = false;

/**
 * Carga, una sola vez por proceso, el manifiesto de media ya escrito por una
 * ejecución anterior. Igual que el caché de HTML en fetcher.ts, esto evita
 * volver a descargar binarios ya obtenidos cuando se reanuda o repite una
 * etapa — la descarga de ~290 noticias con foto sería impracticable sin esto.
 */
async function precargarCache(): Promise<void> {
  if (cachePrecargada) return;
  cachePrecargada = true;
  try {
    const raw = JSON.parse(await fs.readFile(path.join(ROOT, "media", "manifest.json"), "utf8")) as {
      data: MediaEntry[];
    };
    for (const entry of raw.data ?? []) {
      const originalPath = path.join(ROOT, entry.rutaOriginal.replace(/^\//, ""));
      try {
        await fs.access(originalPath);
      } catch {
        continue; // el archivo ya no existe en disco: se re-descargará
      }
      byHash.set(entry.hash, entry);
      byUrl.set(entry.urlOriginal, entry);
    }
  } catch {
    // primera ejecución: no hay manifiesto previo todavía
  }
}

function altEsUtil(alt: string): boolean {
  const a = alt.trim().toLowerCase();
  return a.length > 3 && !["logo", "imagen", "image", "img"].includes(a);
}

/**
 * Descarga un recurso de media (o lo recupera de caché, en memoria o en
 * disco de una ejecución previa, si ya se procesó la misma URL o el mismo
 * SHA-256), genera derivados WebP para imágenes rasterizadas y devuelve la
 * entrada de manifiesto correspondiente.
 */
export async function ingestMedia(params: {
  urlPath: string;
  seccion: string;
  fuenteUrl: string;
  alt?: string;
}): Promise<MediaEntry | null> {
  await precargarCache();
  const { urlPath, seccion, fuenteUrl } = params;
  const alt = params.alt?.trim() ?? "";
  const absoluteUrl = new URL(urlPath, SITE_ORIGIN).toString();
  const ext = extFromUrl(absoluteUrl);
  if (!ext) return null;

  const cacheada = byUrl.get(absoluteUrl);
  if (cacheada) return cacheada;

  const { buffer, status } = await fetchBinary(absoluteUrl);
  if (status !== 200 || buffer.length === 0) return null;

  const hash = createHash("sha256").update(buffer).digest("hex");
  const existing = byHash.get(hash);
  if (existing) {
    byUrl.set(absoluteUrl, existing);
    return existing;
  }

  const id = hash.slice(0, 16);
  const originalName = `${id}.${ext}`;
  const originalPath = path.join(PATHS.mediaOriginals, originalName);
  await fs.mkdir(PATHS.mediaOriginals, { recursive: true });
  await fs.writeFile(originalPath, buffer);

  let ancho: number | null = null;
  let alto: number | null = null;
  const rutaDerivados: Record<string, string> = {};

  const esRaster = IMAGE_EXT.has(ext) && ext !== "gif";
  if (esRaster) {
    try {
      const img = sharp(buffer);
      const info = await img.metadata();
      ancho = info.width ?? null;
      alto = info.height ?? null;

      await fs.mkdir(PATHS.mediaDerived, { recursive: true });
      for (const w of DERIVED_WIDTHS) {
        if (info.width && info.width < w) continue;
        const derivedName = `${id}-${w}.webp`;
        const derivedPath = path.join(PATHS.mediaDerived, derivedName);
        await sharp(buffer).resize({ width: w }).webp({ quality: 82 }).toFile(derivedPath);
        rutaDerivados[`${w}w`] = `/media/derivados/${derivedName}`;
      }
    } catch {
      // Archivo no decodificable como imagen (p. ej. SVG con extensión rara):
      // se conserva el original, sin derivados.
    }
  }

  const entry: MediaEntry = {
    id,
    hash,
    urlOriginal: absoluteUrl,
    rutaOriginal: `/media/originales/${originalName}`,
    rutaDerivados,
    ancho,
    alto,
    bytes: buffer.length,
    alt,
    altPendiente: !altEsUtil(alt),
    seccion,
    fuenteUrl,
  };
  byHash.set(hash, entry);
  byUrl.set(absoluteUrl, entry);
  return entry;
}

export function mediaManifest(): MediaEntry[] {
  return [...byHash.values()];
}

export async function writeMediaManifest(): Promise<void> {
  const resolved = path.join(ROOT, "media", "manifest.json");
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(
    resolved,
    JSON.stringify({ generado_en: new Date().toISOString(), total: byHash.size, data: mediaManifest() }, null, 2),
    "utf8",
  );
}
