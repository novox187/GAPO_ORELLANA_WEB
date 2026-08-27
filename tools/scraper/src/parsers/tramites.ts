import type { AnyNode } from "domhandler";
import { SITE_ORIGIN } from "../config.ts";
import { fetchText } from "../fetcher.ts";
import { absoluteUrl, cleanText, extFromUrl, slugify, truncateSlug } from "../normalize.ts";
import { load, textoConSaltos, type CQ } from "./shared.ts";

export interface Requisito {
  orden: number;
  texto: string;
  documento_url: string | null;
  obligatorio: boolean;
}

export interface Paso {
  orden: number;
  titulo: string;
  descripcion: string;
}

export interface Formulario {
  nombre: string;
  url: string;
  tipo: string;
}

export interface SeccionAdicional {
  titulo: string;
  html: string;
}

export interface Tramite {
  id: number;
  slug: string;
  nombre: string;
  direccion: { id: number; slug: string; nombre: string };
  categorias: string[];
  perfiles: string[];
  resumen: string;
  que_es: string;
  para_que_sirve: string;
  quienes_acceden: string;
  costo: { tiene_costo: boolean | null; detalle: string };
  requisitos: Requisito[];
  pasos: Paso[];
  formularios: Formulario[];
  base_legal: string[];
  contenido_adicional: SeccionAdicional[];
  actualizado_en: string;
  fuente_url: string;
  requiere_revision_editorial: boolean;
}

const RE_QUE_ES = /^¿?qu[ée] es/i;
const RE_PARA_QUE = /^¿?para qu[ée]/i;
const RE_QUIENES = /^¿?qui[ée]n(es)?\s.*(acced|puede)/i;
const RE_COSTO = /^¿?(tiene alg[uú]n |qu[eé] )?valor|^costo|^tarifa/i;
const RE_REQUISITOS = /requisitos?/i;
const RE_PASOS = /paso a paso|procedimiento|c[oó]mo (obtener|solicitar|tramitar)/i;
const RE_LEGAL = /base legal|ordenanza|resoluci[oó]n/i;

const CATEGORIA_KEYWORDS: Array<[RegExp, string]> = [
  [/turis/i, "turismo"],
  [/agua|alcantarill/i, "agua-y-ambiente"],
  [/ambient/i, "agua-y-ambiente"],
  [/construcci[oó]n|planos|edificaci[oó]n|ordenamiento territorial|uso de suelo/i, "vivienda-y-construccion"],
  [/tr[aá]nsito|transporte|veh[ií]cul/i, "vehiculos-y-transporte"],
  [/patente|comercial|negocio|econ[oó]mic/i, "negocios"],
  [/certificad|documento|copia certificada/i, "documentos-y-certificados"],
  [/social|adulto mayor|discapacidad|familia/i, "familia-y-bienestar"],
];

function inferirCategorias(...textos: string[]): string[] {
  const joined = textos.join(" ");
  const found = new Set<string>();
  for (const [re, cat] of CATEGORIA_KEYWORDS) if (re.test(joined)) found.add(cat);
  if (found.size === 0) found.add("otros-tramites");
  return [...found];
}

function inferirPerfiles(...textos: string[]): string[] {
  const joined = textos.join(" ").toLowerCase();
  const perfiles = new Set<string>(["ciudadano"]);
  if (/emprendedor|negocio|comerci/.test(joined)) perfiles.add("emprendedor");
  if (/empresa|establecimiento/.test(joined)) perfiles.add("empresa");
  if (/transportista|veh[ií]cul|conductor/.test(joined)) perfiles.add("transportista");
  if (/constructor|edificaci[oó]n|arquitect|ingenier/.test(joined)) perfiles.add("constructor");
  if (/turis/.test(joined)) perfiles.add("turista");
  return [...perfiles];
}

/** Divide el HTML de un tab-pane en secciones delimitadas por `<p class="font-bold">`. */
function dividirEnSecciones($: CQ, pane: cheerio.Cheerio<AnyNode>) {
  const secciones: { titulo: string; nodos: AnyNode[] }[] = [];
  let actual: { titulo: string; nodos: AnyNode[] } | null = null;

  pane.children().each((_, node) => {
    const $node = $(node);
    const esEncabezado = node.type === "tag" && node.tagName === "p" && $node.hasClass("font-bold");
    if (esEncabezado) {
      actual = { titulo: cleanText($node.text()), nodos: [] };
      secciones.push(actual);
      return;
    }
    if (!actual) {
      actual = { titulo: "", nodos: [] };
      secciones.push(actual);
    }
    actual.nodos.push(node);
  });

  return secciones;
}

