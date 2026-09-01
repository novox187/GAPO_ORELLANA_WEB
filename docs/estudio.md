# El estudio del creador

Documento de decisiones, no manual de uso. Lo que está aquí es lo que no se
deduce leyendo el código.

`/estudio` es la interfaz con la que la Alcaldía y las direcciones publican en
el módulo social: perfil, compositor de publicaciones e historias, y
estadísticas. Convive con el panel Livewire de la API, que sigue existiendo y
sigue siendo el sitio donde se administra el contenido heredado, los trámites,
las páginas y los ajustes.

## Por qué dos interfaces para publicar

Porque son dos encargos distintos, y ya lo eran antes de que existiera esto:

| | Panel (Livewire) | Estudio (SvelteKit) |
|---|---|---|
| Qué encarga | administrar el contenido del sitio | publicar en nombre de una cuenta |
| Cómo se entra | sesión del mismo dominio | token Bearer desde otro origen |
| Qué se ve primero | el trabajo pendiente | el perfil, como lo ve el vecino |
| Cuándo se usa | cuando hay que corregir algo | cuando hay algo que contar |

Lo que **no** se ha duplicado son las reglas. El slug de una publicación, la
fecha de publicación que no se mueve al reeditar, las duraciones permitidas de
una historia y el tope diario por cuenta viven en
`App\Services\RedactorPublicaciones` y `App\Services\RedactorHistorias`, y los
usan las dos puertas. Es el mismo argumento que sostiene `ArmadorFragmentos`:
dos implementaciones de la misma regla acaban divergiendo, y aquí divergir
significaría que una publicación tiene una URL distinta según por dónde se
guardó.

## Las tres decisiones de fondo

### 1. No se enseña ningún número que no se esté midiendo

El módulo de estadísticas es la mitad de este trabajo, y antes de escribir un
solo gráfico hubo que construir la medición: hasta ahora los únicos números
reales del módulo social eran los contadores de reacciones y comentarios.
Alcance, impresiones, reproducciones y compartidos no estaban «pendientes de
graficar» — es que nadie los contaba.

De ahí salen tres comportamientos que parecen detalles y no lo son:

- **`null` no es `0`.** La tasa de interacción sin alcance no es cero: no
  existe, porque no hay denominador. La variación frente a un periodo anterior
  vacío tampoco: decir «+100 %» porque antes había cero es una forma elegante
  de mentir. Las dos viajan como `null` y la interfaz lo dice con palabras.
- **Se declara desde cuándo hay datos.** Pedir noventa días la semana en que se
  encendió la medición y leer los números como los de un trimestre flojo es el
  malentendido más caro que puede tener este panel. El aviso va arriba, en
  texto, no en un icono de ayuda.
- **La demografía sabe que no cubre a todos.** Dispositivo y hora salen del
  propio acceso y cubren al 100 % de la audiencia. Parroquia y edad sólo
  existen para quien tiene cuenta ciudadana **y** decidió declararlas, así que
  se muestran junto a cuánta gente representa eso. Ver más abajo.

### 2. El original de una fotografía no sale del dispositivo

El recorte, los filtros y los ajustes de imagen se aplican en el navegador y lo
que se sube es el resultado. Tres consecuencias, en orden de importancia:

1. Lo que quien publica decidió dejar **fuera del encuadre** no llega nunca al
   servidor. En una fotografía municipal eso puede ser una matrícula, la cara
   de un menor o un documento sobre una mesa.
2. La previsualización y el archivo guardado son la misma imagen, porque
   comparten la misma cadena de `filter` — una en CSS y otra en
   `contexto.filter`. Con dos implementaciones serían dos imágenes parecidas y
   nadie sabría cuál es la buena.
3. El servidor no necesita una cadena de proceso de imagen que mantener.

Donde el navegador no sabe aplicar filtros sobre lienzo, el paso se
**desactiva** en vez de degradarse: enseñar una previsualización filtrada y
subir el archivo sin filtrar es la peor de las dos opciones.

### La geometría y la matemática de color las hace una librería; el catálogo es municipal

El recuadro, el arrastre, los tiradores, la rueda, el teclado, la rotación, el
deshacer y la exportación a resolución original son de
[`@we-are-singular/svelte-chop-chop`](https://svelte-chop-chop.pages.dev) (MIT,
**cero dependencias transitivas**, peer de Svelte 5). El editor usa su
composable headless completo —`createImageEditor`, no sólo el recortador— y
compone la interfaz con sus propios `CropStencil`/`CropOverlay` en vez de
reescribir esa geometría a mano. La versión anterior de este archivo SÍ la
reescribía, y esa matemática propia produjo dos fallos reales que no se veían
en pantalla pero rompían el archivo exportado: un derivado que leía
`naturalWidth` antes de tener imagen y se quedaba en `Infinity` para siempre,
y un efecto que se disparaba a sí mismo. Delegar la geometría se lleva por
delante esa clase entera de errores.

**Los siete controles de Ajustes —brillo, contraste, saturación, exposición,
temperatura, claridad, gamma— son matrices de color de verdad**
(`getImageData`/`putImageData`), no una aproximación con `filter` de CSS. Eso
tiene dos consecuencias, no sólo una:

1. Funcionan en cualquier navegador. La versión anterior tenía que comprobar
   si `CanvasRenderingContext2D.filter` existía y apagar el paso entero donde
   no —esa comprobación (`soportaFiltroEnLienzo`) ya no existe en el código,
   porque ya no hace falta.
2. La previsualización en vivo y el archivo exportado corren el mismo cálculo,
   así que no pueden divergir.

Lo que **sí** es propio:

