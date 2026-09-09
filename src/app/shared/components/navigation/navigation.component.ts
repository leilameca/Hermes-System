import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { gridOutline, carSportOutline, layersOutline, wifiOutline } from 'ionicons/icons';

@Component({
  selector: 'hermes-navigation',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IonIcon],
  template: `
    <a class="brand" routerLink="/inicio" aria-label="Hermes System, ir al resumen">
      <span class="brand-mark" aria-hidden="true">H</span>
      <span>HERMES<small>SYSTEM</small></span>
    </a>
    <p class="nav-label">Espacio de trabajo</p>
    <nav aria-label="Navegación principal">
      @for (item of items; track item.path) {
        <a [routerLink]="item.path" routerLinkActive="active" ariaCurrentWhenActive="page">
          <ion-icon [icon]="item.icon" aria-hidden="true" />
          <span>{{ item.label }}</span>
          <span class="nav-number" aria-hidden="true">{{ item.number }}</span>
        </a>
      }
    </nav>
    <div class="nav-footer">
      <span class="footer-line"></span>
      <p>Movilidad.<br>Con dirección.</p>
      <small>REPÚBLICA DOMINICANA</small>
    </div>
  `,
  styleUrl: './navigation.component.scss',
})
export class NavigationComponent {
  // Todas las entradas llevan a pantallas que ya existen.
  readonly items = [
    { path: '/inicio', label: 'Resumen', number: '01', icon: gridOutline },
    { path: '/flota', label: 'Flota', number: '02', icon: carSportOutline },
    { path: '/sistema-visual', label: 'Sistema visual', number: '03', icon: layersOutline },
    { path: '/conectividad', label: 'Conectividad', number: '04', icon: wifiOutline },
  ];
}
