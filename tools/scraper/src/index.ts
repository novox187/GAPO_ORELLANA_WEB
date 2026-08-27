import fs from "node:fs/promises";
import path from "node:path";
import { NOTICIAS_PAGINAS, PATHS } from "./config.ts";
import { parseTramites, type Tramite } from "./parsers/tramites.ts";
import { parseNoticiasPagina, parseNoticiaDetalle, type NoticiaDetalle, type NoticiaResumen } from "./parsers/noticias.ts";
import { parseDirecciones } from "./parsers/direcciones.ts";
import { parsePaginaGenerica, type Pagina } from "./parsers/pagina.ts";
import { parseContacto } from "./parsers/contacto.ts";
import { parseMarca } from "./parsers/marca.ts";
import { construirIndiceBusqueda } from "./build-search.ts";
import { writeMediaManifest } from "./media.ts";

type Etapa = "institucional" | "tramites" | "noticias" | "turismo" | "transparencia" | "all";

const ARGV_ONLY = process.argv.find((a) => a.startsWith("--only="));
const ETAPA: Etapa = (ARGV_ONLY?.split("=")[1] as Etapa) ?? "all";

async function writeJson(rel: string, payload: unknown): Promise<void> {
  const full = path.join(PATHS.api, rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, JSON.stringify(payload, null, 2), "utf8");
}

// Rótulo tomado literalmente del menú de navegación del propio sitio —
// nunca un título inventado — para páginas que no traen encabezado propio.
const PAGINAS_INSTITUCIONAL: Array<[string, string, string]> = [
  ["/datos_canton/", "institucional/datos-canton", "Datos del cantón"],
  ["/historia_simbolos/", "institucional/historia-simbolos", "Historia y símbolos"],
  ["/alcaldia/", "institucional/alcaldia", "Alcaldía"],
  ["/concejo_m/", "institucional/concejo", "Concejo Municipal"],
  ["/empresas_adscritas/", "institucional/empresas-adscritas", "Empresas adscritas"],
];

const PAGINAS_TURISMO: Array<[string, string, string]> = [
  ["/lugares/", "turismo/lugares", "Lugares por visitar"],
  ["/rutas_t/", "turismo/rutas", "Rutas turísticas"],
  ["/coca_antiguo/", "turismo/coca-antiguo", "El Coca antiguo"],
  ["/coca_zoo/", "turismo/coca-zoo", "Coca Zoo"],
];

const PAGINAS_TRANSPARENCIA: Array<[string, string, string]> = [
  ["/lotaip/", "transparencia/lotaip", "LOTAIP"],
  ["/plan_anual_contratacion/", "transparencia/pac", "Plan Anual de Contratación (PAC)"],
  ["/rendicion_cuentas/", "transparencia/rendicion-cuentas", "Rendición de Cuentas"],
  ["/mecanismos_participacion/", "transparencia/mecanismos-participacion", "Mecanismos de Participación"],
  ["/calidad_agua/", "transparencia/calidad-agua", "Calidad de Agua"],
  ["/informe_publicidad/", "transparencia/publicidad", "Informe de Inversión en Publicidad"],
  ["/convocatoria_consejo/", "transparencia/convocatorias", "Convocatorias a Sesión de Concejo"],
  ["/documentos/", "transparencia/documentos", "Documentos"],
  ["/ordenanzas_resoluciones/", "transparencia/ordenanzas", "Ordenanzas y Resoluciones"],
];

async function correrPaginasGenericas(lista: Array<[string, string, string]>, seccion: string): Promise<Pagina[]> {
  const out: Pagina[] = [];
  for (const [ruta, salida, tituloMenu] of lista) {
    const slug = salida.split("/").pop()!;
    console.log(`  · ${ruta}`);
    const pagina = await parsePaginaGenerica(ruta, slug, seccion, tituloMenu);
    await writeJson(`${salida}.json`, { data: pagina });
    out.push(pagina);
  }
  return out;
}