function extraerRequisitos($: CQ, nodos: AnyNode[]): Requisito[] {
  const requisitos: Requisito[] = [];
  let orden = 0;
  for (const nodo of nodos) {
    const $nodo = $(nodo);
    if (nodo.type === "tag" && (nodo.tagName === "ul" || nodo.tagName === "ol")) {
      $nodo.find("> li").each((_, li) => {
        const $li = $(li);
        const texto = cleanText($li.text());
        if (!texto) return;
        const doc = absoluteUrl($li.find("a").attr("href"), SITE_ORIGIN);
        orden += 1;
        requisitos.push({ orden, texto, documento_url: doc, obligatorio: true });
      });
    } else if (nodo.type === "tag" && nodo.tagName === "p") {
      // Algunos requisitos vienen como líneas separadas por <br> dentro de un <p>.
      const html = $nodo.html() ?? "";
      const lineas = html
        .split(/<br\s*\/?>/i)
        .map((l) => cleanText($.load(`<div>${l}</div>`)("div").text()))
        .filter(Boolean);
      for (const linea of lineas) {
        if (linea.length < 3) continue;
        orden += 1;
        requisitos.push({ orden, texto: linea, documento_url: null, obligatorio: true });
      }
    }
  }
  return requisitos;
}

function extraerFormularios($: CQ, pane: cheerio.Cheerio<AnyNode>): Formulario[] {
  const vistos = new Set<string>();
  const formularios: Formulario[] = [];
  pane.find("a[href]").each((_, a) => {
    const $a = $(a);
    const href = absoluteUrl($a.attr("href"), SITE_ORIGIN);
    if (!href || vistos.has(href)) return;
    const ext = extFromUrl(href);
    if (!["pdf", "doc", "docx", "xls", "xlsx"].includes(ext)) return;
    vistos.add(href);
    formularios.push({ nombre: cleanText($a.text()) || href.split("/").pop() || href, url: href, tipo: ext });
  });
  return formularios;
}

/**
 * Texto plano de una sección, sin las tablas anidadas (p. ej. tarifarios):
 * su contenido tabular no se lee bien como prosa y, cuando la sección tiene
 * su propio encabezado de costo, ya se captura aparte vía nodosAHtml.
 */
function nodosATextoPlano($: CQ, nodos: AnyNode[]): string {
  const wrapper = $("<div></div>");
  for (const n of nodos) wrapper.append($(n).clone());
  wrapper.find("table").remove();
  return textoConSaltos($, wrapper);
}

function nodosAHtml($: CQ, nodos: AnyNode[]): string {
  return nodos.map((n) => $.html(n)).join("\n").trim();
}

/**
 * Parsea /tramites_m/: 11 modales (uno por dirección), cada uno con una
 * lista de trámites en pestañas verticales. Cada trámite se divide en
 * secciones por encabezado `<p class="font-bold">`, que se clasifican por
 * palabra clave (qué es / para qué / quiénes / costo / requisitos / pasos /
 * base legal); lo que no calza en ninguna categoría se preserva en
 * `contenido_adicional` — nada del contenido original se descarta.
 */
