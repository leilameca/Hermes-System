export type VehicleStatus = 'available' | 'reserved' | 'rented' | 'maintenance';

export interface Vehicle {
  id: string;
  tenantId: string;
  branchId: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  category: 'sedan' | 'suv' | 'van';
  transmission: 'automatic' | 'manual';
  seats: number;
  dailyRate: number;
  currency: 'DOP';
  mileage: number;
  status: VehicleStatus;
  // La imagen es opcional para que una ficha funcione también sin fotografía.
  imageUrl?: string;
  imageAlt?: string;
}
