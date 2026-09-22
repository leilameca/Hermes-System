import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { User } from '../models';
import { HermesDataService } from './hermes-data.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly data = inject(HermesDataService);
  private readonly auth = inject(AuthService);

  getAll(tenantId?: string): Observable<User[]> {
    return new Observable(subscriber => {
      void this.data.refresh().then(() => {
        const current = this.auth.user();
        const users = this.data.members().map(member => ({
          id: member.id,
          tenantId: current?.organizationId ?? null,
          name: member.name,
          email: member.id === current?.id ? current.email : '',
          role: member.role,
          active: member.active,
        } as User)).filter(item => tenantId === undefined || item.tenantId === tenantId);
        subscriber.next(users);
        subscriber.complete();
      }).catch(error => subscriber.error(error));
    });
  }

  getById(id: string, tenantId?: string): Observable<User | undefined> {
    return this.getAll(tenantId).pipe(map(items => items.find(item => item.id === id)));
  }
}