- **La piel.** Headless se viste por variables `--chop-*`, mapeadas a Mosaico.
- **El catálogo de filtros.** Napo, Selva, Achiote, Chonta… son matrices de
  color compuestas en `filtros.ts` multiplicando las funciones que el propio
  paquete exporta (`brightnessMatrix`, `saturationMatrix`,
  `temperatureMatrix`…), registradas por un plugin de una sola llamada
  (`ctx.registerFilterPresets`). Los preajustes de fábrica de la librería se
  llaman `clarendon`, `gingham`, `juno` —el catálogo de Instagram,
  literalmente— y no se usan en ningún sitio.

Lo que se **descartó a propósito**, sin preguntarlo porque ya estaba resuelto
por decisiones previas del proyecto:

- **Los marcos decorativos** (`pluginFrame`: sólido, línea, «hook») — chocan
  con Mosaico, que es angular y sin ornamento, y con la ambición de que el
  sitio no se vea como una plantilla genérica.
- **El volteo horizontal o vertical.** En una fotografía real —no un
  montaje— voltear invierte cualquier texto legible del encuadre: un rótulo
  de obra, una pancarta, el nombre de una calle. En un sitio que existe para
  no fabricar contenido municipal, ese riesgo no vale lo que cuesta un botón
  más. Girar 90° sí se ofrece, porque sólo corrige la orientación del
  teléfono y no puede volver ilegible nada que antes se leyera.

El sello municipal (`pluginWatermark`) sí se ofrece, y así se decidió tras
preguntarlo: **opcional, por publicación, nunca automático.** Una casilla en
Ajustes, apagada por defecto, con el nombre de la cuenta que publica —«Alcaldía
de Francisco de Orellana», o el de la dirección— como texto. Posición
(abajo a la derecha), opacidad y tamaño son fijos: el sello es una marca de
identidad, no algo que cada fotografía deba restylear a su gusto.

No se ofrece en absoluto al editar el avatar o la portada del perfil
(`mostrarSello={false}` en esos dos usos de `EditorFoto`): esas imágenes SON
la identidad institucional, sellarlas con su propio nombre no dice nada.

El plugin sólo hornea el sello **al exportar**, no en la previsualización en
vivo del lienzo —a diferencia de los filtros y los ajustes, que sí se ven en
tiempo real porque corren en el bucle de render del propio editor—. La
interfaz lo advierte junto a la casilla para que nadie active el sello, no lo
vea en la vista previa y crea que no funcionó.

Un efecto que costó encontrar aquí: `setWatermark(ajuste)` hace un *merge*
inmutable por dentro (`watermark = { ...watermark, ...ajuste }`), y esa
lectura de `watermark` ocurre DENTRO del `$effect` que llama a
`setWatermark` en el instante en que se le llama. Svelte no distingue de qué
función viene una lectura durante la ejecución de un efecto: la cuenta como
dependencia de ESE efecto, así que el mismo efecto acababa leyendo y
escribiendo su propio disparador en una sola pasada («Maximum update depth
exceeded»). Se resolvió envolviendo la llamada en `untrack(() =>
editor.setWatermark(...))`: lo que el efecto debe re-ejecutar al cambiar
—`selloActivo`, `marcaTexto`— se lee fuera de `untrack`; la llamada en sí,
dentro. Cualquier código nuevo que llame a un setter de la librería con este
patrón de *merge* desde un `$effect` puede tropezar con lo mismo.

Un detalle de integración que costó encontrarse: la instancia del editor
—`createImageEditor(...)`— se crea directamente en el `<script>`, no dentro
de un snippet como en la integración anterior con `<Cropper>`. `<ImageEditor>`
(el componente ya montado que trae el paquete) no expone ningún punto de
extensión para capturar su instancia ni sustituir su propia barra de
herramientas, así que se usa el composable headless en crudo y se compone la
interfaz con `CropStencil`/`CropOverlay` —los mismos componentes que
`<Cropper>` usa por dentro, y por eso el arrastre y el redimensionado se
comportan exactamente igual que antes sin escribir ni una línea de esa
lógica.

El fragmento pesa **11,2 KB gzip** y queda fuera de la entrada principal: lo
cargan sólo las tres rutas que montan el editor. El sitio público no lo
descarga.

El vídeo es la excepción y no puede no serlo — recortarlo en el navegador
exigiría recodificarlo entero en el teléfono de quien publica. Se sube completo
y se corta **en la entrada** de Cloudinary, de forma que lo que queda guardado
es ya sólo el trozo elegido y no el vídeo entero con una transformación encima
que cualquiera pudiera quitar de la URL.

### 3. Lo que se pega sobre una historia no es libre

Los stickers son un catálogo cerrado (`App\Support\ContenidoElemento`). En un
sitio de gobierno un rótulo sobre una fotografía no es adorno: «Cerrado hoy» o
«Convocatoria abierta» son afirmaciones oficiales, y el conjunto lo fija el
código, no quien compone a las once de la noche.

Del mismo orden:

- **Una sola encuesta o caja de preguntas por historia.** Con dos, nadie sabe
  cuál está contestando y el resultado de las dos deja de significar algo.
- **El reparto de votos no se ve hasta votar.** Enseñar el resultado parcial
  arrastra el voto siguiente; en una consulta municipal eso no es un detalle de
  interfaz.
- **Lo que se escribe en una caja de preguntas no es público.** Sólo lo lee la
  cuenta que publicó, desde el estudio, y el aviso viaja dentro del propio
  elemento para que llegue al visor aunque la interfaz cambie. Pasa además por
  los mismos filtros de insultos y datos personales que un comentario: no por
  decoro, sino porque una cédula escrita en un impulso no debería quedarse
  guardada en la base municipal porque el formulario no la miró.
- **Las posiciones son fracciones del lienzo (0..1), nunca píxeles.** Una
  historia se compone en un teléfono de 390 px y se ve en uno de 320 o en un
  escritorio de 1200.

