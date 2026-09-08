export interface Incident {
  id: string;
  tenantId: string;
  vehicleId: string;
  rentalId?: string;
  reportedByUserId: string;
  reportedAt: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  status: 'open' | 'in-review' | 'resolved';
}
