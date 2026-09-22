import { Injectable, inject } from '@angular/core';
import { Observable, defer, from, map } from 'rxjs';
import { Vehicle } from '../models';
import { HermesDataService } from './hermes-data.service';

@Injectable({ providedIn: 'root' })
export class VehicleService {
  private readonly data = inject(HermesDataService);

  getAll(tenantId?: string): Observable<Vehicle[]> {
    return defer(() => from(this.data.refresh()).pipe(
      map(() => this.data.vehicles().filter(item => tenantId === undefined || item.tenantId === tenantId).map(item => ({ ...item }))),
    ));
  }

  getById(id: string, tenantId?: string): Observable<Vehicle | undefined> {
    return this.getAll(tenantId).pipe(map(items => items.find(item => item.id === id)));
  }
}
