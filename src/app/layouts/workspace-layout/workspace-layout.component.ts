import { Component } from '@angular/core';
import { IonRouterOutlet } from '@ionic/angular/standalone';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { NavigationComponent } from '../../shared/components/navigation/navigation.component';
import { OfflineBannerComponent } from '../../shared/components/offline-banner/offline-banner.component';

@Component({
  selector: 'app-workspace-layout',
  standalone: true,
  imports: [IonRouterOutlet, HeaderComponent, NavigationComponent, OfflineBannerComponent],
  template: `
    <div class="workspace-shell">
      <hermes-navigation />
      <div class="workspace">
        <hermes-header />
        <hermes-offline-banner />
        <div class="workspace-content"><ion-router-outlet /></div>
      </div>
    </div>
  `,
  styles: [`
    :host { height: 100%; }
    .workspace-shell { display: grid; grid-template-columns: 224px minmax(0, 1fr); height: 100%; min-width: 0; }
    .workspace { min-height: 0; display: flex; flex-direction: column; min-width: 0; }
    .workspace-content { position: relative; flex: 1; min-width: 0; min-height: 0; overflow: auto; }
    @media (max-width: 767px) {
      .workspace-shell { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto; }
      hermes-navigation { grid-row: 2; }
      .workspace { grid-row: 1; }
      .workspace-content { padding-bottom: calc(76px + env(safe-area-inset-bottom)); }
    }
  `],
})
export class WorkspaceLayoutComponent {}
