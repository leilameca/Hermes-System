import { ApplicationConfig, LOCALE_ID, isDevMode } from '@angular/core';
import { importProvidersFrom } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsDo from '@angular/common/locales/es-DO';
import { provideRouter, RouteReuseStrategy, PreloadAllModules, withPreloading } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { IonicStorageModule } from '@ionic/storage-angular';
import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { Capacitor } from '@capacitor/core';

registerLocaleData(localeEsDo);

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'es-DO' },
    provideIonicAngular({ mode: 'md' }),
    // Habilita el almacenamiento usado por la cola offline
    importProvidersFrom(IonicStorageModule.forRoot()),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode() && !Capacitor.isNativePlatform(), registrationStrategy: 'registerImmediately' }),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
  ],
};
