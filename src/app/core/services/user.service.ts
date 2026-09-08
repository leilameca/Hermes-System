import { Injectable } from '@angular/core';
import { defer, Observable, of } from 'rxjs';
import { User } from '../models';
import { USERS_MOCK } from '../../data/mocks/users.mock';

@Injectable({ providedIn: 'root' })
export class UserService {
  // Se entrega una copia para no modificar los datos originales desde una página.
  // TODO: sustituir los mocks cuando se autorice una etapa de integración.
  getAll(tenantId?: string): Observable<User[]> {
    return defer(() => of(USERS_MOCK.filter(item => tenantId === undefined || item.tenantId === tenantId).map(item => ({ ...item }))));
  }

  getById(id: string, tenantId?: string): Observable<User | undefined> {
    return defer(() => {
      const item = USERS_MOCK.find(item => item.id === id && (tenantId === undefined || item.tenantId === tenantId));
      return of(item ? { ...item } : undefined);
    });
  }
}
