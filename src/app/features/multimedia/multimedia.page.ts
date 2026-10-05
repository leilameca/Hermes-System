import { Component } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-multimedia',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent],
  template: `
  <ion-header><ion-toolbar color="primary"><ion-title>Multimedia</ion-title></ion-toolbar></ion-header>
  <ion-content class="ion-padding">

    <ion-card>
      <ion-card-header><ion-card-title>1. Toyota Corolla</ion-card-title></ion-card-header>
      <ion-card-content>
        <img src="assets/images/vehicles/corolla.jpg" style="width:100%; border-radius:12px;">
        <p><b>RD$ 2,800 / día</b> - Sedán económico ideal para ciudad.</p>
      </ion-card-content>
    </ion-card>

    <ion-card>
      <ion-card-header><ion-card-title>2. Hyundai Tucson</ion-card-title></ion-card-header>
      <ion-card-content>
        <img src="assets/images/vehicles/tucson.jpg" style="width:100%; border-radius:12px;">
        <p><b>RD$ 4,500 / día</b> - SUV espaciosa y moderna.</p>
      </ion-card-content>
    </ion-card>

    <ion-card>
      <ion-card-header><ion-card-title>3. Kia Sportage</ion-card-title></ion-card-header>
      <ion-card-content>
        <img src="assets/images/vehicles/sportage.jpg" style="width:100%; border-radius:12px;">
        <p><b>RD$ 4,200 / día</b> - La más solicitada de Hermes Motors.</p>
      </ion-card-content>
    </ion-card>

    <ion-card>
      <ion-card-header><ion-card-title>4. Video Promocional</ion-card-title></ion-card-header>
      <ion-card-content>
        <iframe width="100%" height="250" src="https://www.youtube.com/embed/RuA4V2EYZ_o" frameborder="0" allowfullscreen></iframe>
      </ion-card-content>
    </ion-card>

    <ion-card>
      <ion-card-header><ion-card-title>5. Audio</ion-card-title></ion-card-header>
      <ion-card-content>
        <audio controls style="width:100%">
         <source src="assets/Audio/promo.mp3" type="audio/mpeg">
        </audio>
      </ion-card-content>
    </ion-card>

  </ion-content>
  `
})
export class MultimediaPage {}
