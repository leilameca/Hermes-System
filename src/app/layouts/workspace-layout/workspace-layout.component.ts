import { Component } from '@angular/core';
import { IonRouterOutlet } from '@ionic/angular/standalone';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { NavigationComponent } from '../../shared/components/navigation/navigation.component';

@Component({
  selector: 'app-workspace-layout',
  standalone: true,
  imports: [IonRouterOutlet, HeaderComponent, NavigationComponent],
  template: `
    <div class="workspace-shell">
      <hermes-navigation />
      <div class="workspace">
        <hermes-header />
        <div class="workspace-content"><ion-router-outlet /></div>
      </div>
    </div>
  `,
  styles: [`
    :host { height: 100%; }
    .workspace-shell { display: grid; grid-template-columns: 224px minmax(0, 1fr); height: 100%; }
    .workspace { min-height: 0; display: flex; flex-direction: column; min-width: 0; }
    .workspace-content { position: relative; flex: 1; min-height: 0; }
    @media (max-width: 767px) {
      .workspace-shell { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto; }
      hermes-navigation { grid-row: 2; }
      .workspace { grid-row: 1; }
    }
  `],
})
export class WorkspaceLayoutComponent {}
