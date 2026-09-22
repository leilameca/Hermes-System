export type VehicleStatus = 'available' | 'reserved' | 'rented' | 'maintenance' | 'inactive';

export interface Vehicle {
  id: string;
  tenantId: string;
  branchId: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  category: 'sedan' | 'suv' | 'van' | 'pickup' | 'other';
  transmission: 'automatic' | 'manual';
  seats: number;
  dailyRate: number;
  currency: 'DOP' | 'USD';
  mileage: number;
  status: VehicleStatus;
  // La imagen es opcional para que una ficha funcione también sin fotografía.
  imageUrl?: string;
  imagePath?: string;
  imageAlt?: string;
}
