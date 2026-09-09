import { Injectable, inject } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { BehaviorSubject } from 'rxjs';
import { OfflineOperation } from '../models/offline-operation.model';

// Claves usadas para guardar la cola y la última sincronización
const QUEUE_KEY = 'hermes.offline.queue';
const LAST_SYNC_KEY = 'hermes.offline.lastSync';

@Injectable({ providedIn: 'root' })
export class OfflineService {
  // Abre el almacenamiento local de Ionic
  private readonly storage = inject(Storage);
  private readonly ready = this.storage.create();

  // Mantiene el contador y la fecha disponibles para la interfaz
  private readonly pendingCountSubject = new BehaviorSubject<number>(0);
  private readonly lastSyncSubject = new BehaviorSubject<string>('');

  readonly pendingCount$ = this.pendingCountSubject.asObservable();
  readonly lastSync$ = this.lastSyncSubject.asObservable();

  constructor() {
    // Recupera el estado guardado al iniciar
    void this.refreshState();
  }

  async savePendingOperation(type: string, payload: unknown) {
    // Agrega una operación nueva a la cola local
    const operation = this.createOperation(type, payload, 'pending');
    const operations = await this.getPendingOperations();
    await this.setQueue([...operations, operation]);
    return operation;
  }

  async sendOperation(type: string, payload: unknown) {
    // Simula el envío inmediato cuando existe conexión
    const operation = this.createOperation(type, payload, 'syncing');
    await this.syncOperation(operation);
    const syncedAt = new Date().toISOString();
    await this.ready;
    await this.storage.set(LAST_SYNC_KEY, syncedAt);
    this.lastSyncSubject.next(syncedAt);
    return { ...operation, status: 'synced' as const };
  }

  async getPendingOperations() {
    // Lee todas las operaciones guardadas
    await this.ready;
    return ((await this.storage.get(QUEUE_KEY)) ?? []) as OfflineOperation[];
  }

  async getPendingCount() {
    // Cuenta las operaciones que todavía no se sincronizan
    const count = (await this.getPendingOperations()).filter(operation => operation.status !== 'synced').length;
    this.pendingCountSubject.next(count);
    return count;
  }

  async syncPendingOperations() {
    // Busca operaciones pendientes o fallidas
    const operations = await this.getPendingOperations();
    const syncable = operations.filter(operation => operation.status === 'pending' || operation.status === 'failed');
    if (!syncable.length) return;

    for (const operation of syncable) {
      // Procesa cada operación de forma individual
      await this.updateOperation({ ...operation, status: 'syncing' });
      try {
        await this.syncOperation(operation);
        await this.updateOperation({ ...operation, status: 'synced' });
        await this.removeSyncedOperation(operation.id);
      } catch (error) {
        console.error('[Hermes] No se pudo sincronizar la operacion local', error);
        await this.updateOperation({ ...operation, status: 'failed' });
      }
    }

    const syncedAt = new Date().toISOString();
    // Guarda la fecha del último proceso terminado
    await this.storage.set(LAST_SYNC_KEY, syncedAt);
    this.lastSyncSubject.next(syncedAt);
    await this.getPendingCount();
  }

  async removeSyncedOperation(id: string) {
    // Quita de la cola una operación completada
    const operations = await this.getPendingOperations();
    await this.setQueue(operations.filter(operation => operation.id !== id || operation.status !== 'synced'));
  }

  async syncOperation(operation: OfflineOperation) {
    // TODO Backend reemplazar esta simulación por POST real a la API REST
    await new Promise(resolve => setTimeout(resolve, 450));
    console.log('[Hermes] Operacion sincronizada', operation.type, operation.payload);
  }

  private async updateOperation(updated: OfflineOperation) {
    // Cambia el estado de una operación guardada
    const operations = await this.getPendingOperations();
    await this.setQueue(operations.map(operation => operation.id === updated.id ? updated : operation));
  }

  private async setQueue(operations: OfflineOperation[]) {
    // Guarda la cola completa y actualiza el contador
    await this.ready;
    await this.storage.set(QUEUE_KEY, operations);
    this.pendingCountSubject.next(operations.filter(operation => operation.status !== 'synced').length);
  }

  private async refreshState() {
    // Recupera el contador y la última sincronización
    await this.getPendingCount();
    await this.ready;
    this.lastSyncSubject.next((await this.storage.get(LAST_SYNC_KEY)) ?? '');
  }

  private createId() {
    // Genera un identificador local único
    return crypto.randomUUID?.() ?? 'offline-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }

  private createOperation(type: string, payload: unknown, status: OfflineOperation['status']): OfflineOperation {
    // Construye el registro que se guarda en la cola
    return {
      id: this.createId(),
      type,
      createdAt: new Date().toISOString(),
      status,
      payload,
    };
  }
}
