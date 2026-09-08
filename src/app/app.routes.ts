import { Routes } from '@angular/router';
import { guestOnlyGuard, roleGuard } from './core/services/auth-demo.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', title: 'Iniciar sesion · Hermes System', canMatch: [guestOnlyGuard], loadComponent: () => import('./features/login/login.page').then(m => m.LoginPage) },
  { path: 'demo', redirectTo: 'login', pathMatch: 'full' },
  { path: 'cliente', canMatch: [roleGuard('cliente')], loadChildren: () => import('./features/demo/demo.routes').then(m => m.CLIENT_ROUTES) },
  { path: 'agente', canMatch: [roleGuard('agente')], loadChildren: () => import('./features/demo/demo.routes').then(m => m.AGENT_ROUTES) },
  { path: 'admin', canMatch: [roleGuard('admin')], loadChildren: () => import('./features/demo/demo.routes').then(m => m.ADMIN_ROUTES) },
  { path: 'super-admin', canMatch: [roleGuard('super-admin')], loadChildren: () => import('./features/demo/demo.routes').then(m => m.SUPER_ADMIN_ROUTES) },
  { path: 'inicio', redirectTo: 'login', pathMatch: 'full' },
  { path: 'flota', redirectTo: 'admin/flota', pathMatch: 'full' },
  { path: 'flota/:id', redirectTo: 'admin/flota/:id' },
  { path: 'sistema-visual', loadComponent: () => import('./layouts/workspace-layout/workspace-layout.component').then(m => m.WorkspaceLayoutComponent), children: [
    { path: '', title: 'Sistema visual · Hermes System', loadComponent: () => import('./features/design-system/design-system.page').then(m => m.DesignSystemPage) },
  ] },
  { path: '**', title: 'Pagina no encontrada · Hermes System', loadComponent: () => import('./features/not-found/not-found.page').then(m => m.NotFoundPage) },
];
