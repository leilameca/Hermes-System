import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';

@Component({
  selector: 'hermes-header',
  standalone: true,
  imports: [RouterLink, ThemeToggleComponent],
  template: `
    <header>
      <a class="mobile-brand" routerLink="/inicio">HERMES <span>SYSTEM</span></a>
      <p class="desktop-heading">Gestión de Rent-a-Car <span aria-hidden="true">/</span> República Dominicana</p>
      <div class="header-actions"><span class="demo-label">Operación</span><hermes-theme-toggle /></div>
    </header>
  `,
  styles: [`
    :host { display: block; flex-shrink: 0; }
    header { display: flex; justify-content: space-between; align-items: center; gap: var(--hermes-space-4); min-height: 76px; padding: var(--hermes-space-4) var(--hermes-space-12); padding-top: max(var(--hermes-space-4), env(safe-area-inset-top)); background: var(--hermes-surface); border-bottom: 1px solid var(--hermes-border); }
    .desktop-heading { color: var(--hermes-text-secondary); font-size: var(--hermes-text-xs); }
    .desktop-heading span { padding-inline: var(--hermes-space-3); color: var(--hermes-muted); }
    .header-actions { display: inline-flex; align-items: center; gap: 12px; }
    .demo-label { color: var(--hermes-text-secondary); font-size: 11px; white-space: nowrap; }
    .mobile-brand { display: none; color: var(--hermes-text-strong); font-size: 14px; font-weight: 600; letter-spacing: 0.1em; text-decoration: none; }
    .mobile-brand span { font-size: 9px; font-weight: 400; letter-spacing: 0.12em; }
    @media (max-width: 1199px) { header { padding-inline: var(--hermes-space-8); } }
    @media (max-width: 767px) {
      header { min-height: 64px; padding-inline: var(--hermes-space-5); }
      .desktop-heading { display: none; }
      .mobile-brand { display: block; }
      .header-actions { gap: var(--hermes-space-2); }
    }
    @media (max-width: 380px) { header { padding-inline: var(--hermes-space-3); } .demo-label { display: none; } }
  `],
})
export class HeaderComponent {}
