import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsDo from '@angular/common/locales/es-DO';
import { provideRouter, RouteReuseStrategy } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { routes } from './app.routes';

registerLocaleData(localeEsDo);

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'es-DO' },
    provideIonicAngular({ mode: 'md' }),
    provideRouter(routes),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
  ],
};
