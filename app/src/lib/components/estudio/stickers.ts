/**
 * El catálogo de stickers, espejo de `ContenidoElemento::STICKERS` en el
 * backend.
 *
 * Está duplicado a propósito y no se resuelve por API: el compositor tiene
 * que poder ofrecer la lista antes de la primera petición, y son diez
 * cadenas. Lo que NO puede pasar es que diverjan — el backend rechaza
 * cualquier clave que no esté en la suya, así que un sticker de más aquí se
 * manifiesta como un error al publicar, no como un rótulo inventado en el
 * sitio. Al añadir uno, hay que añadirlo en los dos sitios.
 */
export const STICKERS: { clave: string; nombre: string }[] = [
	{ clave: 'atencion-hoy', nombre: 'Atención hoy' },
	{ clave: 'cerrado', nombre: 'Cerrado' },
	{ clave: 'obra-en-marcha', nombre: 'Obra en marcha' },
	{ clave: 'convocatoria-abierta', nombre: 'Convocatoria abierta' },
	{ clave: 'plazo-por-vencer', nombre: 'Plazo por vencer' },
	{ clave: 'gratuito', nombre: 'Gratuito' },
	{ clave: 'nuevo', nombre: 'Nuevo' },
	{ clave: 'ubicacion', nombre: 'Ubicación' },
	{ clave: 'fecha', nombre: 'Fecha' },
	{ clave: 'atencion-ciudadana', nombre: 'Atención ciudadana' }
];
