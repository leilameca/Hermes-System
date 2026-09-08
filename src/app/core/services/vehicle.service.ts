import { Injectable } from '@angular/core';
import { defer, Observable, of } from 'rxjs';
import { Vehicle } from '../models';
import { VEHICLES_MOCK } from '../../data/mocks/vehicles.mock';

@Injectable({ providedIn: 'root' })
export class VehicleService {
  // Se entrega una copia para no modificar los datos originales desde una página.
  // TODO: sustituir los mocks cuando se autorice una etapa de integración.
  getAll(tenantId?: string): Observable<Vehicle[]> {
    return defer(() => of(VEHICLES_MOCK.filter(item => tenantId === undefined || item.tenantId === tenantId).map(item => ({ ...item }))));
  }

  getById(id: string, tenantId?: string): Observable<Vehicle | undefined> {
    return defer(() => {
      const item = VEHICLES_MOCK.find(item => item.id === id && (tenantId === undefined || item.tenantId === tenantId));
      return of(item ? { ...item } : undefined);
    });
  }
}
