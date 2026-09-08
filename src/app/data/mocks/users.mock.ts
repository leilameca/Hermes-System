import { User } from '../../core/models';

// No se guardan contraseñas ni credenciales.
export const USERS_MOCK: readonly User[] = [
  { id: 'user-001', tenantId: 'tenant-001', name: 'Laura Méndez', email: 'laura@example.com', role: 'client', active: true },
  { id: 'user-002', tenantId: 'tenant-001', name: 'Carlos Peña', email: 'carlos@example.com', role: 'agent', active: true },
  { id: 'user-003', tenantId: 'tenant-001', name: 'Ana Rosario', email: 'ana@example.com', role: 'admin', active: true },
  { id: 'user-004', tenantId: null, name: 'Marcos Díaz', email: 'marcos@example.com', role: 'super-admin', active: true },
  { id: 'user-005', tenantId: 'tenant-002', name: 'Pedro Santos', email: 'pedro@example.com', role: 'client', active: true },
];
