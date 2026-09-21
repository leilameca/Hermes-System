import { Injectable, OnDestroy } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorNfc, NdefRecord, NfcEvent, NfcStatus, PluginListenerHandle } from '@capgo/capacitor-nfc';
import { BehaviorSubject } from 'rxjs';
import { VEHICLES_MOCK } from '../../data/mocks/vehicles.mock';
import { HermesNfcScan, HermesNfcStatus, HermesNfcWriteResult } from '../models/nfc-scan.model';

// Prefijo propio de HERMES. Evita confundir una etiqueta cualquiera con una etiqueta de vehículo.
const HERMES_VEHICLE_PREFIX = 'HERMES_VEHICLE:';

@Injectable({ providedIn: 'root' })
export class NfcService implements OnDestroy {
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

  constructor() {
    void this.initialize();
  }

  // Comprueba si el teléfono tiene NFC y escucha cuando el usuario lo activa o desactiva.
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

  // Inicia una sesión real de lectura y espera una etiqueta NDEF cercana.
  async startReading(): Promise<void> {
    if (!(await this.prepareSession())) return;
    this.listener = await CapacitorNfc.addListener('nfcEvent', event => this.handleRead(event));
    await CapacitorNfc.startScanning({
      invalidateAfterFirstRead: false,
      alertMessage: 'Acerca la etiqueta del vehículo al teléfono.',
    });
    this.scanningSubject.next(true);
  }

  // Prepara una etiqueta vacía o regrabable con el identificador del vehículo seleccionado.
  async startWriting(vehicleId: string): Promise<void> {
    const vehicle = VEHICLES_MOCK.find(item => item.id === vehicleId);
    if (!vehicle) {
      this.errorSubject.next('El vehículo seleccionado no existe en el catálogo local.');
      return;
    }
    if (!(await this.prepareSession())) return;

    let writing = false;
    this.listener = await CapacitorNfc.addListener('nfcEvent', async () => {
      // Algunos teléfonos emiten más de un evento por acercamiento; esta bandera evita escrituras duplicadas.
      if (writing) return;
      writing = true;
      const value = HERMES_VEHICLE_PREFIX + vehicleId;
      try {
        await CapacitorNfc.write({ records: [this.createTextRecord(value)], allowFormat: true });
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
    });
    this.scanningSubject.next(true);
  }

  async stopScanning(): Promise<void> {
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
    if (this.statusSubject.value !== 'ready') {
      this.errorSubject.next('La lectura NFC solo está disponible en un teléfono compatible con la aplicación instalada.');
      return false;
    }
    return true;
  }

  private handleRead(event: NfcEvent): void {
    const record = event.tag.ndefMessage?.[0];
    const rawValue = record ? this.readTextRecord(record) : '';
    const vehicleId = rawValue.startsWith(HERMES_VEHICLE_PREFIX)
      ? rawValue.slice(HERMES_VEHICLE_PREFIX.length).trim()
      : undefined;
    const vehicle = vehicleId ? VEHICLES_MOCK.find(item => item.id === vehicleId) : undefined;

    this.scanSubject.next({
      tagId: this.bytesToHex(event.tag.id ?? []),
      rawValue,
      vehicleId,
      vehicle: vehicle ? { ...vehicle } : undefined,
      scannedAt: new Date().toISOString(),
      valid: Boolean(vehicleId && vehicle),
    });
    this.errorSubject.next(vehicle ? '' : 'La etiqueta fue leída, pero no corresponde a un vehículo registrado en HERMES.');
    void this.stopScanning();
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
