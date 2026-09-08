import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthDemoService } from './auth-demo.service';
import { DemoRole } from '../../features/demo/demo-navigation';

export const guestOnlyGuard: CanMatchFn = () => {
  const auth = inject(AuthDemoService);
  const router = inject(Router);
  const user = auth.user();
  return user ? router.parseUrl(user.home) : true;
};

export const roleGuard = (role: DemoRole): CanMatchFn => () => {
  const auth = inject(AuthDemoService);
  const router = inject(Router);
  const user = auth.user();
  if (!user) return router.parseUrl('/login');
  return user.role === role ? true : router.parseUrl(user.home);
};
