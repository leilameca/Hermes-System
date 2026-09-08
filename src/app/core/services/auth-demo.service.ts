import { Injectable, computed, signal } from '@angular/core';
import { DemoRole } from '../../features/demo/demo-navigation';

export interface DemoUser {
  email: string;
  password: string;
  name: string;
  role: DemoRole;
  home: string;
}

const STORAGE_KEY = 'hermes.mock.session';

export const DEMO_USERS: readonly DemoUser[] = [
  { email: 'cliente@hermes.demo', password: 'Hermes123', name: 'Laura Mendez', role: 'cliente', home: '/cliente/inicio' },
  { email: 'agente@hermes.demo', password: 'Hermes123', name: 'Carlos Reyes', role: 'agente', home: '/agente/inicio' },
  { email: 'admin@hermes.demo', password: 'Hermes123', name: 'Mariana Soto', role: 'admin', home: '/admin/dashboard' },
  { email: 'superadmin@hermes.demo', password: 'Hermes123', name: 'Valeria Nunez', role: 'super-admin', home: '/super-admin/dashboard' },
];

@Injectable({ providedIn: 'root' })
export class AuthDemoService {
  private readonly activeUser = signal<DemoUser | null>(this.restore());
  readonly user = this.activeUser.asReadonly();
  readonly isLoggedIn = computed(() => this.activeUser() !== null);

  login(email: string, password: string): DemoUser | null {
    const normalized = email.trim().toLowerCase();
    const user = DEMO_USERS.find(row => row.email === normalized && row.password === password) ?? null;
    this.activeUser.set(user);
    if (user) localStorage.setItem(STORAGE_KEY, user.email);
    return user;
  }

  logout() {
    this.activeUser.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  private restore(): DemoUser | null {
    const email = localStorage.getItem(STORAGE_KEY);
    return DEMO_USERS.find(user => user.email === email) ?? null;
  }
}
