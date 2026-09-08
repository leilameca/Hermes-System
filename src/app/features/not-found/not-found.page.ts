import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, IonButton, IonContent],
  template: `
    <ion-content>
      <main class="page">
        <p class="eyebrow">Hermes System / 404</p>
        <h1>Página no encontrada</h1>
        <p>La dirección que visitaste no existe en esta etapa del proyecto.</p>
        <ion-button routerLink="/inicio">Volver al inicio</ion-button>
      </main>
    </ion-content>
  `,
})
export class NotFoundPage {}
