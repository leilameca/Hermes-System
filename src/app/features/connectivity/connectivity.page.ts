import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { IonContent } from '@ionic/angular/standalone';
import { NetworkService } from '../../core/services/network.service';
import { OfflineService } from '../../core/services/offline.service';

@Component({
  selector: 'app-connectivity',
  standalone: true,
  imports: [DatePipe, IonContent],
  template: `
    <ion-content>
      <main class="page connectivity-page">
        <section class="connectivity-hero">
          <p class="eyebrow">Conectividad</p>
          <h1>Estado de red y cola local.</h1>
          <p>Hermes mantiene las operaciones importantes disponibles aunque el dispositivo pierda conexión.</p>
        </section>

        <section class="status-grid" aria-label="Estado de conectividad">
          <article>
            <span>Estado actual</span>
            <strong>{{ connected() ? 'Conectado' : 'Sin conexión' }}</strong>
          </article>
          <article>
            <span>Tipo de conexión</span>
            <strong>{{ connectionType() }}</strong>
          </article>
          <article>
            <span>Operaciones pendientes</span>
            <strong>{{ pendingCount() }}</strong>
          </article>
          <article>
            <span>Última sincronización</span>
            <strong>{{ lastSync() ? (lastSync() | date:'dd MMM, HH:mm') : 'Sin registros' }}</strong>
          </article>
        </section>

        <section class="panel stack">
          <div>
            <p class="eyebrow">Acción de prueba</p>
            <h2>Guardar inspección de prueba</h2>
          </div>
          <p class="text-secondary">Usa la misma lógica que una inspección real: si hay conexión se procesa al momento; si no, queda guardada en este dispositivo.</p>
          <button class="button" type="button" (click)="saveTestInspection()">Guardar inspección de prueba</button>
          @if (message()) { <p class="notice" role="status">{{ message() }}</p> }
        </section>
      </main>
    </ion-content>
  `,
  styles: [`
    .connectivity-page { display: grid; gap: 24px; }
    .connectivity-hero { display: grid; gap: 10px; padding: 24px; border: 1px solid var(--hermes-border); border-radius: 8px; background: linear-gradient(135deg,var(--hermes-navy),#173d83); color: white; }
    .connectivity-hero h1 { color: white; letter-spacing: 0; }
    .connectivity-hero p:not(.eyebrow) { max-width: 620px; color: rgba(255,255,255,.76); }
    .status-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 14px; }
    .status-grid article { display: grid; gap: 8px; min-height: 100px; padding: 18px; border: 1px solid var(--hermes-border); border-radius: 6px; background: var(--hermes-surface); }
    .status-grid span { color: var(--hermes-text-secondary); font-size: 13px; }
    .status-grid strong { color: var(--hermes-text-strong); font-size: 22px; }
    .panel { padding: 20px; border: 1px solid var(--hermes-border); border-radius: 6px; background: var(--hermes-surface); }
    .button { display: inline-flex; align-items: center; justify-content: center; justify-self: start; min-height: 44px; padding: 10px 16px; border: 1px solid var(--hermes-blue); border-radius: 4px; background: var(--hermes-blue); color: white; cursor: pointer; }
    @media(max-width:960px) { .status-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } }
    @media(max-width:560px) { .status-grid { grid-template-columns: 1fr; } }
  `],
})
export class ConnectivityPage {
  // Lee el estado de Internet del dispositivo
  private readonly network = inject(NetworkService);

  // Controla las operaciones guardadas en la cola local
  private readonly offline = inject(OfflineService);

  // Convierte los cambios de los servicios en valores para la pantalla
  readonly connected = toSignal(this.network.connected$, { initialValue: this.network.connected });
  readonly connectionType = toSignal(this.network.connectionType$, { initialValue: this.network.connectionType });
  readonly pendingCount = toSignal(this.offline.pendingCount$, { initialValue: 0 });
  readonly lastSync = toSignal(this.offline.lastSync$, { initialValue: '' });
  readonly message = signal('');

  async saveTestInspection() {
    // Prepara una inspección sencilla para probar la conectividad
    const payload = {
      vehicleId: 'vehicle-001',
      checklist: ['carroceria', 'luces', 'neumaticos', 'documentos'],
      createdAt: new Date().toISOString(),
    };
    if (this.network.connected) {
      // Procesa la inspección al momento cuando hay conexión
      await this.offline.sendOperation('inspection.saved', payload);
      this.message.set('Inspección guardada correctamente.');
      return;
    }
    // Guarda la inspección en el dispositivo cuando no hay conexión
    await this.offline.savePendingOperation('inspection.saved', payload);
    this.message.set('Sin conexión. Guardamos tus cambios en este dispositivo y se sincronizarán automáticamente cuando recuperes Internet.');
  }
}
