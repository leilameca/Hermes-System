import { Reservation } from '../../core/models';

// Fechas fijas para que la demostración sea reproducible.
export const RESERVATIONS_MOCK: readonly Reservation[] = [
  { id: 'reservation-001', tenantId: 'tenant-001', customerId: 'customer-001', vehicleId: 'vehicle-001', pickupBranchId: 'branch-001', returnBranchId: 'branch-001', startsAt: '2026-10-12T09:00:00-04:00', endsAt: '2026-10-15T09:00:00-04:00', status: 'confirmed', total: 8400, currency: 'DOP' },
  { id: 'reservation-002', tenantId: 'tenant-002', customerId: 'customer-002', vehicleId: 'vehicle-003', pickupBranchId: 'branch-002', returnBranchId: 'branch-002', startsAt: '2026-10-16T10:00:00-04:00', endsAt: '2026-10-18T10:00:00-04:00', status: 'pending', total: 8400, currency: 'DOP' },
];
