import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { DemoRole } from '../../features/demo/demo-navigation';
import { AuthService } from './auth.service';

export const guestOnlyGuard: CanMatchFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready();
  return auth.user() ? router.parseUrl(auth.user()!.home) : true;
};

export const authenticatedGuard: CanMatchFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready();
  return auth.user() ? true : router.parseUrl('/login');
};

export const roleGuard = (role: DemoRole): CanMatchFn => async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready();
  const user = auth.user();
  if (!user) return router.parseUrl('/login');
  return user.role === role ? true : router.parseUrl(user.home);
};

export const rolesGuard = (roles: DemoRole[]): CanMatchFn => async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready();
  const user = auth.user();
  if (!user) return router.parseUrl('/login');
  return roles.includes(user.role) ? true : router.parseUrl(user.home);
};