El visor público sigue pintando los elementos con **un único componente**
(`ElementoHistoria.svelte`), y así es como se garantiza que lo que se compuso
es lo que se ve. El compositor ya no: desde que su lienzo pasa por Konva (ver
más abajo), la garantía de fondo cambió de «mismo código» a **mismos datos**
— `x`/`y`/`escala`/`rotacion`, fracción del lienzo, interpretadas por dos
motores de dibujo distintos que tienen que coincidir en el resultado.

## El compositor de publicaciones: tres pantallas

El compositor pedía antes todos sus campos a la vez —formato, pie, título,
entradilla, cuerpo, descripción, ubicación, etiquetas y participación— en una
sola columna, con el botón de publicar al final del formulario. Funcionaba, y
era exactamente lo que no hace ninguna herramienta con la que quien lleva una
cuenta municipal ya sabe publicar.

Ahora son tres pantallas —**elegir, editar, escribir**—, la forma de un
compositor de red social, porque el encargo es el mismo y esa forma ya está
aprendida. Lo que **no** se copia es la piel: sigue siendo Mosaico, angular y
sin ornamento, y sigue pidiendo lo que un sitio de gobierno tiene que pedir.

### Lo que la web no puede hacer, y qué se puso en su lugar

La primera pantalla de una aplicación nativa enseña **el carrete del
teléfono**: una rejilla con las fotos recientes del dispositivo. Eso en un
navegador no existe — no hay ninguna API que liste las fotografías del
aparato, y no es una limitación que se pueda rodear: `<input type="file">`
abre el selector del sistema y devuelve sólo lo que la persona elige. Un
sitio web que enseñara tu carrete sería un fallo de seguridad del navegador.

La rejilla se conservó, pero enseña **lo elegido** en vez del carrete: la
primera celda abre el selector (admite varias de una vez), y las demás son las
fotografías ya elegidas, cada una con su número de orden, con la que se está
previsualizando marcada y con una equis para quitarla. Arrastrar y soltar
sobre el visor sigue funcionando. Es la misma forma resolviendo lo mismo
—elegir y ordenar antes de editar— con lo que el navegador sí permite.

### El carrusel que el backend ya aceptaba

`imagenes` admite hasta diez desde que existe el endpoint (`array|max:10`), y
el visor público ya pinta la galería. El compositor era la única pieza que
mandaba siempre un solo archivo: la tira de miniaturas era justo lo que
faltaba para poder usar lo que ya estaba construido. El tope de diez del
frontend no es una cifra elegida aquí, es la del validador.

Un vídeo sigue yendo solo, y eso sí es una decisión: un carrusel se hojea, un
vídeo se reproduce, y mezclarlos obliga a decidir qué hace el reproductor al
deslizar. Mientras el visor no responda a eso, el compositor no lo ofrece.

### Los editores no se destruyen al cambiar de miniatura

Cada imagen tiene su propio `EditorFoto`, y los que no se están viendo se
esconden con `visibility` en la misma celda de rejilla, **no se desmontan**.
Si se desmontaran, volver a una imagen la reabriría con el encuadre por
defecto y borraría en silencio lo que ya se había recortado ahí — el peor tipo
de fallo: sin error, sin aviso, y sólo visible al publicar.

`display: none` no serviría para esconderlos: chop-chop mide su contenedor
para calcular el encuadre, y un contenedor de cero píxeles le daría una
geometría rota al volver a enseñarlo. `visibility` conserva la caja.

Y se montan **según se visitan**, no todos de golpe: abrir diez editores al
elegir diez fotografías es descodificar diez imágenes a pantalla completa en
un teléfono. Así el coste queda en lo que de verdad se usa, que casi siempre
son una o dos.

### Lo que se pide igual, y lo que no se copió

La pantalla de escribir pliega cada campo en una fila con su resumen a la
derecha, para que el pie de foto y el botón de publicar quepan a la vez. Lo
que la fila enseña cerrada importa: sin resumen, plegar sería esconder, y
nadie sabría si ya puso la ubicación sin abrir la fila para comprobarlo.

**La descripción para lectores de pantalla es la primera fila, la única que
avisa en color mientras falte, y la única que se vuelve a abrir sola si
vuelve a faltar** — al añadir otra imagen, o al borrar un texto. Ninguna red
social la pone en el camino principal. Aquí sí, y por lo mismo que ya decía
este documento: el catálogo arrastra 54 fotografías sin descripción, ninguna
se ha rellenado sola, y una foto que un lector de pantalla no puede describir
es contenido que parte de la ciudadanía no recibe. Con carrusel se pide una
por imagen, porque cada `Medio` lleva la suya.

No se copiaron **audio ni música** (no hay catálogo que ofrecer, y licenciar
uno para un sitio municipal es otro proyecto), **la votación** (existe en
historias, donde una encuesta caduca con ella; en una publicación permanente
es otra cosa y otro modelo de datos) ni **la etiqueta de «hecho con IA»**
(aquí no se genera imagen con IA — ver el principio de soberanía tecnológica
del proyecto).

### Las barras pegadas abajo se paran encima de la navegación

«Siguiente» y «Compartir» van en barras `sticky`, y su `bottom` **no** es `0`
sino `calc(64px + env(safe-area-inset-bottom))`: la barra de navegación del
estudio es `fixed` con `z-index: 20` y 64 px de alto, así que un `bottom: 0`
los dejaría escondidos detrás de ella justo en el teléfono, que es donde se
compone. El `@media (width >= 64rem)` que devuelve el `bottom` a `0` es el
mismo corte en el que el layout esconde esa barra y pasa al riel lateral; si
uno cambia, el otro tiene que cambiar con él.

## El lienzo del compositor: Konva, Motion y OpenMoji

