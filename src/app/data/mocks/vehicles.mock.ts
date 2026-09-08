import { Vehicle } from '../../core/models';

// Las placas y las tarifas son ficticias; los importes están en pesos dominicanos.
export const VEHICLES_MOCK: readonly Vehicle[] = [
  { id: 'vehicle-001', tenantId: 'tenant-001', branchId: 'branch-001', brand: 'Toyota', model: 'Corolla', year: 2024, plate: 'A987601', category: 'sedan', transmission: 'automatic', seats: 5, dailyRate: 2800, currency: 'DOP', mileage: 24500, status: 'reserved', imageUrl: 'assets/images/vehicles/corolla.jpg', imageAlt: 'Toyota Corolla blanco, vista frontal de tres cuartos. Imagen ilustrativa.' },
  { id: 'vehicle-002', tenantId: 'tenant-001', branchId: 'branch-001', brand: 'Hyundai', model: 'Tucson', year: 2025, plate: 'G987602', category: 'suv', transmission: 'automatic', seats: 5, dailyRate: 4500, currency: 'DOP', mileage: 12600, status: 'available', imageUrl: 'assets/images/vehicles/tucson.jpg', imageAlt: 'Hyundai Tucson gris grafito, vista frontal de tres cuartos. Imagen ilustrativa.' },
  { id: 'vehicle-003', tenantId: 'tenant-002', branchId: 'branch-002', brand: 'Kia', model: 'Sportage', year: 2024, plate: 'G987603', category: 'suv', transmission: 'automatic', seats: 5, dailyRate: 4200, currency: 'DOP', mileage: 18200, status: 'reserved', imageUrl: 'assets/images/vehicles/sportage.jpg', imageAlt: 'Kia Sportage plateado, vista frontal de tres cuartos. Imagen ilustrativa.' },
];
