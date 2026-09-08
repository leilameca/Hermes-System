// Las fechas se guardan como texto ISO con su zona horaria.
export interface Reservation {
  id: string;
  tenantId: string;
  customerId: string;
  vehicleId: string;
  pickupBranchId: string;
  returnBranchId: string;
  startsAt: string;
  endsAt: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  total: number;
  currency: 'DOP';
}
