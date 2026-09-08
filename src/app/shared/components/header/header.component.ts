import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'hermes-header',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header>
      <a class="mobile-brand" routerLink="/inicio">HERMES <span>SYSTEM</span></a>
      <p class="desktop-heading">Gestión de Rent-a-Car <span aria-hidden="true">/</span> República Dominicana</p>
      <span class="demo-label">Demostración</span>
    </header>
  `,
  styles: [`
    :host { display: block; flex-shrink: 0; }
    header { display: flex; justify-content: space-between; align-items: center; gap: var(--hermes-space-4); min-height: 76px; padding: var(--hermes-space-4) var(--hermes-space-12); padding-top: max(var(--hermes-space-4), env(safe-area-inset-top)); background: var(--hermes-surface); border-bottom: 1px solid var(--hermes-border); }
    .desktop-heading { color: var(--hermes-text-secondary); font-size: var(--hermes-text-xs); }
    .desktop-heading span { padding-inline: var(--hermes-space-3); color: var(--hermes-muted); }
    .demo-label { color: var(--hermes-text-secondary); font-size: 11px; white-space: nowrap; }
    .mobile-brand { display: none; color: var(--hermes-navy); font-size: 14px; font-weight: 600; letter-spacing: 0.1em; text-decoration: none; }
    .mobile-brand span { font-size: 9px; font-weight: 400; letter-spacing: 0.12em; }
    @media (max-width: 1199px) { header { padding-inline: var(--hermes-space-8); } }
    @media (max-width: 767px) {
      header { min-height: 64px; padding-inline: var(--hermes-space-5); }
      .desktop-heading { display: none; }
      .mobile-brand { display: block; }
    }
  `],
})
export class HeaderComponent {}
