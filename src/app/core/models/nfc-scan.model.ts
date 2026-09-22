import { Vehicle } from './vehicle.model';

// Estados que puede informar el adaptador NFC del dispositivo.
export type HermesNfcStatus = 'ready' | 'disabled' | 'unsupported' | 'web' | 'checking';

// Resultado normalizado de una etiqueta leída por HERMES.
export interface HermesNfcScan {
  tagId: string;
  rawValue: string;
  token?: string;
  vehicleId?: string;
  vehicle?: Vehicle;
  label?: string;
  tagType?: string;
  writable?: boolean;
  maxSize?: number;
  scannedAt: string;
  valid: boolean;
}

// Resultado de la escritura de una etiqueta para fines de evidencia y auditoría.
export interface HermesNfcWriteResult {
  vehicleId: string;
  tagId: string;
  token: string;
  label: string;
  value: string;
  writtenAt: string;
}

// Asociación persistente entre una etiqueta física y un vehículo de una empresa.
// El identificador sensible del vehículo no se guarda en la tarjeta; la tarjeta
// solo contiene un token aleatorio que HERMES resuelve mediante este registro.
export interface HermesNfcBinding {
  token: string;
  tagId: string;
  tenantId: string;
  vehicleId: string;
  label: string;
  active: boolean;
  linkedAt: string;
  lastScannedAt?: string;
}
