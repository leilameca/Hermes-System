import { Vehicle, VehicleStatus } from '../../core/models';
import { StatusTone } from '../components/status/status.component';

// Las etiquetas de pantalla se mantienen fuera de los modelos de negocio.
export const VEHICLE_STATUS: Record<VehicleStatus, { label: string; tone: StatusTone }> = {
  available: { label: 'Disponible', tone: 'info' },
  reserved: { label: 'Reservado', tone: 'warning' },
  rented: { label: 'En alquiler', tone: 'neutral' },
  maintenance: { label: 'En mantenimiento', tone: 'critical' },
};

export const VEHICLE_CATEGORY: Record<Vehicle['category'], string> = {
  sedan: 'Sedán',
  suv: 'SUV',
  van: 'Van',
};
