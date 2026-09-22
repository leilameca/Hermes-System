import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Reservation } from '../models';
import { HermesDataService } from './hermes-data.service';

@Injectable({ providedIn: 'root' })
export class ReservationService {
  private readonly data = inject(HermesDataService);

  getAll(tenantId?: string): Observable<Reservation[]> {
    return injectObservable(this.data, tenantId);
  }

  getById(id: string, tenantId?: string): Observable<Reservation | undefined> {
    return this.getAll(tenantId).pipe(map(items => items.find(item => item.id === id)));
  }
}

function injectObservable(data: HermesDataService, tenantId?: string): Observable<Reservation[]> {
  return new Observable(subscriber => {
    void data.refresh().then(() => {
      subscriber.next(data.reservations().filter(item => tenantId === undefined || item.tenantId === tenantId).map(item => ({ ...item })));
      subscriber.complete();
    }).catch(error => subscriber.error(error));
  });
}
