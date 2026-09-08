export type UserRole = 'client' | 'agent' | 'admin' | 'super-admin';

// El administrador general no pertenece a una empresa concreta.
export interface User {
  id: string;
  tenantId: string | null;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
}
