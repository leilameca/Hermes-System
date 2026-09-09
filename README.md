# Hermes System - Acceso y navegacion

Frontend academico de Rent-a-Car en Republica Dominicana. Angular 20 standalone,
Ionic 8 y Capacitor 7. La aplicacion inicia con login mock y conserva navegacion
por roles con datos locales.

## Ejecutar

```sh
npm install
npm start
```

Abrir `/` o `/login`. El acceso valida usuarios locales desde
`AuthDemoService`; no hay autenticacion real, JWT, Firebase, APIs, pagos,
servidores ni base de datos.

## Usuarios

| Rol | Usuario | Contrasena |
| --- | --- | --- |
| Cliente | `cliente@hermes.app` | `Hermes123` |
| Agente | `agente@hermes.app` | `Hermes123` |
| Administrador | `admin@hermes.app` | `Hermes123` |
| Super Admin | `superadmin@hermes.app` | `Hermes123` |

Los accesos de demostracion del login solo autocompletan el formulario. La sesion
activa se guarda en almacenamiento local y se limpia con Cerrar sesion.

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
- `src/app/core/services/auth-demo.service.ts`: usuarios y sesion mock.
- `src/app/core/services/auth-demo.guard.ts`: acceso por rol.
- `src/app/features/login/`: pantalla profesional de login.
- `src/app/layouts/demo-layout/`: header, sidebar, tabs moviles y logout.
- `src/app/features/demo/`: pantallas navegables con datos locales.

## Verificacion

```sh
npm run typecheck
npm run build
node scripts/verify-navigation.mjs
```

La prueba comprueba que la app inicia en `/login`, que los cuatro usuarios entran
al layout correcto, que logout vuelve al login, que las 42 rutas siguen vivas y que
la navegacion movil por rol no muestra el selector como flujo principal.
