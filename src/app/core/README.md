# Core

Modelos y servicios compartidos. Los filtros `tenantId` todavia organizan datos de demostracion y no son controles de acceso.

`SupabaseService` contiene la conexion central con el proyecto remoto. La migracion a datos reales se hara por modulos para mantener estables las pantallas actuales.

La seguridad multiempresa se aplica en la base de datos mediante Row Level Security. La guia de activacion esta en `docs/SUPABASE_SETUP.md`.
