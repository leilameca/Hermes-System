# HERMES SYSTEM

Aplicacion web y movil para la gestion de rent-a-car en Republica Dominicana.
Esta desarrollada con Angular 20, Ionic 8, Capacitor 7 y Supabase.

## Ejecutar

```sh
npm install
npm start
```

Abrir `/` o `/login`. El acceso utiliza Supabase Auth y dirige cada cuenta al
espacio correspondiente segun su rol y empresa.

## Usuarios

| Rol | Usuario |
| --- | --- |
| Cliente | `cliente@hermes.app` |
| Agente | `agente@hermes.app` |
| Administrador | `admin@hermes.app` |
| Super Admin | `superadmin@hermes.app` |

Los accesos rapidos solo completan el correo. Las contrasenas se administran en
Supabase y no se guardan en el codigo fuente.

## Navegacion

| Espacio | Rutas relativas |
| --- | --- |
| `/cliente` | `inicio`, `explorar`, `resultados`, `vehiculos/:id`, `reservas/nueva`, `reservas`, `reservas/:id`, `contratos`, `facturas`, `incidentes`, `perfil` |
| `/agente` | `inicio`, `operaciones`, `escanear`, `vehiculos/:id`, `entrega/:id`, `entrega/:id/checklist`, `entrega/:id/evidencias`, `entrega/:id/firma`, `devolucion/:id`, `devolucion/:id/checklist`, `devolucion/:id/evidencias`, `devolucion/:id/firma`, `incidentes`, `perfil` |
| `/admin` | `dashboard`, `flota`, `flota/:id`, `reservas`, `operaciones`, `clientes`, `inspecciones`, `contratos`, `facturacion`, `mantenimiento`, `configuracion` |
| `/super-admin` | `dashboard`, `empresas`, `empresas/:id`, `planes`, `suscripciones`, `plataforma` |

Cliente usa navegacion principal reducida: Inicio, Explorar, Reservas y Perfil.
Contratos, facturas e incidentes siguen accesibles desde reservas y perfil.
Agente usa Inicio, Operaciones, Escanear, Incidentes y Perfil. Admin usa Resumen,
Flota, Reservas, Operaciones y Mas en movil; en escritorio usa sidebar. Super Admin
mantiene un enfoque administrativo con sidebar en escritorio.

## Archivos clave

- `src/app/app.routes.ts`: login, guards por rol, rutas heredadas y 404.
- `src/app/core/services/auth.service.ts`: autenticacion y sesion.
- `src/app/core/services/hermes-data.service.ts`: acceso central a los datos.
- `src/app/core/services/tenant.service.ts`: empresa activa del usuario.
- `src/app/core/services/nfc.service.ts`: lectura y escritura NFC.
- `src/app/features/login/`: pantalla profesional de login.
- `src/app/layouts/demo-layout/`: header, sidebar, tabs moviles y logout.
- `supabase/migrations/`: estructura, seguridad y operaciones de la base de datos.

## Verificacion

```sh
npm run typecheck
npm run build
```

Las credenciales del proyecto usan una clave publica de Supabase. Nunca se debe
incluir una clave `service_role` en la aplicacion web o movil.
