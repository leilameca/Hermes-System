import { Injectable, OnDestroy, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorNfc, NdefRecord, NfcEvent, NfcStatus, PluginListenerHandle } from '@capgo/capacitor-nfc';
import { BehaviorSubject } from 'rxjs';
import { HermesNfcScan, HermesNfcStatus, HermesNfcWriteResult } from '../models/nfc-scan.model';
import { AuthService } from './auth.service';
import { HermesDataService } from './hermes-data.service';
import { SupabaseService } from './supabase.service';

// Prefijo propio de HERMES. Evita confundir una etiqueta cualquiera con una etiqueta de vehículo.
const HERMES_VEHICLE_PREFIX = 'HERMES_VEHICLE:';

// Lee todas las tecnologías NFC sin FLAG_READER_SKIP_NDEF_CHECK. El valor por
// defecto del plugin omite esa comprobación y algunos Android detectan la
// etiqueta, pero no exponen su mensaje NDEF.
const ANDROID_NDEF_READER_FLAGS = 0x0f;

interface WebNdefRecord { recordType: string; data?: DataView; }
interface WebNdefEvent extends Event { serialNumber?: string; message: { records: WebNdefRecord[] }; }
interface WebNdefReader {
  scan(options?: { signal?: AbortSignal }): Promise<void>;
  write(message: string, options?: { signal?: AbortSignal }): Promise<void>;
  addEventListener(type: 'reading', listener: (event: WebNdefEvent) => void): void;
  addEventListener(type: 'readingerror', listener: () => void): void;
}
type WebNdefReaderConstructor = new () => WebNdefReader;

