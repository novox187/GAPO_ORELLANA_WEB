import { setTimeout as sleep } from "node:timers/promises";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  MAX_RETRIES,
  MIN_DELAY_MS,
  PATHS,
  SITE_ORIGIN,
  TIMEOUT_BINARIO_MS,
  TIMEOUT_HTML_MS,
  USER_AGENT,
} from "./config.ts";

/**
 * Cliente HTTP de un solo carril (1 req/s aprox.) con caché en disco y
 * reintentos con backoff exponencial. Cada URL visitada se guarda una sola
 * vez bajo data/raw/ — volver a parsear no vuelve a golpear el servidor.
 */

interface ManifestEntry {
  url: string;
  cachePath: string;
  status: number;
  bytes: number;
  sha256: string;
  fetchedAt: string;
}

type Manifest = Record<string, ManifestEntry>;

const manifestPath = path.join(PATHS.raw, "_manifest.json");
let manifest: Manifest | null = null;
let lastRequestAt = 0;
let queue: Promise<unknown> = Promise.resolve();

async function loadManifest(): Promise<Manifest> {
  if (manifest) return manifest;
  try {
    const raw = await fs.readFile(manifestPath, "utf8");
    manifest = JSON.parse(raw) as Manifest;
  } catch {
    manifest = {};
  }
  return manifest;
}

async function saveManifest(): Promise<void> {
  if (!manifest) return;
  await fs.mkdir(PATHS.raw, { recursive: true });
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
}

function cacheFileFor(url: string): string {
  const u = new URL(url, SITE_ORIGIN);
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 16);
  const safeName = u.pathname.replace(/\W+/g, "_").slice(0, 80) || "root";
  return path.join(PATHS.raw, `${safeName}__${hash}.html`);
}

async function throttle(): Promise<void> {
  const wait = lastRequestAt + MIN_DELAY_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

/**
 * Pide `url` y consume el cuerpo con `consume`, reintentando la operación
 * COMPLETA (cabeceras + cuerpo) ante cualquier fallo — incluido un abort por
 * timeout a mitad de descarga. Es clave que el timeout cubra también la
 * lectura del cuerpo: `AbortSignal.timeout()` sigue activo durante
 * `consume(res)`, así que una conexión que se cuelga descargando una imagen
 * de varios MB se aborta y reintenta en vez de colgar el proceso para
 * siempre (los reintentos originales solo cubrían errores de red al pedir
 * cabeceras y códigos 429/5xx, no un socket que nunca cierra ni falla).
 */
async function doFetch<T>(
  url: string,
  timeoutMs: number,
  consume: (res: Response) => Promise<T>,
): Promise<{ result: T | null; status: number }> {
  let attempt = 0;
  for (;;) {
    attempt += 1;
    await throttle();
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status === 429 || res.status >= 500) {
        if (attempt > MAX_RETRIES) return { result: null, status: res.status };
        const retryAfter = Number(res.headers.get("retry-after")) || 0;
        await sleep(Math.max(retryAfter * 1000, 500 * 2 ** attempt));
        continue;
      }
      const result = await consume(res);
      return { result, status: res.status };
    } catch (err) {
      if (attempt > MAX_RETRIES) throw err;
      await sleep(500 * 2 ** attempt);
    }
  }
}

/**
 * Descarga (o reutiliza de caché) el HTML de una URL del sitio origen.
 * Serializa todas las solicitudes en una cola FIFO para respetar el rate limit
 * global sin importar cuántas llamadas concurrentes se disparen.
 */
export async function fetchText(
  urlPath: string,
  opts: { force?: boolean } = {},
): Promise<{ html: string; status: number; fromCache: boolean }> {
  const run = async () => {
    const url = new URL(urlPath, SITE_ORIGIN).toString();
    const m = await loadManifest();
    const cachePath = cacheFileFor(url);

    if (!opts.force && m[url]) {
      try {
        const html = await fs.readFile(cachePath, "utf8");
        return { html, status: m[url].status, fromCache: true };
      } catch {
        // caché rota: re-descarga
      }
    }

    const { result: html, status } = await doFetch(url, TIMEOUT_HTML_MS, (res) => res.text());
    if (html === null) return { html: "", status, fromCache: false };

    await fs.mkdir(PATHS.raw, { recursive: true });
    await fs.writeFile(cachePath, html, "utf8");

    m[url] = {
      url,
      cachePath: path.relative(PATHS.raw, cachePath),
      status,
      bytes: Buffer.byteLength(html),
      sha256: createHash("sha256").update(html).digest("hex"),
      fetchedAt: new Date().toISOString(),
    };
    await saveManifest();

    return { html, status, fromCache: false };
  };

  // Encadena en la cola global para no romper el throttle.
  const result = queue.then(run, run);
  queue = result.catch(() => undefined);
  return result;
}

/** Descarga un binario (imagen, PDF) respetando el mismo rate limit. */
export async function fetchBinary(
  urlPath: string,
): Promise<{ buffer: Buffer; status: number; contentType: string | null }> {
  const run = async () => {
    const url = new URL(urlPath, SITE_ORIGIN).toString();
    let contentType: string | null = null;
    const { result: buffer, status } = await doFetch(url, TIMEOUT_BINARIO_MS, async (res) => {
      contentType = res.headers.get("content-type");
      return Buffer.from(await res.arrayBuffer());
    });
    return { buffer: buffer ?? Buffer.alloc(0), status, contentType };
  };
  const result = queue.then(run, run);
  queue = result.catch(() => undefined);
  return result;
}
