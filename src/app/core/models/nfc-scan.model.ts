import { Vehicle } from './vehicle.model';

// Estados que puede informar el adaptador NFC del dispositivo.
export type HermesNfcStatus = 'ready' | 'web-ready' | 'disabled' | 'unsupported' | 'web' | 'checking';

// Resultado normalizado de una etiqueta leída por HERMES.
export interface HermesNfcScan {
  tagId: string;
  rawValue: string;
  vehicleId?: string;
  vehicle?: Vehicle;
  scannedAt: string;
  valid: boolean;
}

// Resultado de la escritura de una etiqueta para fines de evidencia y auditoría.
export interface HermesNfcWriteResult {
  vehicleId: string;
  value: string;
  writtenAt: string;
}
