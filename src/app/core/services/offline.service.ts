import { Injectable, effect, inject } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { BehaviorSubject } from 'rxjs';
import { OfflineOperation } from '../models/offline-operation.model';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

const QUEUE_KEY = 'hermes.offline.queue';

@Injectable({ providedIn: 'root' })
export class OfflineService {
  private readonly storage = inject(Storage);
  private readonly supabase = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);
  private readonly ready = this.storage.create();
  private writes: Promise<unknown> = Promise.resolve();
  private synchronization?: Promise<void>;
  private readonly pendingCountSubject = new BehaviorSubject<number>(0);
  private readonly lastSyncSubject = new BehaviorSubject<string>('');
  readonly pendingCount$ = this.pendingCountSubject.asObservable();
  readonly lastSync$ = this.lastSyncSubject.asObservable();

  constructor() {
    effect(() => {
      const user = this.auth.user();
      this.pendingCountSubject.next(0); this.lastSyncSubject.next('');
      if (user) void this.refreshState().then(async () => {
        if (navigator.onLine) await this.syncPendingOperations();
      }).catch(error => console.error('[Hermes] Cola local', error));
    });
  }

  async savePendingOperation(type: string, payload: unknown) {
    const operation = this.createOperation(type, payload);
    await this.mutateQueue(rows => [...rows, operation]);
    return operation;
  }

  async sendOperation(type: string, payload: unknown) {
    // Primero persiste: un fallo de red no pierde la operación.
    const operation = await this.savePendingOperation(type, payload);
    await this.syncPendingOperations();
    if (!this.owns(operation)) throw new Error('La sesión cambió. La operación conserva su cuenta original.');
    const pending = (await this.getPendingOperations()).find(row => row.id === operation.id);
    if (pending) throw new Error('Operación guardada en este dispositivo, pendiente de sincronización.');
    return { ...operation, status: 'synced' as const };
  }

  async getPendingOperations(): Promise<OfflineOperation[]> {
    await this.ready; await this.writes;
    const rows = ((await this.storage.get(QUEUE_KEY)) ?? []) as OfflineOperation[];
    return rows.filter(row => this.owns(row));
  }

  async getPendingCount() {
    const count = (await this.getPendingOperations()).filter(row => row.status !== 'synced').length;
    this.pendingCountSubject.next(count); return count;
  }

  syncPendingOperations(): Promise<void> {
    if (this.synchronization) return this.synchronization;
    this.synchronization = this.syncQueue().finally(() => { this.synchronization = undefined; });
    return this.synchronization;
  }

  private async syncQueue() {
    const user = this.auth.user();
    if (!user) return;
    const operations = await this.getPendingOperations();
    let synced = false;
    for (const operation of operations) {
      // Operaciones antiguas de otras cuentas se conservan sin atribuirlas a la sesión actual.
      if (!this.owns(operation)) break;
      try {
        await this.updateOperation({ ...operation, status: 'syncing' });
        await this.syncOperation(operation);
        await this.mutateQueue(rows => rows.filter(row => row.id !== operation.id));
        synced = true;
      } catch (error) {
        await this.updateOperation({ ...operation, status: 'failed' });
        console.error('[Hermes] No se pudo sincronizar', error);
      }
    }
    if (synced) {
      const time = new Date().toISOString();
      await this.storage.set(`hermes.offline.lastSync.${user.id}`, time);
      if (this.auth.user()?.id === user.id) this.lastSyncSubject.next(time);
    }
    await this.getPendingCount();
  }

  async removeSyncedOperation(id: string) {
    await this.mutateQueue(rows => rows.filter(row => !(row.id === id && row.status === 'synced' && this.owns(row))));
  }

  async syncOperation(operation: OfflineOperation) {
    if (!this.owns(operation)) throw new Error('La operación pertenece a otra sesión o no tiene autor verificable.');
    if (operation.type === 'inspection.nfc.saved') {
      const payload = operation.payload as { vehicleId: string; checklist?: string[]; createdAt?: string; tagId?: string };
      const { data: vehicle, error: vehicleError } = await this.supabase.from('vehicles').select('organization_id, mileage').eq('id', payload.vehicleId).single();
      if (vehicleError) throw new Error(vehicleError.message);
      if (!this.owns(operation)) throw new Error('La sesión cambió antes de sincronizar.');
      if (operation.organizationId && vehicle.organization_id !== operation.organizationId) throw new Error('El vehículo no pertenece a la empresa de la operación.');
      const { error } = await this.supabase.from('inspections').insert({
        id: operation.id, organization_id: vehicle.organization_id, vehicle_id: payload.vehicleId,
        agent_id: operation.userId, inspection_type: 'general', status: 'completed', mileage: vehicle.mileage,
        fuel_level: 'three_quarters', checklist: (payload.checklist ?? []).map(name => ({ name, checked: true })),
        notes: `Inspección iniciada por NFC. Etiqueta: ${payload.tagId ?? 'no disponible'}`,
        inspected_at: payload.createdAt ?? operation.createdAt,
      });
      await this.checkInsert(error, 'inspections', operation.id, 'agent_id', operation.userId!);
      return;
    }
    if (operation.type === 'incident.reported') {
      const payload = operation.payload as { detail: string };
      let organizationId = operation.organizationId;
      let customerId: string | null = null;
      if (this.auth.user()?.role === 'cliente') {
        const { data: account, error } = await this.supabase.from('customer_accounts').select('organization_id, customer_id').eq('user_id', operation.userId!).eq('active', true).single();
        if (error) throw new Error(error.message);
        organizationId = account.organization_id; customerId = account.customer_id;
      }
      if (!this.owns(operation)) throw new Error('La sesión cambió antes de sincronizar.');
      const { error } = await this.supabase.from('incidents').insert({
        id: operation.id, organization_id: organizationId, customer_id: customerId,
        reported_by: operation.userId, title: 'Incidente reportado desde HERMES', description: payload.detail,
      });
      await this.checkInsert(error, 'incidents', operation.id, 'reported_by', operation.userId!);
      return;
    }
    throw new Error(`Tipo de operación no reconocido: ${operation.type}`);
  }

  private async checkInsert(error: { code?: string; message: string } | null, table: string, id: string, ownerColumn: string, ownerId: string) {
    if (!error) return;
    // Si el servidor guardó el registro pero se perdió la respuesta, el reintento usa el mismo UUID.
    if (error.code === '23505') {
      const result = await this.supabase.from(table).select('id').eq('id', id).eq(ownerColumn, ownerId).maybeSingle();
      if (!result.error && result.data) return;
    }
    throw new Error(error.message);
  }

  private owns(operation: OfflineOperation) {
    const user = this.auth.user();
    return Boolean(user && operation.userId === user.id && operation.organizationId === user.organizationId);
  }
  private updateOperation(updated: OfflineOperation) { return this.mutateQueue(rows => rows.map(row => row.id === updated.id ? updated : row)); }
  private mutateQueue(update: (rows: OfflineOperation[]) => OfflineOperation[]) {
    const operation = this.writes.then(async () => {
      await this.ready;
      const rows = update((await this.storage.get(QUEUE_KEY)) ?? []);
      await this.storage.set(QUEUE_KEY, rows);
      this.pendingCountSubject.next(rows.filter(row => this.owns(row) && row.status !== 'synced').length);
    });
    this.writes = operation.catch(() => undefined);
    return operation;
  }
  private async refreshState() {
    const user = this.auth.user();
    if (!user) return;
    await this.getPendingCount(); await this.ready;
    const time = (await this.storage.get(`hermes.offline.lastSync.${user.id}`)) ?? '';
    if (this.auth.user()?.id === user.id) this.lastSyncSubject.next(time);
  }
  private createOperation(type: string, payload: unknown): OfflineOperation {
    const user = this.auth.user();
    if (!user) throw new Error('Inicia sesión para guardar esta operación.');
    return { id: crypto.randomUUID(), type, createdAt: new Date().toISOString(), status: 'pending', payload, userId: user.id, organizationId: user.organizationId };
  }
}
