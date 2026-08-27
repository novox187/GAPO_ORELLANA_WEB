import fs from "node:fs/promises";
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { PATHS, ROOT } from "./config.ts";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const schemasDir = path.join(ROOT, "tools/scraper/schemas");

async function cargarSchema(nombre: string) {
  const raw = await fs.readFile(path.join(schemasDir, nombre), "utf8");
  return ajv.compile(JSON.parse(raw));
}

// institucional/direcciones.json se valida aparte (es una colección, no un
// único recurso) antes de llegar a estas reglas genéricas. Los demás
// archivos "índice" (listados, categorías, perfiles, marca) tampoco son un
// recurso individual del tipo que su carpeta sugiere, así que se excluyen
// explícitamente de esas reglas en vez de forzarlos a un schema que no les
// corresponde.
const RULES: Array<{ test: RegExp; schema: string }> = [
  { test: /^tramites\/(?!index|categorias|perfiles)[^/]+\.json$/, schema: "tramite.schema.json" },
  { test: /^noticias\/(?!index|page-).+\.json$/, schema: "noticia.schema.json" },
  { test: /^(institucional|turismo|transparencia)\/(?!marca).+\.json$/, schema: "pagina.schema.json" },
];

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith(".json")) yield full;
  }
}

async function main() {
  const validators = new Map<string, ReturnType<typeof ajv.compile>>();
  for (const nombre of ["tramite.schema.json", "noticia.schema.json", "pagina.schema.json", "direccion.schema.json"]) {
    validators.set(nombre, await cargarSchema(nombre));
  }

  let ok = 0;
  let fail = 0;
  const errores: string[] = [];
  const slugsVistos = new Map<string, string[]>();

  for await (const full of walk(PATHS.api)) {
    const rel = path.relative(PATHS.api, full).replace(/\\/g, "/");
    const raw = JSON.parse(await fs.readFile(full, "utf8"));

    if (rel === "institucional/direcciones.json") {
      const v = validators.get("direccion.schema.json")!;
      for (const item of raw.data ?? []) {
        if (!v(item)) {
          fail += 1;
          errores.push(`${rel} [${item.slug ?? "?"}]: ${ajv.errorsText(v.errors)}`);
        } else ok += 1;
      }
      continue;
    }

    const regla = RULES.find((r) => r.schema && r.test.test(rel));
    if (!regla) continue; // meta.json, contacto.json, índices de listado, search/* no llevan schema estricto
    const v = validators.get(regla.schema)!;
    if (!v(raw)) {
      fail += 1;
      errores.push(`${rel}: ${ajv.errorsText(v.errors)}`);
      continue;
    }
    ok += 1;

    const slug = raw.data?.slug as string | undefined;
    if (slug) {
      const grupo = rel.split("/")[0];
      const lista = slugsVistos.get(grupo) ?? [];
      lista.push(slug);
      slugsVistos.set(grupo, lista);
    }
  }

  for (const [grupo, slugs] of slugsVistos) {
    const dup = slugs.filter((s, i) => slugs.indexOf(s) !== i);
    if (dup.length) errores.push(`${grupo}: slugs duplicados -> ${[...new Set(dup)].join(", ")}`);
  }

  console.log(`Validación: ${ok} OK, ${fail} con error de schema, ${errores.length - fail} problemas de integridad.`);
  if (errores.length) {
    console.log("\nDetalle:");
    for (const e of errores) console.log(" -", e);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
