import fs from "node:fs/promises";
import path from "node:path";
import { PATHS, ROOT } from "./config.ts";

/**
 * Reporte de cobertura de la extracción: cuántas URLs se visitaron, cuántos
 * recursos se generaron por sección, cuántos quedaron marcados para
 * revisión editorial y cuánta media se descargó. Pensado para pegar en un
 * correo o un ticket al equipo municipal, no solo para consola.
 */

async function contarArchivos(dir: string): Promise<number> {
  try {
    let total = 0;
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) total += await contarArchivos(path.join(dir, entry.name));
      else if (entry.name.endsWith(".json")) total += 1;
    }
    return total;
  } catch {
    return 0;
  }
}

async function main() {
  console.log("=== Reporte de cobertura — extracción GADMFO ===\n");

  try {
    const manifest = JSON.parse(await fs.readFile(path.join(PATHS.raw, "_manifest.json"), "utf8")) as Record<
      string,
      { status: number }
    >;
    const entradas = Object.values(manifest);
    const ok = entradas.filter((e) => e.status === 200).length;
    console.log(`Páginas HTML visitadas: ${entradas.length} (${ok} con HTTP 200)`);
  } catch {
    console.log("Páginas HTML visitadas: sin datos (corre una etapa primero)");
  }

  try {
    const media = JSON.parse(await fs.readFile(path.join(ROOT, "media/manifest.json"), "utf8")) as {
      data: Array<{ altPendiente: boolean; bytes: number }>;
    };
    const bytesTotal = media.data.reduce((s, m) => s + m.bytes, 0);
    const sinAlt = media.data.filter((m) => m.altPendiente).length;
    console.log(`Archivos de media: ${media.data.length} (${(bytesTotal / 1024 / 1024).toFixed(1)} MB) — ${sinAlt} con alt pendiente de redactar`);
  } catch {
    console.log("Archivos de media: sin datos");
  }

  try {
    const tramites = JSON.parse(await fs.readFile(path.join(PATHS.api, "tramites/index.json"), "utf8")) as {
      data: Array<{ requiere_revision_editorial: boolean }>;
      meta: { total: number; direcciones: number };
    };
    const pendientes = tramites.data.filter((t) => t.requiere_revision_editorial).length;
    console.log(`Trámites: ${tramites.meta.total} en ${tramites.meta.direcciones} direcciones — ${pendientes} pendientes de revisión editorial`);
  } catch {
    console.log("Trámites: sin datos");
  }

  try {
    const noticias = JSON.parse(await fs.readFile(path.join(PATHS.api, "noticias/index.json"), "utf8")) as {
      meta: { total: number; last_page: number };
    };
    console.log(`Noticias: ${noticias.meta.total} en ${noticias.meta.last_page} páginas`);
  } catch {
    console.log("Noticias: sin datos (corre --only=noticias)");
  }

  for (const seccion of ["institucional", "turismo", "transparencia"]) {
    const n = await contarArchivos(path.join(PATHS.api, seccion));
    console.log(`Recursos en ${seccion}/: ${n}`);
  }

  console.log("\nVer docs/deuda-heredada.md para los hallazgos del sitio original que requieren decisión municipal.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
