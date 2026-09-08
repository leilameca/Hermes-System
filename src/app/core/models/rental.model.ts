export interface Rental {
  id: string;
  tenantId: string;
  reservationId: string;
  customerId: string;
  vehicleId: string;
  deliveredAt: string;
  expectedReturnAt: string;
  returnedAt?: string;
  startMileage: number;
  endMileage?: number;
  status: 'active' | 'completed';
}
