import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

// Adaptador temporal para las pantallas existentes mientras se completa la migracion.
@Injectable({ providedIn: 'root' })
export class AuthDemoService {
  private readonly auth = inject(AuthService);
  readonly user = this.auth.user;

  logout(): Promise<void> {
    return this.auth.logout();
  }

  updateProfile(fullName: string, phone: string): Promise<void> {
    return this.auth.updateProfile(fullName, phone);
  }
}
