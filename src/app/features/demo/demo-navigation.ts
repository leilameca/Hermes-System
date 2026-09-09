import {
  albumsOutline,
  businessOutline,
  calendarClearOutline,
  cardOutline,
  carSportOutline,
  checkboxOutline,
  constructOutline,
  diamondOutline,
  documentTextOutline,
  gridOutline,
  homeOutline,
  peopleOutline,
  personCircleOutline,
  receiptOutline,
  scanOutline,
  searchOutline,
  serverOutline,
  settingsOutline,
  swapHorizontalOutline,
  warningOutline,
} from 'ionicons/icons';

export type DemoRole = 'cliente' | 'agente' | 'admin' | 'super-admin';
export interface DemoArea { path: string; label: string; icon: string; }
export interface DemoSpace { label: string; description: string; home: string; areas: DemoArea[]; }

export const DEMO_SPACES: Record<DemoRole, DemoSpace> = {
  cliente: { label: 'Cliente', description: 'Encuentra tu vehiculo y organiza tu proximo viaje.', home: 'inicio', areas: [
    { path: 'inicio', label: 'Inicio', icon: homeOutline },
    { path: 'explorar', label: 'Explorar', icon: searchOutline },
    { path: 'reservas', label: 'Reservas', icon: calendarClearOutline },
    { path: 'contratos', label: 'Contratos', icon: documentTextOutline },
    { path: 'facturas', label: 'Facturas', icon: receiptOutline },
    { path: 'incidentes', label: 'Incidentes', icon: warningOutline },
    { path: 'perfil', label: 'Perfil', icon: personCircleOutline },
  ] },
  agente: { label: 'Agente', description: 'Acompaña cada entrega y devolucion paso a paso.', home: 'inicio', areas: [
    { path: 'inicio', label: 'Inicio', icon: homeOutline },
    { path: 'operaciones', label: 'Operaciones', icon: swapHorizontalOutline },
    { path: 'escanear', label: 'Escanear', icon: scanOutline },
    { path: 'incidentes', label: 'Incidentes', icon: warningOutline },
    { path: 'perfil', label: 'Perfil', icon: personCircleOutline },
  ] },
  admin: { label: 'Administrador', description: 'Una vision completa de tu empresa de alquiler.', home: 'dashboard', areas: [
    { path: 'dashboard', label: 'Resumen', icon: gridOutline },
    { path: 'flota', label: 'Flota', icon: carSportOutline },
    { path: 'reservas', label: 'Reservas', icon: calendarClearOutline },
    { path: 'operaciones', label: 'Operaciones', icon: swapHorizontalOutline },
    { path: 'clientes', label: 'Clientes', icon: peopleOutline },
    { path: 'inspecciones', label: 'Inspecciones', icon: checkboxOutline },
    { path: 'contratos', label: 'Contratos', icon: documentTextOutline },
    { path: 'facturacion', label: 'Facturacion', icon: cardOutline },
    { path: 'mantenimiento', label: 'Mantenimiento', icon: constructOutline },
    { path: 'configuracion', label: 'Configuracion', icon: settingsOutline },
  ] },
  'super-admin': { label: 'Super Admin', description: 'Supervisa las empresas y la plataforma Hermes.', home: 'dashboard', areas: [
    { path: 'dashboard', label: 'Resumen', icon: gridOutline },
    { path: 'empresas', label: 'Empresas', icon: businessOutline },
    { path: 'planes', label: 'Planes', icon: diamondOutline },
    { path: 'suscripciones', label: 'Suscripciones', icon: albumsOutline },
    { path: 'plataforma', label: 'Plataforma', icon: serverOutline },
  ] },
};
