import { Component, inject } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { moonOutline, sunnyOutline } from 'ionicons/icons';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'hermes-theme-toggle',
  standalone: true,
  imports: [IonIcon],
  template: `
    <button type="button" (click)="theme.toggle()" [attr.aria-label]="theme.theme() === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'">
      <ion-icon [icon]="theme.theme() === 'dark' ? sunnyIcon : moonIcon" aria-hidden="true" />
      <span>{{ theme.theme() === 'dark' ? 'Claro' : 'Oscuro' }}</span>
    </button>
  `,
  styles: [`
    :host { display: inline-flex; }
    button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 36px; padding: 0 11px; border: 1px solid var(--hermes-border); border-radius: 18px; background: var(--hermes-surface); color: var(--hermes-text-strong); cursor: pointer; font: inherit; font-size: 12px; font-weight: 700; transition: background var(--hermes-duration), border-color var(--hermes-duration), color var(--hermes-duration); }
    button:hover { border-color: var(--hermes-amber); background: var(--hermes-amber-light); }
    ion-icon { font-size: 16px; }
    @media(max-width:520px) { span { display: none; } button { width: 36px; padding: 0; } }
  `],
})
export class ThemeToggleComponent {
  readonly theme = inject(ThemeService);
  readonly moonIcon = moonOutline;
  readonly sunnyIcon = sunnyOutline;
}
