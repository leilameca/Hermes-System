import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthDemoService } from '../../core/services/auth-demo.service';
import { DEMO_SPACES, DemoArea, DemoRole } from '../../features/demo/demo-navigation';

@Component({
  selector: 'app-demo-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `<div class="shell" [class.administrative]="administrative" [class.agent]="role === 'agente'">
    <aside class="sidebar">
      <a class="brand" [routerLink]="homeLink()"><img src="assets/brand/hermes-logo.jpeg" alt="">Hermes <small>System</small></a>
      <p class="eyebrow">{{ space.label }}</p>
      <nav aria-label="Navegación principal">
        @for (area of desktopAreas(); track area.path) {
          <a [routerLink]="['/', role, area.path]" routerLinkActive="active" ariaCurrentWhenActive="page"><span aria-hidden="true">{{ area.icon }}</span>{{ labelFor(area) }}</a>
        }
      </nav>
      <button class="logout" type="button" (click)="logout()">Cerrar sesión</button>
    </aside>

    <div class="workspace">
      <header>
        <button type="button" class="back" (click)="back()" aria-label="Volver a la pantalla anterior">← Atrás</button>
        <a class="brand compact" [routerLink]="homeLink()"><img src="assets/brand/hermes-logo.jpeg" alt="">Hermes</a>
        <span class="context">{{ pageContext() }}</span>
        <div class="account">
          <a [routerLink]="['/', role, profilePath()]">{{ user()?.name }}</a>
          <span>{{ space.label }}</span>
          <button type="button" (click)="logout()">Cerrar sesión</button>
        </div>
      </header>

      @if (menuOpen()) {
        <nav class="more-menu" aria-label="Más secciones">
          @for (area of moreAreas(); track area.path) {
            <a [routerLink]="['/', role, area.path]" routerLinkActive="active" ariaCurrentWhenActive="page" (click)="menuOpen.set(false)">{{ labelFor(area) }}</a>
          }
        </nav>
      }

      <div class="content"><router-outlet /></div>

      <nav class="bottom" aria-label="Navegación móvil">
        @for (area of mobileAreas(); track area.path) {
          <a [routerLink]="['/', role, area.path]" routerLinkActive="active" ariaCurrentWhenActive="page" [class.scan-tab]="role === 'agente' && area.path === 'escanear'"><span aria-hidden="true">{{ area.icon }}</span>{{ labelFor(area) }}</a>
        }
        @if (moreAreas().length) {
          <button type="button" (click)="menuOpen.set(!menuOpen())" [attr.aria-expanded]="menuOpen()"><span aria-hidden="true">☰</span>Más</button>
        }
      </nav>
    </div>
  </div>`,
  styleUrl: './demo-layout.component.scss',
})
export class DemoLayoutComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthDemoService);
  readonly role = inject(ActivatedRoute).snapshot.data['role'] as DemoRole;
  readonly space = DEMO_SPACES[this.role];
  readonly user = this.auth.user;
  readonly administrative = this.role === 'admin' || this.role === 'super-admin';
  readonly menuOpen = signal(false);
  private previous: string[] = [];
  private current = this.router.url;

  readonly mobileAreas = computed(() => this.pickAreas(this.mobilePaths()));
  readonly moreAreas = computed(() => this.pickAreas(this.morePaths()));
  readonly desktopAreas = computed(() => this.administrative ? this.space.areas : this.pickAreas(this.desktopPaths()));

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe(event => {
      if (event instanceof NavigationEnd) {
        if (this.current !== event.urlAfterRedirects) this.previous.push(this.current);
        this.current = event.urlAfterRedirects;
        this.menuOpen.set(false);
        document.querySelector('.content')?.scrollTo(0, 0);
      }
    });
  }

  homeLink() { return ['/', this.role, this.space.home]; }
  profilePath() { return this.role === 'admin' || this.role === 'super-admin' ? this.space.home : 'perfil'; }
  pageContext() { return this.labelFor(this.space.areas.find(area => this.router.url.includes('/' + area.path)) ?? this.space.areas[0]); }
  labelFor(area: DemoArea) { return area.label.replace('Dashboard SaaS', 'Resumen').replace('Dashboard', 'Resumen'); }

  back() {
    const target = this.previous.pop();
    const home = '/' + this.role + '/' + this.space.home;
    this.current = target ?? (this.router.url === home ? '/login' : home);
    void this.router.navigateByUrl(this.current);
  }

  logout() {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  private pickAreas(paths: string[]) {
    return paths.map(path => this.space.areas.find(area => area.path === path)).filter(Boolean) as DemoArea[];
  }

  private mobilePaths() {
    if (this.role === 'cliente') return ['inicio', 'explorar', 'reservas', 'perfil'];
    if (this.role === 'agente') return ['inicio', 'operaciones', 'escanear', 'incidentes', 'perfil'];
    if (this.role === 'admin') return ['dashboard', 'flota', 'reservas', 'operaciones'];
    return ['dashboard', 'empresas', 'planes', 'suscripciones', 'plataforma'];
  }

  private morePaths() {
    if (this.role === 'admin') return ['clientes', 'inspecciones', 'contratos', 'facturacion', 'mantenimiento', 'configuracion'];
    return [];
  }

  private desktopPaths() {
    if (this.role === 'cliente') return ['inicio', 'explorar', 'reservas', 'perfil'];
    if (this.role === 'agente') return ['inicio', 'operaciones', 'escanear', 'incidentes', 'perfil'];
    return this.space.areas.map(area => area.path);
  }
}
