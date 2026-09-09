import { Routes } from '@angular/router';
import { DEMO_SPACES, DemoRole } from './demo-navigation';

const screen = (path: string, label: string, kind = path, extra = {}): Routes[number] => ({
  path,
  title: label + ' · Hermes System',
  data: { label, kind, ...extra },
  loadComponent: () => import('./demo-screen.page').then(m => m.DemoScreenPage),
});

function space(role: DemoRole, children: Routes): Routes {
  return [{
    path: '',
    data: { role },
    loadComponent: () => import('../../layouts/demo-layout/demo-layout.component').then(m => m.DemoLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: DEMO_SPACES[role].home },
      ...children,
      screen('**', 'Pagina no encontrada', 'not-found'),
    ],
  }];
}

export const CLIENT_ROUTES = space('cliente', [
  screen('inicio', 'Tu proximo viaje empieza aqui', 'home'),
  screen('explorar', 'Explorar vehiculos', 'explore'),
  screen('resultados', 'Resultados de busqueda', 'vehicles'),
  screen('vehiculos/:id', 'Detalle del vehiculo', 'vehicle'),
  screen('reservas/nueva', 'Nueva reserva', 'new-reservation'),
  screen('reservas/:id', 'Detalle de reserva', 'reservation'),
  screen('reservas', 'Mis reservas'),
  screen('contratos', 'Mis contratos'),
  screen('facturas', 'Mis facturas'),
  screen('incidentes', 'Incidentes'),
  screen('perfil', 'Mi perfil'),
]);

export const AGENT_ROUTES = space('agente', [
  screen('inicio', 'Tu jornada de operaciones', 'home'),
  screen('operaciones', 'Operaciones'),
  screen('escanear', 'Escanear vehiculo', 'scan'),
  screen('vehiculos/:id', 'Detalle del vehiculo', 'vehicle'),
  screen('entrega/:id', 'Entrega del vehiculo', 'handover'),
  screen('entrega/:id/checklist', 'Checklist de entrega', 'checklist', { flow: 'entrega' }),
  screen('entrega/:id/evidencias', 'Evidencias de entrega', 'evidence', { flow: 'entrega' }),
  screen('entrega/:id/firma', 'Firma de entrega', 'signature', { flow: 'entrega' }),
  screen('devolucion/:id', 'Devolucion del vehiculo', 'return'),
  screen('devolucion/:id/checklist', 'Checklist de devolucion', 'checklist', { flow: 'devolucion' }),
  screen('devolucion/:id/evidencias', 'Evidencias de devolucion', 'evidence', { flow: 'devolucion' }),
  screen('devolucion/:id/firma', 'Firma de devolucion', 'signature', { flow: 'devolucion' }),
  screen('incidentes', 'Incidentes'),
  screen('perfil', 'Mi perfil'),
]);

export const ADMIN_ROUTES = space('admin', [
  screen('dashboard', 'Resumen de tu empresa', 'home'),
  screen('flota', 'Flota', 'vehicles'),
  screen('flota/:id', 'Detalle del vehiculo', 'vehicle'),
  ...DEMO_SPACES.admin.areas.slice(2).map(area => screen(area.path, area.label)),
  screen('perfil', 'Mi perfil'),
]);

export const SUPER_ADMIN_ROUTES = space('super-admin', [
  screen('dashboard', 'Resumen SaaS', 'home'),
  screen('empresas', 'Empresas'),
  screen('empresas/:id', 'Detalle de empresa', 'company'),
  screen('planes', 'Planes'),
  screen('suscripciones', 'Suscripciones'),
  screen('plataforma', 'Plataforma'),
  screen('perfil', 'Mi perfil'),
]);
