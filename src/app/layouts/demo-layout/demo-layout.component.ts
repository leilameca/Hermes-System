import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { chevronBackOutline, chevronDownOutline, logOutOutline, menuOutline, notificationsOutline } from 'ionicons/icons';
import { AuthDemoService } from '../../core/services/auth-demo.service';
import { DEMO_SPACES, DemoArea, DemoRole } from '../../features/demo/demo-navigation';
// Muestra avisos cuando el dispositivo pierde o recupera conexión
import { OfflineBannerComponent } from '../../shared/components/offline-banner/offline-banner.component';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-demo-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IonIcon, OfflineBannerComponent, ThemeToggleComponent],
  template: `<div class="shell" [class.administrative]="administrative" [class.agent]="role === 'agente'">
    <aside class="sidebar">
      <a class="brand" [routerLink]="homeLink()"><img src="assets/brand/hermes-logo.jpeg" alt="">Hermes <small>System</small></a>
      <p class="eyebrow">{{ space.label }}</p>
      <nav aria-label="Navegación principal">
        @for (area of desktopAreas(); track area.path) {
          <a [routerLink]="['/', role, area.path]" routerLinkActive="active" ariaCurrentWhenActive="page"><ion-icon [icon]="area.icon" aria-hidden="true" />{{ labelFor(area) }}</a>
        }
      </nav>
      <div class="sidebar-account">
        <a class="sidebar-profile" [routerLink]="['/', role, profilePath()]">
          <span class="avatar" aria-hidden="true">{{ user()?.name?.slice(0, 1) }}</span>
          <span><strong>{{ user()?.name }}</strong><small>{{ space.label }}</small></span>
        </a>
      </div>
    </aside>

    <div class="workspace">
      <header>
        <button type="button" class="back" (click)="back()" aria-label="Volver a la pantalla anterior"><ion-icon [icon]="backIcon" aria-hidden="true" /><span>Atrás</span></button>
        <a class="brand compact" [routerLink]="homeLink()"><img src="assets/brand/hermes-logo.jpeg" alt="">Hermes</a>
        <span class="context">{{ pageContext() }}</span>
        <div class="account">
          <button class="notification" type="button" aria-label="Notificaciones"><ion-icon [icon]="notificationIcon" aria-hidden="true" /></button>
          <hermes-theme-toggle />
          <div class="user-menu">
            <button class="account-trigger" type="button" (click)="accountOpen.set(!accountOpen())" [attr.aria-expanded]="accountOpen()" aria-label="Abrir perfil de usuario">
              <span class="user-name">{{ user()?.name }}</span>
              <span class="avatar" aria-hidden="true">{{ user()?.name?.slice(0, 1) }}</span>
              <ion-icon class="account-chevron" [icon]="chevronIcon" aria-hidden="true" />
            </button>
            @if (accountOpen()) {
              <div class="account-panel">
                <div class="account-identity"><strong>{{ user()?.name }}</strong><span>{{ user()?.email }}</span><small>{{ space.label }}</small></div>
                <a [routerLink]="['/', role, profilePath()]" (click)="accountOpen.set(false)">Ver perfil</a>
                <button class="menu-logout" type="button" (click)="logout()"><ion-icon [icon]="logOutIcon" aria-hidden="true" />Cerrar sesión</button>
              </div>
            }
          </div>
        </div>
      </header>
      <hermes-offline-banner />

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
          <a [routerLink]="['/', role, area.path]" routerLinkActive="active" ariaCurrentWhenActive="page" [class.scan-tab]="role === 'agente' && area.path === 'escanear'"><ion-icon [icon]="area.icon" aria-hidden="true" />{{ labelFor(area) }}</a>
        }
        @if (moreAreas().length) {
          <button type="button" (click)="menuOpen.set(!menuOpen())" [attr.aria-expanded]="menuOpen()"><ion-icon [icon]="menuIcon" aria-hidden="true" />Más</button>
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
  readonly accountOpen = signal(false);
  readonly backIcon = chevronBackOutline;
  readonly logOutIcon = logOutOutline;
  readonly menuIcon = menuOutline;
  readonly notificationIcon = notificationsOutline;
  readonly chevronIcon = chevronDownOutline;
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
        this.accountOpen.set(false);
        document.querySelector('.content')?.scrollTo(0, 0);
      }
    });
  }

  homeLink() { return ['/', this.role, this.space.home]; }
  profilePath() { return 'perfil'; }
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
    if (this.role === 'cliente') return ['inicio', 'explorar', 'reservas'];
    if (this.role === 'agente') return ['inicio', 'operaciones', 'escanear', 'incidentes'];
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
