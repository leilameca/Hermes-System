import { Injectable, OnDestroy, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorNfc, NdefRecord, NfcEvent, NfcStatus, PluginListenerHandle } from '@capgo/capacitor-nfc';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { HermesNfcScan, HermesNfcStatus, HermesNfcWriteResult } from '../models/nfc-scan.model';
import { NfcRegistryService } from './nfc-registry.service';
import { VehicleService } from './vehicle.service';

const HERMES_TOKEN_PREFIX = 'HERMES:V1:';
const LEGACY_VEHICLE_PREFIX = 'HERMES_VEHICLE:';

// Android reader-mode flags: NFC-A, NFC-B, NFC-F, NFC-V y sonido del sistema
// desactivado. Es importante no incluir FLAG_READER_SKIP_NDEF_CHECK (0x80):
// la versión 7 del plugin lo activa por defecto y entonces Android detecta la
// NTAG, pero no expone Ndef/NdefFormatable para poder escribirla.
const ANDROID_NDEF_READER_FLAGS = 0x10f;

@Injectable({ providedIn: 'root' })
export class NfcService implements OnDestroy {
  private readonly registry = inject(NfcRegistryService);
  private readonly vehicles = inject(VehicleService);
  private listener?: PluginListenerHandle;
  private stateListener?: PluginListenerHandle;

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

  constructor() { void this.initialize(); }

  async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      this.statusSubject.next('web');
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

  async startReading(): Promise<void> {
    if (!(await this.prepareSession())) return;
    let processing = false;
    this.listener = await CapacitorNfc.addListener('nfcEvent', async event => {
      if (processing) return;
      processing = true;
      await this.handleRead(event);
    });
    await CapacitorNfc.startScanning({
      invalidateAfterFirstRead: false,
      androidReaderModeFlags: ANDROID_NDEF_READER_FLAGS,
      alertMessage: 'Acerca la etiqueta del vehículo al teléfono.',
    });
    this.scanningSubject.next(true);
  }

  async startWriting(vehicleId: string, label: string): Promise<void> {
    const vehicle = await firstValueFrom(this.vehicles.getById(vehicleId));
    if (!vehicle) {
      this.errorSubject.next('El vehículo seleccionado no existe en la flota.');
      return;
    }
    if (!(await this.prepareSession())) return;

    const token = this.createToken();
    const value = HERMES_TOKEN_PREFIX + token;
    let writing = false;
    this.listener = await CapacitorNfc.addListener('nfcEvent', async event => {
      if (writing) return;
      writing = true;
      const tagId = this.bytesToHex(event.tag.id ?? []);
      if (event.tag.isWritable === false) {
        this.errorSubject.next('La etiqueta está protegida contra escritura. Utiliza otra etiqueta regrabable.');
        await this.stopScanning();
        return;
      }

      try {
        await CapacitorNfc.write({ records: [this.createTextRecord(value)], allowFormat: true });
        const finalLabel = label.trim() || `${vehicle.brand} ${vehicle.model} · ${vehicle.plate}`;
        await this.registry.link({
          token,
          tagId,
          tenantId: vehicle.tenantId,
          vehicleId,
          label: finalLabel,
        });
        this.writeSubject.next({ vehicleId, tagId, token, label: finalLabel, value, writtenAt: new Date().toISOString() });
        this.errorSubject.next('');
        await this.stopScanning();
      } catch (error) {
        writing = false;
        this.setError('No se pudo escribir la etiqueta. Mantenla inmóvil sobre el lector y vuelve a intentarlo.', error);
      }
    });

    await CapacitorNfc.startScanning({
      invalidateAfterFirstRead: false,
      androidReaderModeFlags: ANDROID_NDEF_READER_FLAGS,
      alertMessage: 'Mantén la etiqueta sobre el teléfono hasta confirmar la escritura.',
    });
    this.scanningSubject.next(true);
  }

  async stopScanning(): Promise<void> {
    try { await CapacitorNfc.stopScanning(); } catch { /* La sesión ya puede estar cerrada. */ }
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
    if (this.statusSubject.value !== 'ready') {
      this.errorSubject.next('El NFC requiere la aplicación instalada en un teléfono compatible.');
      return false;
    }
    return true;
  }

  private async handleRead(event: NfcEvent): Promise<void> {
    const tagId = this.bytesToHex(event.tag.id ?? []);
    const values = (event.tag.ndefMessage ?? []).map(record => this.readTextRecord(record)).filter(Boolean);
    const rawValue = values.find(value => value.startsWith(HERMES_TOKEN_PREFIX) || value.startsWith(LEGACY_VEHICLE_PREFIX)) ?? values[0] ?? '';
    const token = rawValue.startsWith(HERMES_TOKEN_PREFIX) ? rawValue.slice(HERMES_TOKEN_PREFIX.length).trim() : undefined;
    const legacyVehicleId = rawValue.startsWith(LEGACY_VEHICLE_PREFIX) ? rawValue.slice(LEGACY_VEHICLE_PREFIX.length).trim() : undefined;
    const binding = token ? await this.registry.findByToken(token) : await this.registry.findByTagId(tagId);
    const vehicleId = binding?.vehicleId ?? legacyVehicleId;
    const vehicle = vehicleId ? await firstValueFrom(this.vehicles.getById(vehicleId)) : undefined;
    const scannedAt = new Date().toISOString();

    if (token && binding) await this.registry.markScanned(token, scannedAt);
    this.scanSubject.next({
      tagId,
      rawValue,
      token,
      vehicleId,
      vehicle,
      label: binding?.label,
      tagType: event.tag.type ?? undefined,
      writable: event.tag.isWritable ?? undefined,
      maxSize: event.tag.maxSize ?? undefined,
      scannedAt,
      valid: Boolean(vehicleId && vehicle),
    });

    if (vehicle) this.errorSubject.next('');
    else if (!rawValue) this.errorSubject.next('La tarjeta fue detectada, pero está vacía. Asígnala primero a un vehículo.');
    else this.errorSubject.next('La tarjeta contiene datos, pero no está vinculada con un vehículo activo de HERMES.');
    await this.stopScanning();
  }

  private createTextRecord(value: string): NdefRecord {
    const language = Array.from(new TextEncoder().encode('es'));
    const text = Array.from(new TextEncoder().encode(value));
    return { tnf: 0x01, type: [0x54], id: [], payload: [language.length & 0x3f, ...language, ...text] };
  }

  private readTextRecord(record: NdefRecord): string {
    if (record.tnf !== 0x01 || record.type[0] !== 0x54 || !record.payload.length) return '';
    const languageLength = record.payload[0] & 0x3f;
    return new TextDecoder().decode(new Uint8Array(record.payload.slice(1 + languageLength)));
  }

  private createToken(): string {
    return crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
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
