import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonInput, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { VehicleStatus } from '../../core/models';
import { VehicleService } from '../../core/services/vehicle.service';
import { TenantService } from '../../core/services/tenant.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { VehicleCardComponent } from '../../shared/components/vehicle-card/vehicle-card.component';
import { VEHICLE_STATUS } from '../../shared/presentation/vehicle.presentation';

@Component({
  selector: 'app-fleet',
  standalone: true,
  imports: [FormsModule, IonButton, IonContent, IonInput, IonSelect, IonSelectOption, PageHeaderComponent, VehicleCardComponent],
  templateUrl: './fleet.page.html',
  styleUrl: './fleet.page.scss',
})
export class FleetPage {
  readonly vehicles = toSignal(inject(VehicleService).getAll(), { initialValue: [] });
  readonly tenants = toSignal(inject(TenantService).getAll(), { initialValue: [] });
  readonly query = signal('');
  readonly status = signal<VehicleStatus | 'all'>('all');
  readonly tenantId = signal('all');
  readonly statusOptions = Object.entries(VEHICLE_STATUS).map(([value, state]) => ({ value, label: state.label }));

  // El filtro solo trabaja con el catálogo local que ya cargó la página.
  readonly filteredVehicles = computed(() => {
    const query = this.normalize(this.query().trim());
    return this.vehicles().filter(vehicle =>
      (this.status() === 'all' || vehicle.status === this.status()) &&
      (this.tenantId() === 'all' || vehicle.tenantId === this.tenantId()) &&
      this.normalize(`${vehicle.brand} ${vehicle.model} ${vehicle.plate}`).includes(query),
    );
  });

  resetFilters(): void {
    this.query.set('');
    this.status.set('all');
    this.tenantId.set('all');
  }

  private normalize(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
}