async function main(): Promise<void> {
  console.log(`Extracción GADMFO — etapa: ${ETAPA}`);
  let tramites: Tramite[] = [];
  let noticias: NoticiaDetalle[] = [];
  let paginas: Pagina[] = [];

  if (ETAPA === "institucional" || ETAPA === "all") {
    console.log("Institucional…");
    paginas = paginas.concat(await correrPaginasGenericas(PAGINAS_INSTITUCIONAL, "institucional"));

    const direcciones = await parseDirecciones();
    await writeJson("institucional/direcciones.json", { data: direcciones, meta: { total: direcciones.length } });

    const contacto = await parseContacto();
    await writeJson("contacto.json", { data: contacto });

    const marca = await parseMarca();
    await writeJson("institucional/marca.json", { data: marca });
  }

  if (ETAPA === "turismo" || ETAPA === "all") {
    console.log("Turismo…");
    paginas = paginas.concat(await correrPaginasGenericas(PAGINAS_TURISMO, "turismo"));
  }

  if (ETAPA === "transparencia" || ETAPA === "all") {
    console.log("Transparencia…");
    paginas = paginas.concat(await correrPaginasGenericas(PAGINAS_TRANSPARENCIA, "transparencia"));
  }

  if (ETAPA === "tramites" || ETAPA === "all") {
    console.log("Trámites…");
    tramites = await parseTramites();
    const categorias = [...new Set(tramites.flatMap((t) => t.categorias))].sort();
    const perfiles = [...new Set(tramites.flatMap((t) => t.perfiles))].sort();
    const direccionesUnicas = [...new Map(tramites.map((t) => [t.direccion.slug, t.direccion])).values()];

    await writeJson("tramites/index.json", {
      data: tramites.map(({ id, slug, nombre, direccion, categorias: c, perfiles: p, resumen, requiere_revision_editorial }) => ({
        id, slug, nombre, direccion, categorias: c, perfiles: p, resumen, requiere_revision_editorial,
      })),
      meta: { total: tramites.length, direcciones: direccionesUnicas.length },
    });
    await writeJson("tramites/categorias.json", { data: categorias });
    await writeJson("tramites/perfiles.json", { data: perfiles });
    for (const t of tramites) await writeJson(`tramites/${t.slug}.json`, { data: t });

    const pendientes = tramites.filter((t) => t.requiere_revision_editorial).length;
    console.log(`  ${tramites.length} trámites en ${direccionesUnicas.length} direcciones (${pendientes} pendientes de revisión editorial)`);
  }

  if (ETAPA === "noticias" || ETAPA === "all") {
    console.log("Noticias…");
    let ultimaPagina = NOTICIAS_PAGINAS;
    const resumenes: NoticiaResumen[] = [];

    for (let pag = 1; pag <= ultimaPagina; pag += 1) {
      const { items, ultimaPagina: detectada } = await parseNoticiasPagina(pag);
      if (pag === 1) ultimaPagina = detectada;
      resumenes.push(...items);
      await writeJson(`noticias/page-${pag}.json`, {
        data: items,
        meta: { current_page: pag, last_page: ultimaPagina, per_page: items.length },
        links: {
          first: "/api/v1/noticias/page-1.json",
          last: `/api/v1/noticias/page-${ultimaPagina}.json`,
          prev: pag > 1 ? `/api/v1/noticias/page-${pag - 1}.json` : null,
          next: pag < ultimaPagina ? `/api/v1/noticias/page-${pag + 1}.json` : null,
        },
      });
      console.log(`  página ${pag}/${ultimaPagina} — ${items.length} noticias`);
    }

    for (const resumen of resumenes) {
      const detalle = await parseNoticiaDetalle(resumen);
      noticias.push(detalle);
      await writeJson(`noticias/${detalle.slug}.json`, { data: detalle });
    }

    await writeJson("noticias/index.json", {
      data: resumenes.map(({ id, slug, titulo, resumen, fecha, imagen, url }) => ({ id, slug, titulo, resumen, fecha, imagen, url })),
      meta: { total: resumenes.length, last_page: ultimaPagina },
    });
    console.log(`  ${noticias.length} noticias con detalle extraídas`);
  }

  if (ETAPA === "all") {
    console.log("Índice de búsqueda…");
    const stats = await construirIndiceBusqueda({ tramites, noticias, paginas });
    console.log(`  ${stats.documentos} documentos, ${stats.chunks} fragmentos`);
  }

  await writeMediaManifest();
  await writeJson("meta.json", {
    generado_en: new Date().toISOString(),
    etapa_ejecutada: ETAPA,
    fuente: "https://orellana.gob.ec",
    version: "1.0.0",
    conteos: {
      tramites: tramites.length,
      noticias: noticias.length,
      paginas_institucionales_turismo_transparencia: paginas.length,
    },
    nota: ETAPA === "all"
      ? "Extracción completa. El índice de búsqueda (search/index.json, search/chunks.json) refleja esta ejecución."
      : "Ejecución parcial (--only). Corre --only=all para regenerar el índice de búsqueda y este meta.json con el conjunto completo.",
  });

  console.log("Listo.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
