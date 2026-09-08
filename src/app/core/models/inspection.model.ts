export interface InspectionItem {
  name: string;
  condition: 'good' | 'damaged' | 'not-checked';
  notes?: string;
}

export interface Inspection {
  id: string;
  tenantId: string;
  rentalId: string;
  vehicleId: string;
  agentId: string;
  type: 'delivery' | 'return';
  inspectedAt: string;
  mileage: number;
  fuelLevel: 'empty' | 'quarter' | 'half' | 'three-quarters' | 'full';
  items: InspectionItem[];
  notes?: string;
}
