import { CurrencyPipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Vehicle } from '../../../core/models';
import { VEHICLE_CATEGORY, VEHICLE_STATUS } from '../../presentation/vehicle.presentation';
import { StatusComponent } from '../status/status.component';
import { VehicleImageComponent } from '../vehicle-image/vehicle-image.component';

@Component({
  selector: 'hermes-vehicle-card',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, StatusComponent, VehicleImageComponent],
  template: `
    <article>
      <a class="photo-link" [routerLink]="['/flota', vehicle.id]" [attr.aria-label]="'Ver ficha de ' + vehicle.brand + ' ' + vehicle.model">
        <hermes-vehicle-image [src]="vehicle.imageUrl" [alt]="vehicle.imageAlt || vehicle.brand + ' ' + vehicle.model" />
      </a>
      <div class="vehicle-body">
        <div class="vehicle-meta">
          <span class="eyebrow">{{ categories[vehicle.category] }} / {{ vehicle.year }}</span>
          <hermes-status [label]="statuses[vehicle.status].label" [tone]="statuses[vehicle.status].tone" />
        </div>
        <h3><a [routerLink]="['/flota', vehicle.id]">{{ vehicle.brand }} {{ vehicle.model }}</a></h3>
        <p class="specs">{{ vehicle.transmission === 'automatic' ? 'Automático' : 'Manual' }} · {{ vehicle.seats }} pasajeros · {{ vehicle.plate }}</p>
        <div class="vehicle-footer">
          <p><strong>{{ vehicle.dailyRate | currency:'DOP':'RD$ ':'1.0-0' }}</strong><span> / día</span></p>
          <a class="text-link" [routerLink]="['/flota', vehicle.id]" [attr.aria-label]="'Ver ficha de ' + vehicle.brand + ' ' + vehicle.model">Ver ficha <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </article>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    article { height: 100%; border-bottom: 1px solid var(--hermes-border); }
    .photo-link { display: block; }
    .vehicle-body { padding: var(--hermes-space-5) 0 var(--hermes-space-2); }
    .vehicle-meta { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--hermes-space-2); }
    .vehicle-meta .eyebrow { font-size: 10px; }
    h3 { margin-top: var(--hermes-space-3); }
    h3 a { color: var(--hermes-heading); text-decoration: none; }
    h3 a:hover { text-decoration: underline; }
    .specs { margin-top: var(--hermes-space-2); color: var(--hermes-text-secondary); font-size: var(--hermes-text-xs); line-height: 1.7; }
    .vehicle-footer { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--hermes-space-2); padding-top: var(--hermes-space-3); }
    .vehicle-footer p { white-space: nowrap; }
    .vehicle-footer strong { font-size: var(--hermes-text-lg); color: var(--hermes-heading); font-weight: 600; font-variant-numeric: tabular-nums; }
    .vehicle-footer p span { font-size: var(--hermes-text-xs); color: var(--hermes-text-secondary); }
    @media(max-width:420px) {
      .vehicle-footer { align-items: flex-start; flex-direction: column; }
      .vehicle-footer .text-link { min-height: 36px; }
    }
  `],
})
export class VehicleCardComponent {
  @Input({ required: true }) vehicle!: Vehicle;
  readonly statuses = VEHICLE_STATUS;
  readonly categories = VEHICLE_CATEGORY;
}
