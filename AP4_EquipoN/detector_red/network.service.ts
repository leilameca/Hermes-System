import { Injectable, Injector, OnDestroy, inject } from '@angular/core';
import { Network, ConnectionStatus } from '@capacitor/network';
import { PluginListenerHandle } from '@capacitor/core';
import { BehaviorSubject, distinctUntilChanged, map } from 'rxjs';
import { OfflineService } from './offline.service';

// Detecta y comparte el estado de red de la aplicación
@Injectable({ providedIn: 'root' })
export class NetworkService implements OnDestroy {
  // Permite obtener la cola offline solo cuando hace falta
  private readonly injector = inject(Injector);

  // Guarda el estado de red actual
  private readonly statusSubject = new BehaviorSubject<ConnectionStatus>({
    connected: navigator.onLine,
    connectionType: 'unknown',
  });
  private listener?: PluginListenerHandle;
  private initialized = false;
  private lastConnected = navigator.onLine;

  // Expone el estado completo y sus valores principales
  readonly status$ = this.statusSubject.asObservable();
  readonly connected$ = this.status$.pipe(map(status => status.connected), distinctUntilChanged());
  readonly connectionType$ = this.status$.pipe(map(status => status.connectionType), distinctUntilChanged());

  constructor() {
    // Inicia la lectura de conectividad al crear el servicio
    void this.init();
  }

  get connected() {
    return this.statusSubject.value.connected;
  }

  get connectionType() {
    return this.statusSubject.value.connectionType;
  }

  get currentStatus() {
    return this.statusSubject.value;
  }

  async init() {
    // Evita registrar el mismo listener más de una vez
    if (this.initialized) return;
    this.initialized = true;
    const initial = await Network.getStatus();
    this.updateStatus(initial);

    // Escucha los cambios de conexión del dispositivo
    this.listener = await Network.addListener('networkStatusChange', status => this.updateStatus(status));
  }

  private updateStatus(status: ConnectionStatus) {
    // Actualiza el estado disponible para toda la aplicación
    const wasOffline = !this.lastConnected;
    this.lastConnected = status.connected;
    this.statusSubject.next(status);
    if (wasOffline && status.connected) {
      // Sincroniza la cola cuando regresa Internet
      void this.injector.get(OfflineService).syncPendingOperations();
    }
  }

  ngOnDestroy() {
    // Elimina el listener cuando el servicio deja de usarse
    void this.listener?.remove();
    this.listener = undefined;
    this.initialized = false;
  }
}
