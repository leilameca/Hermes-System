# Core

Aqui estan los modelos y los servicios generales de Hermes.

- `AuthService` controla la sesion.
- `HermesDataService` consulta y guarda datos en Supabase.
- `NfcService` lee y escribe etiquetas.
- `LocationService` trabaja con GPS y lugares cercanos.
- `NetworkService` revisa la conexion.
- `OfflineService` guarda operaciones pendientes.

Las pantallas deben usar estos servicios y no conectarse directamente a la base de datos.
