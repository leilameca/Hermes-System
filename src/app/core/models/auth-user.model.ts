import { DemoRole } from '../../features/demo/demo-navigation';

export type AuthState = 'checking' | 'authenticated' | 'guest';

export interface AuthUserContext {
  id: string;
  email: string;
  name: string;
  role: DemoRole;
  home: string;
  organizationId: string | null;
  organizationName: string | null;
  mustChangePassword: boolean;
}

export interface InitialAccount {
  email: string;
  name: string;
  role: DemoRole;
}
