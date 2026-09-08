import { Injectable } from '@angular/core';
import { defer, Observable, of } from 'rxjs';
import { Reservation } from '../models';
import { RESERVATIONS_MOCK } from '../../data/mocks/reservations.mock';

@Injectable({ providedIn: 'root' })
export class ReservationService {
  // Se entrega una copia para no modificar los datos originales desde una página.
  // TODO: sustituir los mocks cuando se autorice una etapa de integración.
  getAll(tenantId?: string): Observable<Reservation[]> {
    return defer(() => of(RESERVATIONS_MOCK.filter(item => tenantId === undefined || item.tenantId === tenantId).map(item => ({ ...item }))));
  }

  getById(id: string, tenantId?: string): Observable<Reservation | undefined> {
    return defer(() => {
      const item = RESERVATIONS_MOCK.find(item => item.id === id && (tenantId === undefined || item.tenantId === tenantId));
      return of(item ? { ...item } : undefined);
    });
  }
}
