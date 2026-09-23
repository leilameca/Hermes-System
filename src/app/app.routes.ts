import { Routes } from '@angular/router';
import { authenticatedGuard, guestOnlyGuard, passwordChangeGuard, roleGuard, rolesGuard } from './core/services/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', title: 'Iniciar sesion · Hermes System', canMatch: [guestOnlyGuard], loadComponent: () => import('./features/login/login.page').then(m => m.LoginPage) },
  { path: 'registro/:empresa', title: 'Crear cuenta · Hermes System', canMatch: [guestOnlyGuard], loadComponent: () => import('./features/register/register.page').then(m => m.RegisterPage) },
  { path: 'cambiar-clave', title: 'Cambiar contraseña · Hermes System', canMatch: [passwordChangeGuard], loadComponent: () => import('./features/change-password/change-password.page').then(m => m.ChangePasswordPage) },
  { path: 'demo', redirectTo: 'login', pathMatch: 'full' },
  { path: 'cliente', canMatch: [roleGuard('cliente')], loadChildren: () => import('./features/demo/demo.routes').then(m => m.CLIENT_ROUTES) },
  { path: 'agente', canMatch: [roleGuard('agente')], loadChildren: () => import('./features/demo/demo.routes').then(m => m.AGENT_ROUTES) },
  { path: 'admin', canMatch: [roleGuard('admin')], loadChildren: () => import('./features/demo/demo.routes').then(m => m.ADMIN_ROUTES) },
  { path: 'super-admin', canMatch: [roleGuard('super-admin')], loadChildren: () => import('./features/demo/demo.routes').then(m => m.SUPER_ADMIN_ROUTES) },
  { path: 'inicio', redirectTo: 'login', pathMatch: 'full' },
  { path: 'flota', redirectTo: 'admin/flota', pathMatch: 'full' },
  { path: 'flota/:id', redirectTo: 'admin/flota/:id' },
  { path: 'sistema-visual', canMatch: [authenticatedGuard], loadComponent: () => import('./layouts/workspace-layout/workspace-layout.component').then(m => m.WorkspaceLayoutComponent), children: [
    { path: '', title: 'Sistema visual · Hermes System', loadComponent: () => import('./features/design-system/design-system.page').then(m => m.DesignSystemPage) },
  ] },
  // Abre la pantalla usada para revisar la conexión y la cola local
  { path: 'conectividad', canMatch: [authenticatedGuard], loadComponent: () => import('./layouts/workspace-layout/workspace-layout.component').then(m => m.WorkspaceLayoutComponent), children: [
    { path: '', title: 'Conectividad · Hermes System', loadComponent: () => import('./features/connectivity/connectivity.page').then(m => m.ConnectivityPage) },
  ] },
  // Acceso directo para las pruebas y evidencias de la actividad NFC.
  { path: 'nfc', canMatch: [rolesGuard(['agente', 'admin'])], loadComponent: () => import('./layouts/workspace-layout/workspace-layout.component').then(m => m.WorkspaceLayoutComponent), children: [
    { path: '', title: 'NFC · Hermes System', loadComponent: () => import('./features/nfc/nfc.page').then(m => m.NfcPage) },
  ] },
  { path: '**', title: 'Pagina no encontrada · Hermes System', loadComponent: () => import('./features/not-found/not-found.page').then(m => m.NotFoundPage) },
];
