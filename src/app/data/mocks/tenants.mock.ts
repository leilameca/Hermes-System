import { Tenant } from '../../core/models';

// Empresas ficticias para la demostración.
export const TENANTS_MOCK: readonly Tenant[] = [
  { id: 'tenant-001', name: 'Quisqueya Rent-a-Car', city: 'Santo Domingo', phone: '809-555-0101', email: 'info@quisqueya.example', active: true },
  { id: 'tenant-002', name: 'Cibao Auto Rental', city: 'Santiago', phone: '809-555-0102', email: 'info@cibao.example', active: true },
];
