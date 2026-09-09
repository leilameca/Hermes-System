import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { DEMO_SPACES, DemoRole } from './demo-navigation';

@Component({
  selector: 'app-demo-selector', standalone: true, imports: [RouterLink, IonContent],
  template: `<ion-content><main class="page selector">
    <p class="eyebrow">Hermes System · Acceso por rol</p>
    <h1>Un sistema.<br>Cuatro perspectivas.</h1>
    <p class="intro">Elige un rol para recorrer Hermes System.</p>
    <h2>Selector de roles</h2>
    <div class="roles">@for (role of roles; track role) {
      <a [routerLink]="['/', role, spaces[role].home]"><span class="eyebrow">Espacio {{ $index + 1 }}</span>
        <h3>{{ spaces[role].label }}</h3><p>{{ spaces[role].description }}</p><strong>Entrar como {{ spaces[role].label }} →</strong></a>
    }</div>
    <p class="notice">Selector temporal con datos locales. No requiere cuenta y las acciones no se conservan al recargar.</p>
  </main></ion-content>`,
  styles: [`.selector { padding-top: 64px; } h1 { margin: 24px 0; } .intro { margin-bottom: 40px; color: var(--hermes-text-secondary); } .roles { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 20px; margin: 24px 0; } .roles a { display: grid; gap: 16px; padding: 28px; background: white; border: 1px solid var(--hermes-border); text-decoration: none; } .roles a:hover { border-color: var(--hermes-blue); background: var(--hermes-blue-light); } .roles p { color: var(--hermes-text-secondary); } @media(max-width:600px) { .roles { grid-template-columns: 1fr; } .selector { padding-top: 32px; } }`],
})
export class DemoSelectorPage {
  readonly spaces = DEMO_SPACES;
  readonly roles = Object.keys(DEMO_SPACES) as DemoRole[];
}