@Injectable({ providedIn: 'root' })
export class NfcService implements OnDestroy {
  private readonly data = inject(HermesDataService);
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService).client;
  private listener?: PluginListenerHandle;
  private stateListener?: PluginListenerHandle;
  private webAbort?: AbortController;

  private readonly statusSubject = new BehaviorSubject<HermesNfcStatus>('checking');
  private readonly scanningSubject = new BehaviorSubject(false);
  private readonly scanSubject = new BehaviorSubject<HermesNfcScan | null>(null);
  private readonly writeSubject = new BehaviorSubject<HermesNfcWriteResult | null>(null);
  private readonly errorSubject = new BehaviorSubject('');

  readonly status$ = this.statusSubject.asObservable();
  readonly scanning$ = this.scanningSubject.asObservable();
  readonly lastScan$ = this.scanSubject.asObservable();
  readonly lastWrite$ = this.writeSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();

  constructor() {
    void this.initialize();
  }

  // Comprueba si el teléfono tiene NFC y escucha cuando el usuario lo activa o desactiva.
  async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      this.statusSubject.next(this.webNfcConstructor() ? 'web-ready' : 'web');
      return;
    }

    try {
      const { status } = await CapacitorNfc.getStatus();
      this.statusSubject.next(this.mapStatus(status));
      this.stateListener ??= await CapacitorNfc.addListener('nfcStateChange', event => {
        this.statusSubject.next(this.mapStatus(event.status));
      });
    } catch (error) {
      this.statusSubject.next('unsupported');
      this.setError('No fue posible consultar el adaptador NFC del dispositivo.', error);
    }
  }

  // Inicia una sesión real de lectura y espera una etiqueta NDEF cercana.
  async startReading(): Promise<void> {
    if (!(await this.prepareSession())) return;
    if (!Capacitor.isNativePlatform()) {
      await this.startWebReading();
      return;
    }
    try {
      this.listener = await CapacitorNfc.addListener('nfcEvent', event => void this.handleRead(event));
      await CapacitorNfc.startScanning({
        invalidateAfterFirstRead: false,
        alertMessage: 'Acerca la etiqueta del vehículo al teléfono.',
        androidReaderModeFlags: ANDROID_NDEF_READER_FLAGS,
      });
      this.scanningSubject.next(true);
    } catch (error) {
      await this.stopScanning();
      this.setError('Android no pudo iniciar el lector NFC. Confirma que NFC esté encendido y vuelve a intentarlo.', error);
    }
  }

  // Prepara una etiqueta vacía o regrabable con el identificador del vehículo seleccionado.
  async startWriting(vehicleId: string): Promise<void> {
    await this.data.refresh();
    const vehicle = this.data.vehicles().find(item => item.id === vehicleId);
    if (!vehicle) {
      this.errorSubject.next('El vehículo seleccionado no existe en Supabase.');
      return;
    }
    if (!(await this.prepareSession())) return;

    const value = HERMES_VEHICLE_PREFIX + vehicleId;
    if (!Capacitor.isNativePlatform()) {
      try {
        const Reader = this.webNfcConstructor()!;
        const writer = new Reader();
        await writer.write(value);
        await this.persistAssignment(vehicleId, value);
        this.writeSubject.next({ vehicleId, value, writtenAt: new Date().toISOString() });
      } catch (error) {
        this.setError('El navegador no pudo escribir la etiqueta. Mantén la página visible y acerca una etiqueta NDEF regrabable.', error);
      }
      return;
    }

    let writing = false;
    try {
      this.listener = await CapacitorNfc.addListener('nfcEvent', async event => {
        // Algunos teléfonos emiten más de un evento por acercamiento; esta bandera evita escrituras duplicadas.
        if (writing) return;
        writing = true;
        try {
          await CapacitorNfc.write({ records: [this.createTextRecord(value)], allowFormat: true });
          await this.persistAssignment(vehicleId, value, this.bytesToHex(event.tag.id ?? []));
          this.writeSubject.next({ vehicleId, value, writtenAt: new Date().toISOString() });
          this.errorSubject.next('');
          await this.stopScanning();
        } catch (error) {
          writing = false;
          this.setError('No se pudo escribir la etiqueta. Comprueba que sea regrabable y vuelve a acercarla.', error);
        }
      });

      await CapacitorNfc.startScanning({
        invalidateAfterFirstRead: false,
        alertMessage: 'Acerca la etiqueta que deseas asignar al vehículo.',
        androidReaderModeFlags: ANDROID_NDEF_READER_FLAGS,
      });
      this.scanningSubject.next(true);
    } catch (error) {
      await this.stopScanning();
      this.setError('Android no pudo preparar la escritura NFC. Activa NFC y vuelve a intentarlo.', error);
    }
  }

  async stopScanning(): Promise<void> {
    this.webAbort?.abort();
    this.webAbort = undefined;
    if (!Capacitor.isNativePlatform()) {
      this.scanningSubject.next(false);
      return;
    }
    try {
      await CapacitorNfc.stopScanning();
    } catch {
      // Detener una sesión que el sistema ya cerró no debe bloquear la pantalla.
    }
    await this.listener?.remove();
    this.listener = undefined;
    this.scanningSubject.next(false);
  }

  async openSettings(): Promise<void> {
    if (Capacitor.isNativePlatform()) await CapacitorNfc.showSettings();
  }

  clearResult(): void {
    this.scanSubject.next(null);
    this.writeSubject.next(null);
    this.errorSubject.next('');
  }

  private async prepareSession(): Promise<boolean> {
    this.clearResult();
    await this.stopScanning();
    await this.initialize();
    if (this.statusSubject.value === 'disabled') {
      this.errorSubject.next('El NFC está desactivado. Actívalo en los ajustes del teléfono.');
      return false;
    }
    if (!['ready', 'web-ready'].includes(this.statusSubject.value)) {
      this.errorSubject.next('NFC no está disponible en este dispositivo. Usa Chrome en Android o la aplicación instalada.');
      return false;
    }
    return true;
  }

  private async handleRead(event: NfcEvent): Promise<void> {
    const record = event.tag.ndefMessage?.[0];
    const rawValue = record ? this.readTextRecord(record) : '';
    const vehicleId = rawValue.startsWith(HERMES_VEHICLE_PREFIX)
      ? rawValue.slice(HERMES_VEHICLE_PREFIX.length).trim()
      : undefined;
    const baseScan: HermesNfcScan = {
      tagId: this.bytesToHex(event.tag.id ?? []),
      rawValue,
      vehicleId,
      scannedAt: new Date().toISOString(),
      valid: false,
    };
    // Confirma inmediatamente la lectura física; Supabase se consulta después.
    this.scanSubject.next(baseScan);
    await this.resolveVehicle(baseScan);
    await this.stopScanning();
  }

  private async startWebReading(): Promise<void> {
    const Reader = this.webNfcConstructor();
    if (!Reader) return;
    try {
      this.webAbort = new AbortController();
      const reader = new Reader();
      reader.addEventListener('readingerror', () => this.errorSubject.next('La etiqueta no contiene un mensaje NDEF que HERMES pueda leer.'));
      reader.addEventListener('reading', event => void this.handleWebRead(event));
      await reader.scan({ signal: this.webAbort.signal });
      this.scanningSubject.next(true);
    } catch (error) {
      this.scanningSubject.next(false);
      this.setError('Chrome no pudo iniciar la lectura NFC. Confirma el permiso y que NFC esté activado.', error);
    }
  }

  private async handleWebRead(event: WebNdefEvent): Promise<void> {
    const record = event.message.records[0];
    const rawValue = record?.data ? this.decodeWebRecord(record.data) : '';
    const vehicleId = rawValue.startsWith(HERMES_VEHICLE_PREFIX) ? rawValue.slice(HERMES_VEHICLE_PREFIX.length).trim() : undefined;
    const tagId = event.serialNumber || 'No disponible en Web NFC';
    const baseScan: HermesNfcScan = { tagId, rawValue, vehicleId, scannedAt: new Date().toISOString(), valid: false };
    this.scanSubject.next(baseScan);
    await this.resolveVehicle(baseScan);
    await this.stopScanning();
  }

  private decodeWebRecord(data: DataView): string {
    return new TextDecoder().decode(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
  }

  private async resolveVehicle(scan: HermesNfcScan): Promise<void> {
    if (!scan.rawValue) {
      this.errorSubject.next('La etiqueta fue detectada, pero no contiene un texto NDEF de HERMES. Puedes asignarla desde esta pantalla.');
      return;
    }
    if (!scan.vehicleId) {
      this.errorSubject.next('La etiqueta fue leída, pero no tiene el formato HERMES esperado.');
      return;
    }

    await this.data.refresh();
    if (this.data.error()) {
      this.errorSubject.next('La etiqueta NFC se leyó correctamente, pero no fue posible consultar los vehículos en Supabase. Revisa la conexión del proyecto.');
      return;
    }

    const vehicle = this.data.vehicles().find(item => item.id === scan.vehicleId);
    this.scanSubject.next({ ...scan, vehicle: vehicle ? { ...vehicle } : undefined, valid: Boolean(vehicle) });
    if (!vehicle) {
      this.errorSubject.next('La etiqueta se leyó, pero apunta a un vehículo que no existe en el Supabase conectado. Vuelve a asignar la etiqueta.');
      return;
    }

    this.errorSubject.next('');
    await this.persistScan(vehicle.id, scan.rawValue, scan.tagId);
  }

  private webNfcConstructor(): WebNdefReaderConstructor | null {
    return (window as unknown as { NDEFReader?: WebNdefReaderConstructor }).NDEFReader ?? null;
  }

  private async persistAssignment(vehicleId: string, token: string, physicalTagId?: string): Promise<void> {
    const user = this.auth.user();
    if (!user?.organizationId) throw new Error('La sesión no está vinculada a una empresa.');
    const { data: tag, error } = await this.supabase.from('nfc_tags').upsert({
      organization_id: user.organizationId,
      vehicle_id: vehicleId,
      token,
      physical_tag_id: physicalTagId && physicalTagId !== 'No disponible' ? physicalTagId : null,
      label: `Etiqueta ${token.slice(-8)}`,
      active: true,
      assigned_by: user.id,
      assigned_at: new Date().toISOString(),
    }, { onConflict: 'organization_id,vehicle_id' }).select('id').single();
    if (error) throw new Error(error.message);
    const { error: eventError } = await this.supabase.from('nfc_events').insert({
      organization_id: user.organizationId, nfc_tag_id: tag.id, vehicle_id: vehicleId, user_id: user.id, event_type: 'assigned',
    });
    if (eventError) throw new Error(eventError.message);
  }

  private async persistScan(vehicleId: string, token: string, physicalTagId: string): Promise<void> {
    const user = this.auth.user();
    const vehicle = this.data.vehicles().find(item => item.id === vehicleId);
    if (!user || !vehicle) return;
    const { data: tag } = await this.supabase.from('nfc_tags').select('id').eq('token', token).maybeSingle();
    if (tag?.id) await this.supabase.from('nfc_tags').update({ last_scanned_at: new Date().toISOString() }).eq('id', tag.id);
    const { error } = await this.supabase.from('nfc_events').insert({
      organization_id: vehicle.tenantId, nfc_tag_id: tag?.id ?? null, vehicle_id: vehicleId, user_id: user.id,
      event_type: 'scanned', notes: `Etiqueta física: ${physicalTagId}`,
    });
    if (error) console.error('[Hermes NFC] No se pudo guardar el evento', error);
  }

  private createTextRecord(value: string): NdefRecord {
    const language = Array.from(new TextEncoder().encode('es'));
    const text = Array.from(new TextEncoder().encode(value));
    return { tnf: 0x01, type: [0x54], id: [], payload: [language.length & 0x3f, ...language, ...text] };
  }

  private readTextRecord(record: NdefRecord): string {
    // Un registro de texto NDEF empieza con un byte de estado y el código del idioma.
    if (record.tnf !== 0x01 || record.type[0] !== 0x54 || !record.payload.length) return '';
    const languageLength = record.payload[0] & 0x3f;
    return new TextDecoder().decode(new Uint8Array(record.payload.slice(1 + languageLength)));
  }

  private bytesToHex(bytes: number[]): string {
    return bytes.map(value => value.toString(16).padStart(2, '0')).join(':').toUpperCase() || 'No disponible';
  }

  private mapStatus(status: NfcStatus): HermesNfcStatus {
    if (status === 'NFC_OK') return 'ready';
    if (status === 'NFC_DISABLED' || status === 'NDEF_PUSH_DISABLED') return 'disabled';
    return 'unsupported';
  }

  private setError(message: string, error: unknown): void {
    console.error('[Hermes NFC]', error);
    this.errorSubject.next(message);
  }

  ngOnDestroy(): void {
    void this.stopScanning();
    void this.stateListener?.remove();
  }
}