El compositor de historias tenía un lienzo hecho a mano: un `<div>` con
posición absoluta por elemento, arrastre por `pointermove` y el tamaño y el
giro resueltos con dos `<input type="range">`. Servía para colocar un sticker,
pero no daba capas de verdad, ni una transformación con asas reales, ni una
forma de dibujar a mano alzada. Sustituirlo por
[Konva](https://konvajs.org/) (MIT, sin dependencias del navegador) fue lo
que hizo posible añadir esas tres cosas sin reescribir a mano la geometría de
cada una — el mismo argumento que ya valió para no reescribir el recortador de
fotos.

### Tres tipos de elemento más

`App\Support\ContenidoElemento::TIPOS` pasó de cuatro a siete:

- **`emoji`** — OpenMoji (CC-BY-SA-4.0), autohospedado: `scripts/openmoji/extraer.py`
  copia sólo los SVG a color y sin variantes de tono de piel desde el paquete
  `openmoji` (devDependency, nunca en tiempo de ejecución) a
  `static/openmoji/` + un índice recortado en `static/openmoji-indice.json`.
  Es la contraparte deliberada del sticker: el sticker dice algo («Cerrado»,
  «Convocatoria abierta») y por eso su catálogo lo fija el código; un emoji no
  afirma nada sobre el municipio, así que aquí no hay nada que aprobar y el
  índice se sirve entero.
- **`dibujo`** — un trazo a mano alzada es el único elemento sin tamaño
  natural, así que su `contenido` lleva `ancho`/`alto` (fracción del lienzo)
  además de `trazos` — cada uno con sus `puntos` en fracción de ESE recuadro,
  no del lienzo entero, y un `grosor` también fraccional para que un trazo
  grueso siga viéndose grueso si se agranda después con las asas. Topes en el
  propio validador: `MAX_TRAZOS = 12`, `MAX_PUNTOS_POR_TRAZO = 480` (ocho
  segundos de gesto a 60 puntos por segundo).
- **`imagen`** — una capa suelta (pegada, arrastrada o elegida del
  dispositivo), no la fotografía de fondo. No lleva sus propios píxeles en el
  jsonb: eso duplicaría en la base de datos lo que Cloudinary ya sirve, y cada
  fila de `historia_elementos` pesaría megabytes. Lleva un `medio_uid` que
  `HistoriaElementoResource` resuelve a una URL de verdad al serializar —el
  visor no hace una petición aparte por cada imagen suelta de cada
  historia—, y `ContenidoElemento::imagen()` comprueba que ese `Medio` exista
  de verdad antes de guardar: a diferencia de un hexcode de emoji, que si está
  mal simplemente no pinta nada, un `medio_uid` inventado sería una capa rota
  para siempre.

### Por qué Motion y no las transiciones de Svelte

Los nodos de Konva se dibujan en un `<canvas>`, no en el DOM: las
transiciones (`transition:`, `animate:`) de Svelte no pueden alcanzarlos,
porque no hay elemento que animar. [Motion](https://motion.dev) (el paquete
`motion`, build sin React) sí sirve aquí porque su `animate()` anima un
**valor numérico** con un callback (`onUpdate`), no necesariamente un nodo del
DOM — la entrada al añadir un elemento hace un `scale()` con muelle sobre el
propio grupo de Konva en cada tick. Es la única animación de este lienzo; no
se usó para nada que una transición de Svelte ya resolviera en otra pantalla.

### Web APIs, no una librería de gestos

Pellizco para hacer zoom, pegar una imagen del portapapeles y soltar un
archivo son las tres capacidades «Web APIs» del encargo, y las tres son
directas sobre el navegador, sin dependencia:

- **Zoom** — `wheel` para ratón/trackpad y `touchstart`/`touchmove` a dos
  dedos para pellizco, ambos ajustando `stage.scale()`/`stage.position()` con
  el punto bajo el dedo como centro. Es zoom del ENCUADRE, no de un elemento:
  por eso también hay botones +/− visibles (`lupa-mas`/`lupa-menos`) — un
  gesto nunca debe ser la única forma de llegar a una acción.
- **Portapapeles** — un listener de `paste` en `document` mientras el
  compositor está montado; si trae una imagen, entra por el mismo
  `subirImagen()` que ya usa el botón «Imagen».
- **Archivos** — `dragover`/`drop` nativos sobre el contenedor del lienzo,
  misma función de subida. Konva no interviene: son eventos del DOM del
  contenedor, no del `<canvas>`.

### Lo que reemplaza al elemento arrastrable como `<button>`

Un `<canvas>` es píxeles: no hay nodo que el tabulador visite ni que un lector
de pantalla anuncie. La versión anterior colocaba cada elemento en un
`<button>` de verdad precisamente para que el teclado funcionara solo; con
Konva esa vía desaparece, así que la tira de **capas** debajo del lienzo no es
un añadido de cortesía — es la que la reemplaza: selecciona, mueve con las
flechas (mismo salto de 0.02 que antes) y quita, todo con foco de teclado real
y sin tocar el `<canvas>`.

### Dos trampas de Konva que no se ven hasta seleccionar algo

**Un `Transformer` en una capa distinta de sus nodos calcula una caja
degenerada.** Vivía en `capaSeleccion`, separada de `capaElementos` para no
arriesgarse a que un `destroyChildren()` de la capa de elementos se llevara
también las asas — una precaución razonable que resultó ser el propio
problema: Konva necesita al Transformer en la MISMA capa que el nodo que
selecciona para calcular bien su caja. Sin eso, el resultado no es un error en
consola: es una caja de tamaño casi cero, así que sólo se ve un punto suelto
donde debería haber cuatro asas y un borde. Se arregló poniendo el
Transformer en `capaElementos` y sustituyendo `destroyChildren()` por destruir
uno a uno los grupos de `elementos`, dejándolo a él intacto.

**El `boundBoxFunc` que compara contra la caja anterior falla en el primer
ajuste.** La primera vez que Konva llama a `boundBoxFunc` tras seleccionar
algo, la «caja anterior» que pasa tiene anchura 0 — no hay una previa de
verdad todavía. Dividir por ella da `Infinity`, cualquier comparación con
`Infinity` rechaza la caja real, y las asas quedan colapsadas para siempre en
ese mismo punto salvo que se arrastre algo primero. El síntoma es idéntico al
de la trampa anterior, y por eso costó separarlos: la validación en vivo del
`boundBoxFunc` ahora sólo evita que un redimensionado colapse el elemento a la
nada (`width/height < 12`); el clamp de verdad —0.2 a 4, el mismo rango que ya
acepta el backend— se aplica una sola vez, al soltar.

## Dónde se hace cada cosa: estudio o panel

Durante un tiempo las dos puertas hacían lo mismo a medias. Se podía publicar
desde el panel y desde el estudio, pero **editar** una publicación sólo desde
el panel, y las destacadas sólo se podían crear —no llenar— desde el estudio.
El reparto ahora es de una frase:

> **El contenido se hace y se corrige en el estudio. El panel administra el
> sitio, y es sólo para administración.**

`es.administrador` cubre el grupo entero de rutas del panel, y el formulario
de entrada rechaza a quien no administra en la propia puerta: entrar bien y
verse de vuelta en el login sin haber tocado nada parece un fallo del sitio.
Lo que queda en el panel es lo que no es contenido de una cuenta —trámites,
páginas, medios, ciudadanos, comentarios, ajustes— más el alta de cuentas.

**Editar una publicación** vive en `/estudio/publicacion/[id]/editar`, con los
mismos campos que la pantalla de escribir del compositor: una publicación no
tiene una forma cuando nace y otra cuando se corrige. Añadir una fotografía
pasa por `EditorFoto` igual que al publicar — saltárselo subiría el original
sin recortar, que es justo lo que el compositor evita.

### Un fallo que despublicaba en silencio

`PublicacionController::campos()` aplicaba `estado => 'borrador'` y
`fecha => hoy` como valores por defecto **también al actualizar**, y
`RedactorPublicaciones` repetía el mismo `?? 'borrador'` un nivel más abajo.
La edición más común —corregir una errata, sin mandar `estado`— despublicaba
la entrada y le movía la fecha. La respuesta era 200 y el texto se guardaba
bien: sólo se notaba al mirar el sitio y ver que la publicación ya no estaba.

Ahora los valores por defecto son sólo del alta, y sin `estado` explícito se
conserva el que había. Lo fija
`PublicacionTest::test_corregir_el_texto_no_despublica_ni_mueve_la_fecha`.

### Las destacadas, enteras

Antes sólo se podían crear, desde un aro del perfil, con un título y nada
dentro: no había forma de meterles historias, así que lo que quedaba era un
círculo gris sin explicación. Una función a medias, hecha además desde el
sitio donde menos espacio hay para contarla.

`/estudio/destacadas` las gestiona enteras —crear, renombrar, elegir portada,
meter y sacar historias, borrar— y **empieza explicando para qué son**, porque
su utilidad no se deduce del aro: una historia dura tres días y guardarla en
una destacada la salva de su propia caducidad. En un municipio eso es la
diferencia entre que «cómo sacar la patente» exista todo el año o desaparezca
el jueves.

El selector ofrece las historias **ya caducadas** además de las vivas, y no es
un descuido: la decisión de guardar una suele tomarse al día siguiente, cuando
ya expiró. El endpoint las devolvía desde el principio por ese motivo; era el
frontend el que no las usaba.

Borrar una destacada **no borra sus historias**: las devuelve a su caducidad.
Destruir archivo municipal por reordenar un perfil sería otra cosa.

### Crear cuentas

Las 21 nacieron del seeder, una por pieza del organigrama, y no había forma de
añadir la vigesimosegunda. `/panel/cuentas/nueva` la crea, y **también da de
alta la dirección** si todavía no existe: una cuenta de tipo `direccion` no
existe sin su fila en `direcciones` —de ahí salen /contacto, los trámites y el
reparto de permisos— y en el panel no había ninguna otra pantalla que las
creara. Sin eso la pantalla no serviría para lo que se pidió, que es
justamente el día que aparezca una dirección nueva.

## Cómo se mide

Dos tablas con dos vidas distintas:

- `metricas_eventos` guarda el evento crudo y **se poda** a los 90 días —
  exactamente el periodo más largo que ofrece el panel. Es lo que permite
  contar visitantes únicos de verdad en cualquier ventana.
- `metricas_diarias` es el resumen por día y **no se poda**: de ahí salen las
  series y la historia larga cuando el crudo ya desapareció.

`metricas:consolidar` (a las 03:50 de Ecuador) hace las dos cosas, en ese
orden y en el mismo comando: si la poda pudiera adelantarse al resumen,
desaparecería un tramo de historia sin que nadie se enterara.

**El resumen no es sólo memoria larga: es lo que hace usable el panel.** Las
series diarias se leen de ahí, y del crudo sólo lo que el resumen todavía no
cubre —el día en curso, o los días que la tarea no llegó a procesar—. El corte
se decide mirando qué fecha tiene el resumen de verdad, no asumiendo que anoche
corrió: si no corrió, ese día se cuenta del crudo en vez de aparecer a cero, y
un hueco en el gráfico se lee como «no vino nadie».

El resumen guarda además una fila de tipo `alcance` por día, que **no** se
puede derivar sumando las de los otros tipos: quien vio una publicación en el
feed y luego la abrió cuenta en `impresion` y en `visita`, y sumar sus `unicos`
lo contaría dos veces.

### Lo que costaba, medido

Con 200 000 eventos, 6 000 visitantes distintos y 90 días de historia (el orden
de magnitud de un cantón de 80 000 habitantes durante un trimestre):

| | antes | después |
|---|---|---|
| Panel, 7 días | 140 ms | 94 ms |
| Panel, 30 días | 392 ms | 235 ms |
| Panel, 90 días | 902 ms | 382 ms |
| Audiencia, 90 días | 533 ms | 472 ms |
| `metricas:consolidar` | reventaba | 4,4 s |

Lo que quedó fuera y se sabe: `mejores()` («lo que más llegó») sigue contra el
crudo y cuesta unos 200 ms de los 382. Se puede pasar al resumen el día que
moleste.

Dos fallos que sólo aparecen con volumen, y que por eso conviene dejar
escritos:

- **La consolidación hacía un `updateOrCreate` por fila dentro de una sola
  transacción.** Con decenas de miles de filas, PostgreSQL abortaba el barrido
  nocturno con «out of shared memory: you might need to increase
  max_locks_per_transaction». Ahora es `upsert` por tandas de 2 000 y sin
  transacción envolvente.
- **El índice único necesita `NULLS NOT DISTINCT`.** La fila agregada de una
  cuenta lleva `medible_type` y `medible_id` a null, y en un índice normal dos
  nulos nunca son iguales: el `ON CONFLICT` no encontraba conflicto y cada
  noche duplicaba esas filas. Al cabo de un mes, la serie habría enseñado el
  alcance multiplicado por treinta. Lo fija
  `MetricasTest::test_consolidar_dos_veces_no_duplica_ni_cambia_los_numeros`.

**No se guarda ninguna IP.** Se guarda el sha256 de (IP + user-agent + una sal
del servidor). La sal es estable y no rota a diario, y eso es deliberado: si
rotara, «alcance de 30 días» sería la suma de treinta alcances diarios, que
cuenta a la misma persona hasta treinta veces y presenta el resultado como
exacto. Lo que impide que ese seudónimo acumule historia indefinida es la poda
del crudo.

### Alcance frente a impresiones

`impresiones` cuenta eventos; `alcance` cuenta visitantes distintos. El alcance
de un periodo **no** es la suma de los alcances diarios, así que se calcula del
crudo con un `count(distinct)` sobre toda la ventana. La serie diaria sí sale
día a día, donde cada punto es el alcance de ese día.

Una impresión se cuenta cuando la publicación entra de verdad en pantalla: la
mitad visible durante medio segundo. Sin el umbral de tiempo, pasar el dedo
rápido por el feed contaría quince publicaciones vistas; sin el de área,
contaría una que asoma dos píxeles por el borde.

### La medición pasa por SvelteKit, no directa a Laravel

Por dos motivos que no son intercambiables:

1. `navigator.sendBeacon` es lo único que sobrevive al cierre de la pestaña, y
   contra otro origen dispararía una comprobación previa de CORS que el
   navegador ya no ejecuta cuando la página se está yendo. Contra el propio
   origen no hay CORS que valga.
2. El token del ciudadano vive en una cookie httpOnly de ese origen. Si el lote
   no pasara por ahí, ningún evento llevaría `ciudadano_id` y el panel de
   audiencia estaría vacío para siempre.

**Esto exige `TRUSTED_PROXIES` configurado en la API.** Sin él, Laravel ve la
IP del contenedor de SvelteKit y cuenta a todo el cantón como un solo
visitante. El mismo ajuste arregla algo que ya estaba roto antes: los límites
por IP del asistente y del registro, que detrás del proxy de Coolify eran
límites globales compartidos.

## Demografía: opcional, declarada y nunca inferida

`ciudadanos.parroquia` y `ciudadanos.anio_nacimiento` son opcionales y las
declara cada vecino desde «Mi cuenta». No se deduce la parroquia de la conexión
ni la edad del comportamiento — sería exactamente lo que este proyecto decidió
no hacer cuando eligió no llamar a ninguna API de IA de terceros.

Se paga en cobertura, y el panel lo dice: cuántas personas identificadas hubo y
cuántas de ellas declararon. Sin ese número, un gráfico de parroquias es una
afirmación sobre el cantón que nadie ha medido.

Las doce parroquias salen del contenido municipal migrado
(`institucional/datos-canton`), no de una lista escrita en el código. El campo
es cerrado porque uno libre acabaría con «coca», «Coca» y «El Coca» como tres
parroquias distintas en el gráfico.

## Lo que el perfil del estudio no tiene

**No hay pestaña «Guardado»**, y la ausencia es la decisión. Guardar es privado
de una persona, y quien entra al estudio lo hace en nombre de una institución:
enseñar en el perfil de la Alcaldía lo que guardó la jefa de Comunicación
mezclaría dos identidades que el resto del sistema mantiene separadas. La
colección guardada existe y está en el sitio público, en «Mi cuenta», donde
pertenece a la cuenta ciudadana de cada quien. El estante equivalente aquí —«lo
que todavía no ve nadie»— es **Borradores**, y va en la misma cuadrícula que lo
publicado, marcado: en una pestaña aparte sería un cajón que nadie abre.

**No se editan el nombre ni el @alias.** El alias resuelve la URL pública del
perfil, y en un municipio esos enlaces están en oficios y en carteles
impresos. Se cambian desde el panel, con auditoría.

**No se etiqueta a personas.** Sólo a otras cuentas municipales. Etiquetar a un
vecino en una fotografía oficial es publicar su nombre junto a su cara en un
sitio de gobierno sin que él lo haya pedido; entre direcciones, en cambio, es
justo lo que hace falta.

## Seguridad: los dos modelos autenticables

La aplicación tiene dos modelos que se autentican (`User`, el personal del
panel; `Ciudadano`, los vecinos) y **comparten el guard `sanctum`**. Un token
de cualquier vecino registrado —que se emite con un formulario público— llega
igual de válido a una ruta del estudio que el de la jefa de Comunicación.

Lo que pone la frontera son dos middleware, no el guard:

- `es.creador` — exige `User`, con rol que publique y con la habilidad
  `estudio` en el token.
- `es.ciudadano` — el reverso, en reaccionar, comentar, seguir, guardar y
  responder encuestas. Que un jefe de dirección no pueda dar «me gusta» con su
  token de trabajo no es una molestia: la fila de `reacciones` apunta a
  `ciudadanos`.

La sesión del estudio dura **ocho horas** frente a los ciento ochenta días de
la ciudadana, y su cookie es `sameSite: strict`. Es lo que da permiso de
publicar en nombre del municipio: dura una jornada.

### Quién llega a qué cuenta

Una dirección publica en la suya y en ninguna otra. **Cambiar de perfil sin
volver a entrar con la contraseña de esa cuenta lo puede hacer un solo rol:
`administrador`.** Comunicación Social difunde por todas las cuentas, pero
publicar *en nombre de* una dirección ajena es otra cosa, y es justo lo que
cada dirección tiene derecho a que no pase sin que alguien lo decida.

La regla vive en **un método y no en quince copias de `hasAnyRole([...])`**:

- `User::gestionaTodasLasCuentas()` — «¿puede actuar como cualquier cuenta?».
  Hoy es `hasRole('administrador')`, y cambiarlo cambia el sistema entero.
- `User::gestionaLaCuentaDe(?int $direccionId)` — la misma pregunta para una
  cuenta concreta, que es como la necesitan las policies.

De ahí salen los tres sitios que tienen que decir lo mismo:

- `User::cuentasQueGestiona()` — qué cuentas se le **ofrecen**.
- `PublicacionPolicy` / `HistoriaPolicy` / `CuentaPolicy` / `ComentarioPolicy`
  — qué se le **acepta**. Las cuatro son una línea que delega en el método.
- Cada controlador del estudio, que resuelve la cuenta con
  `$request->user()->cuentasQueGestiona()->where('alias', $alias)->firstOrFail()`.

Quince copias de la condición era la forma habitual de que una se quedara
atrás el día que la regla cambiara — y la regla cambió.

Ese `firstOrFail` es la parte que conviene no perder: pedir una cuenta ajena
devuelve **404 antes de llegar a la autorización**, así que no hay diferencia
observable entre una cuenta que no existe y una que existe pero no es tuya.
Un 403 diría «esa cuenta existe y no es tuya», que es información que no hace
falta dar.

El selector de cuenta del estudio pregunta por el **rol**
(`sesionEstudio.puedeCambiarDePerfil`), no por «¿tiene más de una cuenta?».
Hoy las dos preguntas dan lo mismo; contar cuentas describe el efecto, el rol
dice la razón, y el día que alguien gestione dos direcciones sin ser
administrador la versión que cuenta le daría el selector sin que nadie lo
hubiera decidido. Sigue sin proteger nada por sí solo: decide qué se ofrece,
no qué se acepta.

Para poder comprobar el reparto hacía falta poder entrar como cada dirección,
y en la base local sólo existían dos personas. `php artisan usuario:direcciones`
crea las veinte, cada una con su correo derivado del slug y su contraseña
propia. Se niega a correr en producción: allí las altas son de personas
concretas, con su correo real y una contraseña que escriben ellas, y para eso
está `usuario:crear`.

### La trampa que vació la base de desarrollo

`php artisan test` **dentro del contenedor** corría con `RefreshDatabase`
contra la base de DESARROLLO y la dejaba con el esquema puesto y cero filas
—21 cuentas, 280 publicaciones, 357 medios y los usuarios, fuera— sin un solo
aviso: para PHPUnit todo había ido bien y las 93 pruebas pasaban igual de
verdes.

La causa: `phpunit.xml` declara `orellana_testing`, pero `<env>` —**incluso
con `force="true"`**— no le gana a una variable de entorno real del proceso, y
`compose.yml` exporta `DB_DATABASE=orellana` dentro del contenedor. Desde el
host no se reproduce, porque allí esa variable no existe. El fallo sólo
aparecía corriendo las pruebas donde es más natural correrlas.

Se arregló en dos capas, y las dos hacen falta:

1. **`config/database.php`** elige la base mirando `APP_ENV` —que sí llega
   desde `phpunit.xml`, porque el contenedor no la exporta— en vez de confiar
   en que `DB_DATABASE` valga lo correcto.
2. **`tests/TestCase::refreshApplication()`** aborta la ejecución si el
   nombre de la base no acaba en `_testing`, antes de tocar el esquema. No se
   usa el hook `beforeRefreshingDatabase()` porque lo define la propia trait
   `RefreshDatabase`, y un método de trait gana al de la clase padre:
   declararlo allí choca de firma y no llega a ejecutarse nunca.

## Tres trampas que ya costaron caro

Están comentadas en el código, pero conviene tenerlas juntas.

**Dentro de una transacción de PostgreSQL, guardar dos veces el mismo modelo la
aborta entera.** El observer `SincronizaFragmentos` encola un trabajo
`ShouldBeUnique`, y ese cerrojo es un INSERT en `cache_locks` cuando el almacén
de caché es la base de datos. Al segundo guardado la clave ya existe, el INSERT
choca, Laravel lo captura y reintenta con un UPDATE… que PostgreSQL ya no
ejecuta (SQLSTATE 25P02). El síntoma es una excepción sobre `cache_locks` que
no menciona en ningún sitio el contenido que se estaba guardando. `->afterCommit()`
sobre el trabajo no salva nada: aplaza el encolado, no el cerrojo. Se arregló
con `DB::afterCommit()` en el observer, y lo fija
`TransaccionPublicacionTest` — que migra de verdad en vez de usar
`RefreshDatabase`, porque dentro de la transacción envolvente de esa trait el
fallo se reproduce con corrección y sin ella.

**`ConvertEmptyStringsToNull` es middleware global.** Un compositor que manda
`titulo: ""` en una breve —porque una breve no tiene título— acaba insertando
`null` en una columna NOT NULL. Se normaliza en `RedactorPublicaciones`, para
que valga por las dos puertas.

**`naturalWidth` no es reactivo.** El derivado que calcula la escala del
recorte se computaba en cuanto `bind:this` asignaba el `<img>`, con la imagen
aún sin cargar, daba `Infinity` y no se recalculaba nunca. La
previsualización parecía correcta de casualidad —el navegador descarta un
`scale(Infinity)`— pero el lienzo exportado salía de cero píxeles y `toBlob`
devolvía `null`: el botón «Siguiente» no aparecía y nada en pantalla decía por
qué. `cargada` está en la lista de dependencias por eso.

## La capa de elevación

El sitio público es plano y angular a propósito: son teselas, y una tesela no
flota. El estudio es otra cosa —una herramienta que alguien abre cada día— y
ahí la ausencia de profundidad se pagaba en legibilidad: con todo al mismo
nivel y un filete de 1px por frontera, nada decía qué era superficie de
trabajo, qué era dato y qué era control.

Lo que se añadió es **sólo profundidad, no geometría**: `--elev-1/2/3`,
`--canto` y `--transicion` en `app.css`. Las esquinas siguen siendo casi
rectas (2-4px), porque el radio grande es lo que rompería la identidad.

La regla que conviene no olvidar: **en oscuro no se eleva con sombra.** Una
sombra negra sobre fondo negro no existe. Ahí se eleva subiendo la superficie
(`--superficie-elevada`) y marcando el canto superior con una luz interior
tenue, que es como se lee la profundidad cuando la luz viene de arriba y el
fondo ya es oscuro. Por eso los tres tokens tienen cuerpos distintos por tema
y no un solo valor con la opacidad cambiada.

Los estados se leen por más de un canal, nunca sólo por color: el destino
activo del riel lleva fondo **y** un filete de marca; la pestaña activa de la
barra inferior, filete superior **y** peso tipográfico; el periodo elegido del
selector segmentado, superficie elevada **y** tinta plena.

## Gráficos sin librería

Cuatro componentes de SVG en línea (`GraficoSerie`, `GraficoBarras`,
`GraficoColumnas`, `TarjetaCifra`). No se añadió ninguna dependencia de
gráficos: el proyecto no tiene ninguna en tiempo de ejecución y lo que hacía
falta cabe en un archivo de utilidades.

Las reglas que siguen, y que conviene mantener si se añade otro:

- **Un tono con datos y un gris de contexto**, no una paleta categórica. El
  alcance es el asunto; las impresiones son el fondo contra el que se entiende.
  Los dos verdes salen del logotipo y **se eligieron midiendo**: pasan la banda
  de luminosidad, el suelo de croma y el contraste contra su superficie en los
  dos temas, y el par se separa lo suficiente bajo daltonismo protán y deután.
  Cambiar cualquiera de los dos «porque queda mejor» hay que volver a medirlo.
- **La línea es recta entre días, nunca curvada.** Una curva dibuja valores que
  nadie midió.
- **La serie no deja huecos.** Los días sin actividad valen cero y están, o la
  línea uniría el lunes con el jueves como si el martes no hubiera existido.
- **Todo gráfico lleva su tabla debajo**, plegada. No es un extra marcado por
  cumplir: es la única forma de leer el valor exacto de un día con teclado o
  con lector de pantalla, y de copiarlo a un informe.
- **El color nunca es el único canal.** Con dos series hay leyenda siempre; la
  variación lleva flecha y signo además del color.

## Mapa de archivos

```
app/src/routes/estudio/                 las seis pantallas
app/src/lib/estudio.ts                  cliente tipado del estudio
app/src/lib/sesionEstudio.svelte.ts     quién está dentro y en qué cuenta
app/src/lib/metricas.ts                 captura de eventos en el navegador
app/src/lib/marcasPropias.svelte.ts     «¿yo qué hice con esto?», en lote
app/src/lib/components/estudio/         compositor, lienzo, gráficos, iconos
app/src/lib/components/estudio/EditorFoto.svelte      recorte (chop-chop) + filtros propios
app/src/lib/components/estudio/LienzoHistoria.svelte  lienzo del compositor (Konva + Motion)
app/src/lib/components/estudio/SelectorEmoji.svelte   selector de OpenMoji
app/src/lib/components/estudio/FilaEstudio.svelte     fila plegable de la pantalla de escribir
app/src/lib/components/ElementoHistoria.svelte   visor público de un elemento de historia
app/src/routes/api/estudio/             proxy que añade el token
app/src/routes/api/metricas/            reenvío de la medición
app/scripts/openmoji/extraer.py         regenera static/openmoji(-indice.json)

(en el repositorio de la API)
app/Http/Controllers/Api/Estudio/       sesión, perfil, publicaciones,
                                        historias, destacadas, medios, métricas
app/Http/Resources/HistoriaElementoResource.php  resuelve `medio_uid` a URL
app/Services/RedactorPublicaciones.php  reglas compartidas con el panel
app/Services/RedactorHistorias.php      idem, para historias
app/Services/RegistroMetricas.php       ingesta; el seudónimo y la deduplicación
app/Services/InformeMetricas.php        todas las consultas del panel
app/Support/ContenidoElemento.php       qué puede pegarse sobre una historia
app/Console/Commands/ConsolidarMetricas.php   resumen diario y poda
```
