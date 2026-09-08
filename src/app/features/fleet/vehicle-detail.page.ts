import { AsyncPipe, CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import { switchMap } from 'rxjs';
import { VehicleService } from '../../core/services/vehicle.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusComponent } from '../../shared/components/status/status.component';
import { VehicleImageComponent } from '../../shared/components/vehicle-image/vehicle-image.component';
import { VEHICLE_CATEGORY, VEHICLE_STATUS } from '../../shared/presentation/vehicle.presentation';

@Component({
  selector: 'app-vehicle-detail',
  standalone: true,
  imports: [AsyncPipe, CurrencyPipe, DecimalPipe, RouterLink, IonButton, IonContent, PageHeaderComponent, StatusComponent, VehicleImageComponent],
  template: `
    <ion-content>
      <main class="hermes-page">
        <a class="text-link back-link" routerLink="/flota"><span aria-hidden="true">←</span> Volver a la flota</a>
        @if (vehicle$ | async; as vehicle) {
          <hermes-page-header [eyebrow]="'Flota / ' + vehicle.plate" [title]="vehicle.brand + ' ' + vehicle.model"
            [description]="categories[vehicle.category] + ' · ' + vehicle.year">
            <hermes-status [label]="statuses[vehicle.status].label" [tone]="statuses[vehicle.status].tone" />
          </hermes-page-header>
          <div class="detail-grid">
            <figure>
              <hermes-vehicle-image [src]="vehicle.imageUrl" [alt]="vehicle.imageAlt || vehicle.model" [priority]="true" />
              <figcaption>Imagen ilustrativa del vehículo. Catálogo de demostración.</figcaption>
            </figure>
            <section class="vehicle-details" aria-labelledby="details-title">
              <p class="eyebrow">Información del vehículo</p>
              <h2 id="details-title">Listo para conocerlo.</h2>
              <dl class="spec-list">
                <div><dt>Placa</dt><dd>{{ vehicle.plate }}</dd></div>
                <div><dt>Transmisión</dt><dd>{{ vehicle.transmission === 'automatic' ? 'Automática' : 'Manual' }}</dd></div>
                <div><dt>Capacidad</dt><dd>{{ vehicle.seats }} pasajeros</dd></div>
                <div><dt>Kilometraje</dt><dd>{{ vehicle.mileage | number }} km</dd></div>
              </dl>
              <div class="rate"><p class="eyebrow">Tarifa diaria</p><p><strong>{{ vehicle.dailyRate | currency:'DOP':'RD$ ':'1.0-0' }}</strong> / día</p></div>
              <p class="text-secondary text-small">Importe de ejemplo en pesos dominicanos.</p>
              <ion-button fill="outline" routerLink="/flota">Seguir explorando</ion-button>
            </section>
          </div>
        } @else {
          <section class="empty-state">
            <p class="eyebrow">Vehículo no encontrado</p><h1>Esta ficha no está disponible.</h1>
            <p>El identificador no corresponde a un vehículo del catálogo de demostración.</p>
            <ion-button routerLink="/flota">Ver la flota</ion-button>
          </section>
        }
      </main>
    </ion-content>
  `,
  styles: [`
    .back-link { margin-bottom: var(--hermes-space-5); }
    .detail-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: var(--hermes-space-10); align-items: start; }
    .vehicle-details { display: grid; gap: var(--hermes-space-5); }
    .vehicle-details ion-button { justify-self: start; }
    .spec-list div { display: flex; justify-content: space-between; gap: var(--hermes-space-4); padding-block: var(--hermes-space-3); border-bottom: 1px solid var(--hermes-border); font-size: var(--hermes-text-sm); }
    dt { color: var(--hermes-text-secondary); }
    dd { margin: 0; text-align: right; }
    .rate strong { font-size: 30px; font-weight: 500; color: var(--hermes-navy); }
    .rate > p + p { margin-top: var(--hermes-space-2); }
    figcaption { margin-top: var(--hermes-space-3); color: var(--hermes-text-secondary); font-size: var(--hermes-text-xs); }
    @media (max-width: 1199px) { .detail-grid { grid-template-columns: 1fr; } }
  `],
})
export class VehicleDetailPage {
  private readonly vehicleService = inject(VehicleService);
  readonly vehicle$ = inject(ActivatedRoute).paramMap.pipe(
    switchMap(params => this.vehicleService.getById(params.get('id') ?? '')),
  );
  readonly statuses = VEHICLE_STATUS;
  readonly categories = VEHICLE_CATEGORY;
}
