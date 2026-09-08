export type DemoRole = 'cliente' | 'agente' | 'admin' | 'super-admin';
export interface DemoArea { path: string; label: string; icon: string; }
export interface DemoSpace { label: string; description: string; home: string; areas: DemoArea[]; }

export const DEMO_SPACES: Record<DemoRole, DemoSpace> = {
  cliente: { label: 'Cliente', description: 'Encuentra tu vehiculo y organiza tu proximo viaje.', home: 'inicio', areas: [
    { path: 'inicio', label: 'Inicio', icon: '⌂' },
    { path: 'explorar', label: 'Explorar', icon: '◇' },
    { path: 'reservas', label: 'Reservas', icon: '▤' },
    { path: 'contratos', label: 'Contratos', icon: '▧' },
    { path: 'facturas', label: 'Facturas', icon: '$' },
    { path: 'incidentes', label: 'Incidentes', icon: '!' },
    { path: 'perfil', label: 'Perfil', icon: '○' },
  ] },
  agente: { label: 'Agente', description: 'Acompaña cada entrega y devolucion paso a paso.', home: 'inicio', areas: [
    { path: 'inicio', label: 'Inicio', icon: '⌂' },
    { path: 'operaciones', label: 'Operaciones', icon: '▤' },
    { path: 'escanear', label: 'Escanear', icon: '▣' },
    { path: 'incidentes', label: 'Incidentes', icon: '!' },
    { path: 'perfil', label: 'Perfil', icon: '○' },
  ] },
  admin: { label: 'Administrador', description: 'Una vision completa de tu empresa de alquiler.', home: 'dashboard', areas: [
    { path: 'dashboard', label: 'Resumen', icon: '⌂' },
    { path: 'flota', label: 'Flota', icon: '◇' },
    { path: 'reservas', label: 'Reservas', icon: '▤' },
    { path: 'operaciones', label: 'Operaciones', icon: '⇄' },
    { path: 'clientes', label: 'Clientes', icon: '○' },
    { path: 'inspecciones', label: 'Inspecciones', icon: '✓' },
    { path: 'contratos', label: 'Contratos', icon: '▧' },
    { path: 'facturacion', label: 'Facturacion', icon: '$' },
    { path: 'mantenimiento', label: 'Mantenimiento', icon: '⚙' },
    { path: 'configuracion', label: 'Configuracion', icon: '☷' },
  ] },
  'super-admin': { label: 'Super Admin', description: 'Supervisa las empresas y la plataforma Hermes.', home: 'dashboard', areas: [
    { path: 'dashboard', label: 'Resumen', icon: '⌂' },
    { path: 'empresas', label: 'Empresas', icon: '▦' },
    { path: 'planes', label: 'Planes', icon: '◇' },
    { path: 'suscripciones', label: 'Suscripciones', icon: '▤' },
    { path: 'plataforma', label: 'Plataforma', icon: '⚙' },
  ] },
};
