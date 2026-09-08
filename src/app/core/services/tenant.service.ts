import { Injectable } from '@angular/core';
import { defer, Observable, of } from 'rxjs';
import { Tenant } from '../models';
import { TENANTS_MOCK } from '../../data/mocks/tenants.mock';

@Injectable({ providedIn: 'root' })
export class TenantService {
  // Se entrega una copia para no modificar los datos originales desde una página.
  // TODO: sustituir los mocks cuando se autorice una etapa de integración.
  getAll(): Observable<Tenant[]> {
    return defer(() => of(TENANTS_MOCK.map(item => ({ ...item }))));
  }

  getById(id: string): Observable<Tenant | undefined> {
    return defer(() => {
      const item = TENANTS_MOCK.find(item => item.id === id);
      return of(item ? { ...item } : undefined);
    });
  }
}
