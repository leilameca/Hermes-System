import { Customer } from '../../core/models';

export const CUSTOMERS_MOCK: readonly Customer[] = [
  { id: 'customer-001', tenantId: 'tenant-001', userId: 'user-001', name: 'Laura Méndez', email: 'laura@example.com', phone: '809-555-0103', city: 'Santo Domingo' },
  { id: 'customer-002', tenantId: 'tenant-002', userId: 'user-005', name: 'Pedro Santos', email: 'pedro@example.com', phone: '809-555-0104', city: 'Santiago' },
];
