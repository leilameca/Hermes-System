# Conexion de HERMES SYSTEM con Supabase

## Estado de esta etapa

La aplicacion ya tiene el cliente oficial de Supabase y la configuracion publica del proyecto. Los servicios actuales siguen usando datos de demostracion hasta migrarlos de forma individual.

## Activar la base de datos

1. Abrir el proyecto de HERMES en Supabase.
2. Entrar en **SQL Editor**.
3. Crear una consulta nueva.
4. Copiar el contenido de `supabase/migrations/202609210001_initial_saas.sql`.
5. Ejecutar la consulta una sola vez.
6. Confirmar en **Table Editor** que aparezcan las tablas nuevas.

La funcion `create_organization` permitira que un usuario autenticado cree su empresa y quede registrado como administrador sin desactivar las politicas de seguridad.

## Tablas de la primera etapa

| Tabla | Responsabilidad |
|---|---|
| `organizations` | Empresas rent a car |
| `profiles` | Datos basicos del usuario autenticado |
| `memberships` | Empresa y rol de cada usuario |
| `branches` | Sucursales de la empresa |
| `vehicles` | Flota de vehiculos |
| `nfc_tags` | Tarjetas vinculadas con vehiculos |
| `nfc_events` | Historial de asignaciones y lecturas NFC |
| `location_events` | Ubicaciones de entregas, devoluciones e inspecciones |

## Seguridad

Todas las tablas tienen Row Level Security. Un usuario autenticado solo puede consultar datos de las empresas donde tenga una membresia activa. La clave publica puede estar en la aplicacion; la clave `service_role` nunca debe copiarse al proyecto Ionic.

## Flujo previsto

```mermaid
flowchart TD
    A[Usuario autenticado] --> B[Empresa activa]
    B --> C[Vehiculos]
    C --> D[Tarjeta NFC]
    D --> E[Entrega o devolucion]
    E --> F[Ubicacion del evento]
```

El GPS del telefono registra el lugar de una operacion. El seguimiento permanente del vehiculo requerira mas adelante un dispositivo GPS u OBD y una integracion de telemetria.

## Siguiente etapa

1. Crear el registro inicial de la empresa y su administrador.
2. Sustituir el inicio de sesion de demostracion por Supabase Auth.
3. Migrar vehiculos sin cambiar la interfaz actual.
4. Guardar las asociaciones NFC en `nfc_tags`.
5. Conectar reservas, contratos, entregas y devoluciones.
