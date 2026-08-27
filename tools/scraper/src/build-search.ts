import fs from "node:fs/promises";
import path from "node:path";
import { PATHS } from "./config.ts";
import type { Tramite } from "./parsers/tramites.ts";
import type { NoticiaDetalle } from "./parsers/noticias.ts";
import type { Pagina } from "./parsers/pagina.ts";

export interface DocumentoIndice {
  id: string;
  tipo: string;
  titulo: string;
  texto: string;
  url: string;
}

export interface Chunk {
  id: string;
  tipo: string;
  titulo: string;
  url: string;
  seccion: string;
  texto: string;
  tokens: number;
  perfiles: string[];
  embedding: null;
}

const CHUNK_MAX_CHARS = 700;

function trocear(texto: string, max = CHUNK_MAX_CHARS): string[] {
  if (texto.length <= max) return texto ? [texto] : [];
  const partes: string[] = [];
  const parrafos = texto.split(/\n{2,}/);
  let actual = "";
  for (const p of parrafos) {
    if ((actual + "\n\n" + p).length > max && actual) {
      partes.push(actual.trim());
      actual = p;
    } else {
      actual = actual ? `${actual}\n\n${p}` : p;
    }
  }
  if (actual.trim()) partes.push(actual.trim());
  return partes;
}

/**
 * Construye dos artefactos a partir del contenido ya extraído:
 *  - search/index.json: documentos completos para búsqueda léxica (MiniSearch
 *    en el cliente, sin backend).
 *  - search/chunks.json: el mismo contenido troceado en párrafos, listo para
 *    generar embeddings en la fase 3. `embedding` queda en null a propósito
 *    — nada de vectores simulados o inventados aquí.
 */
export async function construirIndiceBusqueda(params: {
  tramites: Tramite[];
  noticias: NoticiaDetalle[];
  paginas: Pagina[];
}): Promise<{ documentos: number; chunks: number }> {
  const documentos: DocumentoIndice[] = [];
  const chunks: Chunk[] = [];

  for (const t of params.tramites) {
    const url = `/tramites/${t.slug}`;
    const texto = [t.resumen, t.que_es, t.para_que_sirve, t.quienes_acceden, t.costo.detalle, t.requisitos.map((r) => r.texto).join(". ")]
      .filter(Boolean)
      .join("\n\n");
    documentos.push({ id: `tramite:${t.slug}`, tipo: "tramite", titulo: t.nombre, texto, url });

    const secciones: Array<[string, string]> = [
      ["resumen", t.resumen],
      ["que_es", t.que_es],
      ["para_que_sirve", t.para_que_sirve],
      ["quienes_acceden", t.quienes_acceden],
      ["costo", t.costo.detalle],
      ["requisitos", t.requisitos.map((r) => r.texto).join("\n")],
      ["pasos", t.pasos.map((p) => `${p.titulo}: ${p.descripcion}`).join("\n")],
    ];
    for (const [seccion, contenido] of secciones) {
      for (const [i, trozo] of trocear(contenido).entries()) {
        chunks.push({
          id: `tramite:${t.slug}#${seccion}${i ? `-${i}` : ""}`,
          tipo: "tramite",
          titulo: `${t.nombre} — ${seccion}`,
          url,
          seccion,
          texto: trozo,
          tokens: Math.ceil(trozo.length / 4),
          perfiles: t.perfiles,
          embedding: null,
        });
      }
    }
  }

  for (const n of params.noticias) {
    const url = `/noticias/${n.slug}`;
    documentos.push({ id: `noticia:${n.slug}`, tipo: "noticia", titulo: n.titulo, texto: n.cuerpo, url });
    for (const [i, trozo] of trocear(n.cuerpo).entries()) {
      chunks.push({
        id: `noticia:${n.slug}#cuerpo${i ? `-${i}` : ""}`,
        tipo: "noticia",
        titulo: n.titulo,
        url,
        seccion: "cuerpo",
        texto: trozo,
        tokens: Math.ceil(trozo.length / 4),
        perfiles: [],
        embedding: null,
      });
    }
  }

  for (const p of params.paginas) {
    const url = `/${p.seccion}/${p.slug}`;
    documentos.push({ id: `pagina:${p.slug}`, tipo: "pagina", titulo: p.titulo, texto: p.texto, url });
    for (const [i, trozo] of trocear(p.texto).entries()) {
      chunks.push({
        id: `pagina:${p.slug}#contenido${i ? `-${i}` : ""}`,
        tipo: "pagina",
        titulo: p.titulo,
        url,
        seccion: "contenido",
        texto: trozo,
        tokens: Math.ceil(trozo.length / 4),
        perfiles: [],
        embedding: null,
      });
    }
  }

  const dir = path.join(PATHS.api, "search");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "index.json"), JSON.stringify({ data: documentos, meta: { total: documentos.length } }, null, 2), "utf8");
  await fs.writeFile(path.join(dir, "chunks.json"), JSON.stringify({ data: chunks, meta: { total: chunks.length, modelo_embedding_sugerido: "multilingual-e5-small" } }, null, 2), "utf8");

  return { documentos: documentos.length, chunks: chunks.length };
}
