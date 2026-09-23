# HERMES SYSTEM

Aplicacion web y movil para administrar una empresa rent a car. El proyecto usa
Angular, Ionic, Capacitor y Supabase.

## Funciones principales

- Inicio de sesion y acceso por roles.
- Administracion de clientes, vehiculos y reservas.
- Lectura y escritura de etiquetas NFC.
- GPS, mapa y lugares cercanos.
- Trabajo sin conexion para algunas operaciones.
- Registro de clientes por medio del enlace de una empresa.

## Ejecutar el proyecto

```sh
npm install
npm start
```

La aplicacion abre en `http://localhost:4200`.

## Revisar antes de publicar

```sh
npm run check
```

Este comando revisa TypeScript, rutas, permisos, plugins y el build de Angular.

## Abrir en Android Studio

```sh
npm run sync:android
npm run open:android
```

Luego se conecta el telefono y se pulsa **Run** en Android Studio.

## Carpetas importantes

| Carpeta | Contenido |
| --- | --- |
| `src/app/core` | Modelos y servicios generales |
| `src/app/features` | Pantallas de la aplicacion |
| `src/app/layouts` | Menu lateral, encabezado y navegacion movil |
| `src/app/shared` | Componentes que se usan en varias pantallas |
| `supabase/migrations` | Tablas, politicas y datos de prueba |
| `supabase/functions` | Funcion segura para crear cuentas de clientes |
| `android` | Proyecto nativo que abre Android Studio |
| `AP4_EquipoN` | Copia de la evidencia de la actividad AP4 |

## Base de datos

Las migraciones se ejecutan en orden:

1. `202609210001_initial_saas.sql`
2. `202609210002_auth_roles_and_customers.sql`
3. `202609210003_operational_core.sql`
4. `202609220004_customer_registration.sql`
5. `202609220005_crm_completion.sql`

La aplicacion solo contiene la clave publica de Supabase. La clave
`service_role` se guarda en Supabase y nunca se copia al codigo Angular.

## Publicacion

Vercel toma la rama `develop`. Los cambios deben probarse antes de actualizar
esa rama.

## Entrega de la Unidad VI

La explicacion tecnica del GPS esta en `docs/GPS_UNIDAD_VI.md`. La lista de
capturas, pruebas y archivos que deben entregarse esta en
`docs/ENTREGA_UNIDAD_VI.md`. El guion corto para grabar la demostracion esta en
`docs/GUION_VIDEO_UNIDAD_VI.md`.

## Notas de NFC

- En Android instalado se usa el plugin nativo.
- En la web se necesita Chrome en un telefono Android.
- Un navegador de computadora no puede leer etiquetas NFC.
- Las etiquetas guardan el identificador del vehiculo conectado a Supabase.