export async function parseTramites(): Promise<Tramite[]> {
  const { html } = await fetchText("/tramites_m/");
  const $ = load(html);
  const tramites: Tramite[] = [];
  const fuenteUrl = new URL("/tramites_m/", SITE_ORIGIN).toString();

  $('.modal[id^="areaModal"]').each((dIdx, modalEl) => {
    const $modal = $(modalEl);
    const nombreDireccion = cleanText($modal.find(".modal-title").first().text());
    const direccionId = dIdx + 1;
    const direccionSlug = slugify(nombreDireccion);

    $modal.find('.nav-link[id^="tramite-tab-"]').each((_, tabEl) => {
      const $tab = $(tabEl);
      const targetSel = $tab.attr("data-bs-target");
      if (!targetSel) return;
      const pane = $modal.find(targetSel);
      if (!pane.length) return;

      // Algunos trámites de Agua Potable traen el nombre envuelto en
      // comillas en el propio botón del sitio origen (un hábito del
      // editor de esa dirección, no parte del nombre oficial del trámite).
      const nombreTramite = cleanText($tab.text()).replace(/^["“](.+)["”]$/, "$1");
      const tramiteId = Number(($tab.attr("id") ?? "").replace("tramite-tab-", "")) || tramites.length + 1;
      const secciones = dividirEnSecciones($, pane);

      let queEs = "";
      let paraQueSirve = "";
      let quienesAcceden = "";
      let costoDetalle = "";
      let tieneCosto: boolean | null = null;
      let requisitos: Requisito[] = [];
      const pasos: Paso[] = [];
      const baseLegal: string[] = [];
      const adicional: SeccionAdicional[] = [];
      let huboRequisitos = false;

      for (const sec of secciones) {
        const titulo = sec.titulo;
        const textoPlano = nodosATextoPlano($, sec.nodos);
        if (!titulo && !textoPlano) continue;

        if (RE_REQUISITOS.test(titulo)) {
          huboRequisitos = true;
          requisitos = requisitos.concat(extraerRequisitos($, sec.nodos));
        } else if (RE_QUE_ES.test(titulo)) {
          queEs = queEs ? `${queEs}\n${textoPlano}` : textoPlano;
        } else if (RE_PARA_QUE.test(titulo)) {
          paraQueSirve = paraQueSirve ? `${paraQueSirve}\n${textoPlano}` : textoPlano;
        } else if (RE_QUIENES.test(titulo)) {
          quienesAcceden = quienesAcceden ? `${quienesAcceden}\n${textoPlano}` : textoPlano;
        } else if (RE_COSTO.test(titulo)) {
          costoDetalle = costoDetalle ? `${costoDetalle}\n${textoPlano}` : textoPlano;
          if (/no tiene (costo|valor)|gratuit/i.test(textoPlano)) tieneCosto = false;
          else if (textoPlano) tieneCosto = true;
        } else if (RE_PASOS.test(titulo)) {
          const items = sec.nodos
            .flatMap((n) => (n.type === "tag" && (n.tagName === "ol" || n.tagName === "ul") ? $(n).find("> li").toArray() : []))
            .map((li) => cleanText($(li).text()))
            .filter(Boolean);
          items.forEach((texto, i) => pasos.push({ orden: i + 1, titulo: `Paso ${i + 1}`, descripcion: texto }));
          if (!items.length && textoPlano) pasos.push({ orden: 1, titulo, descripcion: textoPlano });
        } else if (RE_LEGAL.test(titulo) || RE_LEGAL.test(textoPlano)) {
          const match = textoPlano.match(/[A-ZÁÉÍÓÚ]{1,4}-\d{2,4}-\d{2,4}|Ordenanza[^.,;]*|Resoluci[oó]n[^.,;]*/gi);
          if (match) baseLegal.push(...match.map((m) => m.trim()));
          else if (titulo) adicional.push({ titulo, html: nodosAHtml($, sec.nodos) });
        } else if (titulo || textoPlano) {
          adicional.push({ titulo: titulo || "Información adicional", html: nodosAHtml($, sec.nodos) });
        }
      }

      const formularios = extraerFormularios($, pane);
      const resumen = (queEs || paraQueSirve || textoResumenDeAdicional(adicional)).slice(0, 220);

      tramites.push({
        id: tramiteId,
        // El id numérico va SIEMPRE al final, después de truncar el nombre:
        // slugify() por sí solo recorta la cadena completa a 100 caracteres,
        // y varios trámites tienen nombres largos casi idénticos (p. ej. las
        // dos fichas duplicadas de "renovar la licencia única anual..." en
        // Turismo) — si el id quedara dentro de esos 100 caracteres, ambos
        // truncarían al mismo slug y uno pisaría el archivo del otro.
        slug: `${truncateSlug(slugify(nombreTramite), 80)}-${tramiteId}`,
        nombre: nombreTramite,
        direccion: { id: direccionId, slug: direccionSlug, nombre: nombreDireccion },
        categorias: inferirCategorias(nombreTramite, nombreDireccion, queEs, paraQueSirve),
        perfiles: inferirPerfiles(nombreTramite, queEs, paraQueSirve, quienesAcceden),
        resumen: cleanText(resumen),
        que_es: cleanText(queEs),
        para_que_sirve: cleanText(paraQueSirve),
        quienes_acceden: cleanText(quienesAcceden),
        costo: { tiene_costo: tieneCosto, detalle: cleanText(costoDetalle) },
        requisitos,
        pasos,
        formularios,
        base_legal: [...new Set(baseLegal)],
        contenido_adicional: adicional,
        actualizado_en: new Date().toISOString().slice(0, 10),
        fuente_url: fuenteUrl,
        requiere_revision_editorial: !huboRequisitos && pasos.length === 0,
      });
    });
  });

  return tramites;
}

function textoResumenDeAdicional(adicional: SeccionAdicional[]): string {
  if (!adicional.length) return "";
  const $tmp = load(`<div>${adicional[0].html}</div>`);
  return textoConSaltos($tmp, $tmp("div"));
}
