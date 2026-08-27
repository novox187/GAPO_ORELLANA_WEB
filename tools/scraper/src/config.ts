import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "../../..");

export const SITE_ORIGIN = "https://orellana.gob.ec";

export const PATHS = {
  raw: path.join(ROOT, "data/raw"),
  api: path.join(ROOT, "data/api/v1"),
  mediaOriginals: path.join(ROOT, "media/originales"),
  mediaDerived: path.join(ROOT, "media/derivados"),
};

export const USER_AGENT = "GADMFO-Migracion/1.0 (+contacto@orellana.gob.ec)";

/** Máximo de conexiones concurrentes hacia el sitio origen. */
export const MAX_CONCURRENCY = 2;
/** Espaciado mínimo entre solicitudes, en milisegundos (~1 req/s). */
export const MIN_DELAY_MS = 1000;
/** Reintentos ante 429/5xx antes de marcar el recurso como fallido. */
export const MAX_RETRIES = 4;

/** Timeout de una solicitud de HTML (cabeceras + cuerpo completo). */
export const TIMEOUT_HTML_MS = 20_000;
/** Timeout de una descarga binaria (imagen/PDF) — más alto por el peso de las fotos. */
export const TIMEOUT_BINARIO_MS = 60_000;

export const NOTICIAS_PAGINAS = 32;
