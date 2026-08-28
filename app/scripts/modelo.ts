/**
 * El modelo de embeddings, en un módulo aparte para que el script que lo
 * descarga (`descargar-modelo.ts`) y el que construye el corpus
 * (`construir-corpus.ts`) no puedan discrepar. En el Dockerfile la descarga
 * es una capa propia, anterior a copiar el código fuente: así cambiar una
 * línea de la aplicación no vuelve a bajar 135 MB de pesos.
 */

/**
 * `intfloat/multilingual-e5-small` es el original en PyTorch y no publica
 * los pesos ONNX cuantizados que transformers.js necesita; `Xenova/…` es la
 * conversión a JavaScript del mismo modelo.
 *
 * 118 M parámetros, 384 dimensiones, ~118 MB el grafo cuantizado más 17 MB
 * el tokenizador. Corre en CPU en unos 4 ms por consulta — medido en el
 * portátil de desarrollo; en el VPS conviene volver a medirlo.
 */
export const MODELO = 'Xenova/multilingual-e5-small';
export const DIMENSIONES = 384;

/**
 * Cuantización de 8 bits. La alternativa (`fp32`) son 4 veces más bytes en
 * la imagen para una diferencia de calidad que este corpus no nota.
 */
export const PRECISION = 'q8' as const;
