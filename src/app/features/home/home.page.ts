import { AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import { forkJoin, map } from 'rxjs';
import { ReservationService } from '../../core/services/reservation.service';
import { TenantService } from '../../core/services/tenant.service';
import { UserService } from '../../core/services/user.service';
import { VehicleService } from '../../core/services/vehicle.service';
import { MetricComponent } from '../../shared/components/metric/metric.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusComponent } from '../../shared/components/status/status.component';
import { VehicleCardComponent } from '../../shared/components/vehicle-card/vehicle-card.component';
import { VehicleImageComponent } from '../../shared/components/vehicle-image/vehicle-image.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AsyncPipe, CurrencyPipe, DatePipe, RouterLink, IonButton, IonContent, MetricComponent, PageHeaderComponent, StatusComponent, VehicleCardComponent, VehicleImageComponent],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  // Los números y las listas salen de la misma fuente local.
  readonly data$ = forkJoin({
    users: inject(UserService).getAll(),
    tenants: inject(TenantService).getAll(),
    vehicles: inject(VehicleService).getAll(),
    reservations: inject(ReservationService).getAll(),
  }).pipe(map(data => ({
    ...data,
    available: data.vehicles.filter(vehicle => vehicle.status === 'available').length,
    reserved: data.vehicles.filter(vehicle => vehicle.status === 'reserved').length,
    featured: data.vehicles.find(vehicle => vehicle.status === 'available'),
    reservationRows: data.reservations.map(reservation => ({
      ...reservation,
      vehicle: data.vehicles.find(vehicle => vehicle.id === reservation.vehicleId),
      tenant: data.tenants.find(tenant => tenant.id === reservation.tenantId),
    })),
  })));
}
