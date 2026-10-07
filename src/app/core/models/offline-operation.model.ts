// Representa una operación guardada mientras no hay conexión
export interface OfflineOperation {
  // Identificador local de la operación
  id: string;
  // Nombre de la acción pendiente
  type: string;
  // Fecha de creación en formato ISO
  createdAt: string;
  // Estado actual dentro de la cola
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  // Datos necesarios para repetir la acción
  payload: unknown;
  // Opcionales únicamente para preservar colas antiguas sin atribuirles otra identidad.
  userId?: string;
  organizationId?: string | null;
}
