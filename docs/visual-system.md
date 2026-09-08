# Sistema visual Hermes

La identidad usa composición, fotografía y líneas. El fondo Canvas deja espacio
entre secciones; Surface se reserva para controles y encabezados. No añadir
tarjetas alrededor de contenido que ya tiene un título y una separación clara.

## Archivos principales

- `src/theme/tokens.scss`: paleta, espaciado, tipografía y variables de Ionic.
- `src/theme/foundations.scss`: títulos, secciones, rejillas y utilidades comunes.
- `src/theme/ionic.scss`: botones, inputs, selectores y estados de los controles.
- `src/global.scss`: importa primero Ionic y después la identidad de Hermes.
- `src/app/shared/components`: componentes usados en varias composiciones.
- `src/app/layouts/workspace-layout`: encabezado y navegación del espacio de trabajo.

## Criterios de uso

La escala de espacio es 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 y 80 px. Utilizar
las variables `--hermes-space-*`. Por ejemplo, `--hermes-space-6` equivale a 24 px.
Relacionar etiqueta y valor con 8–12 px; separar grupos con 24–32 px y secciones
con 48 px. Los bordes de controles tienen 3 px de radio; no hay sombras de tarjetas.

Arial, Helvetica y sans-serif forman la pila tipográfica local. H1 usa 32–48 px,
H2 22–28 px, H3 20 px y el cuerpo 16 px. El texto secundario usa
`--hermes-text-secondary`, un gris adicional con más contraste sobre Canvas.
Muted se conserva en la paleta para elementos de apoyo. Amber se usa en líneas
y acentos, no como texto pequeño sobre fondos claros.

Usar `ion-button` directamente. El botón principal emplea azul; `fill="outline"`
representa una acción secundaria y `fill="clear"` una acción discreta.
Mantener etiquetas claras y estados `disabled` cuando corresponda.

En formularios, usar `ion-input` o `ion-textarea` con `class="hermes-input"`,
`fill="outline"` y `labelPlacement="stacked"`. Para `ion-select`, utilizar
`class="hermes-select"`. Cada campo necesita etiqueta; el placeholder no la
sustituye. Los mensajes de error acompañan al campo y no dependen solo del color.
La guía visual incluye un formulario con validación local, sin persistencia.

## Componentes compartidos

| Componente | Responsabilidad |
| --- | --- |
| `hermes-header` | Encabezado de contexto y marca móvil |
| `hermes-navigation` | Rutas activas, lateral en escritorio e inferior en móvil |
| `hermes-page-header` | Un H1, contexto, descripción y acciones por proyección |
| `hermes-metric` | Etiqueta, valor y descripción, sin contenedor decorativo |
| `hermes-status` | Texto y línea lateral con tonos neutral, info, warning o critical |
| `hermes-vehicle-image` | Imagen 3:2, carga diferida y alternativa ante ausencia o error |
| `hermes-vehicle-card` | Foto, características, tarifa y enlace a una ficha real |

Los estados de vehículos se traducen en `shared/presentation/vehicle.presentation.ts`.
Los componentes reciben datos; no consultan mocks ni deciden permisos de usuario.
Las secciones simples usan HTML semántico y clases comunes. No hay un componente
Angular adicional para cada botón, input o contenedor.

## Pantallas y adaptación

- `/inicio`: resumen, vehículo destacado, catálogo, reservas y empresas locales.
- `/flota`: búsqueda inmediata por marca, modelo o placa; filtros de estado y
  empresa; resultados y estado vacío con restablecimiento de filtros.
- `/flota/:id`: ficha del vehículo. Un ID inexistente muestra una alternativa
  con enlace de regreso al catálogo.
- `/sistema-visual`: paleta, tipografía, espaciado, controles, estados, métricas
  y tratamiento de las imágenes.
- Una ruta desconocida mantiene la página 404 de la primera etapa.

La navegación cambia a barra inferior por debajo de 768 px, sin duplicar enlaces.
El layout reserva espacio para esa barra y respeta las áreas seguras del móvil.
Las tarjetas pasan de tres a dos y una columna. Los estilos incluyen foco visible,
preferencia de movimiento reducido, texto alternativo y anuncios de resultados
de búsqueda. Las fechas y cifras usan el locale `es-DO`.

## Fotografía y alcance

Las imágenes se encuentran en `src/assets/images/vehicles`. Sus prompts y origen
están en `docs/image-prompts.md`. Se incluyen en `www/assets` durante el build.
No se cargan fuentes ni fotografías remotas.

Todo funciona sobre servicios y mocks locales. No hay autenticación, endpoints,
bases de datos, reservas reales, pagos ni cambios de estado de negocio.
