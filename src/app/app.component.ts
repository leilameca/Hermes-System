import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { NetworkService } from './core/services/network.service';
import { OfflineService } from './core/services/offline.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
  template: '<ion-app><ion-router-outlet /></ion-app>',
})
export class AppComponent {
  constructor() {
    // Estos servicios deben iniciar junto con la app.
    inject(ThemeService);
    inject(NetworkService);
    inject(OfflineService);
  }
}
