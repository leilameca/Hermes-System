import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Tenant } from '../models';
import { HermesDataService } from './hermes-data.service';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly data = inject(HermesDataService);

  getAll(): Observable<Tenant[]> {
    return new Observable(subscriber => {
      void this.data.refresh().then(() => {
        subscriber.next(this.data.organizations().map(item => ({ ...item })));
        subscriber.complete();
      }).catch(error => subscriber.error(error));
    });
  }

  getById(id: string): Observable<Tenant | undefined> {
    return new Observable(subscriber => {
      void this.data.refresh().then(() => {
        subscriber.next(this.data.organizations().find(item => item.id === id));
        subscriber.complete();
      }).catch(error => subscriber.error(error));
    });
  }
}
