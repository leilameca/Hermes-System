import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { radioOutline, scanOutline, stopCircleOutline } from 'ionicons/icons';
import { NetworkService } from '../../core/services/network.service';
import { NfcService } from '../../core/services/nfc.service';
import { OfflineService } from '../../core/services/offline.service';
import { VehicleService } from '../../core/services/vehicle.service';
import { VehicleImageComponent } from '../../shared/components/vehicle-image/vehicle-image.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-nfc',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, IonButton, IonContent, IonIcon, IonSelect, IonSelectOption, VehicleImageComponent],
  templateUrl: './nfc.page.html',
  styleUrl: './nfc.page.scss',
})
export class NfcPage {
  private readonly nfc = inject(NfcService);
  private readonly network = inject(NetworkService);
  private readonly offline = inject(OfflineService);
  private readonly auth = inject(AuthService);

  readonly vehicles = toSignal(inject(VehicleService).getAll(), { initialValue: [] });
  readonly status = toSignal(this.nfc.status$, { initialValue: 'checking' });
  readonly scanning = toSignal(this.nfc.scanning$, { initialValue: false });
  readonly scan = toSignal(this.nfc.lastScan$, { initialValue: null });
  readonly writeResult = toSignal(this.nfc.lastWrite$, { initialValue: null });
  readonly error = toSignal(this.nfc.error$, { initialValue: '' });
  readonly selectedVehicleId = signal('');
  readonly operationMessage = signal('');
  readonly scanIcon = scanOutline;
  readonly radioIcon = radioOutline;
  readonly stopIcon = stopCircleOutline;

  readonly statusLabel = computed(() => ({
    checking: 'Comprobando NFC', ready: 'NFC listo', disabled: 'NFC desactivado',
    unsupported: 'NFC no compatible', web: 'Navegador sin Web NFC', 'web-ready': 'Web NFC listo',
  }[this.status()]));

  constructor() {
    effect(() => {
      if (!this.selectedVehicleId() && this.vehicles().length) this.selectedVehicleId.set(this.vehicles()[0].id);
    });
  }

  async startReading(): Promise<void> {
    this.operationMessage.set('');
    await this.nfc.startReading();
  }

  async writeTag(): Promise<void> {
    this.operationMessage.set('');
    if (!this.selectedVehicleId()) {
      this.operationMessage.set('Selecciona un vehículo antes de preparar la etiqueta.');
      return;
    }
    await this.nfc.startWriting(this.selectedVehicleId());
  }

  async stopScanning(): Promise<void> {
    await this.nfc.stopScanning();
  }

  async saveInspection(): Promise<void> {
    const scan = this.scan();
    if (!scan?.vehicleId) return;
    const payload = {
      vehicleId: scan.vehicleId,
      source: 'nfc',
      tagId: scan.tagId,
      checklist: ['carrocería', 'luces', 'neumáticos', 'documentos'],
      createdAt: new Date().toISOString(),
    };
    if (this.network.connected) {
      await this.offline.sendOperation('inspection.nfc.saved', payload);
      this.operationMessage.set('Inspección NFC registrada y sincronizada correctamente.');
    } else {
      await this.offline.savePendingOperation('inspection.nfc.saved', payload);
      this.operationMessage.set('Inspección guardada sin conexión. Se sincronizará cuando vuelva Internet.');
    }
  }

  openSettings(): Promise<void> { return this.nfc.openSettings(); }
  vehicleDetailLink(id: string): string[] {
    return this.auth.user()?.role === 'admin' ? ['/admin/flota', id] : ['/agente/vehiculos', id];
  }
}
