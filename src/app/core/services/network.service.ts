import { Injectable, Injector, OnDestroy, inject } from '@angular/core';
import { Network, ConnectionStatus } from '@capacitor/network';
import { PluginListenerHandle } from '@capacitor/core';
import { BehaviorSubject, distinctUntilChanged, map } from 'rxjs';
import { OfflineService } from './offline.service';

@Injectable({ providedIn: 'root' })
export class NetworkService implements OnDestroy {
  private readonly injector = inject(Injector);
  private readonly statusSubject = new BehaviorSubject<ConnectionStatus>({
    connected: navigator.onLine,
    connectionType: 'unknown',
  });
  private listener?: PluginListenerHandle;
  private initialized = false;
  private lastConnected = navigator.onLine;

  readonly status$ = this.statusSubject.asObservable();
  readonly connected$ = this.status$.pipe(map(status => status.connected), distinctUntilChanged());
  readonly connectionType$ = this.status$.pipe(map(status => status.connectionType), distinctUntilChanged());

  constructor() {
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
    if (this.initialized) return;
    this.initialized = true;
    const initial = await Network.getStatus();
    this.updateStatus(initial);
    this.listener = await Network.addListener('networkStatusChange', status => this.updateStatus(status));
  }

  private updateStatus(status: ConnectionStatus) {
    const wasOffline = !this.lastConnected;
    this.lastConnected = status.connected;
    this.statusSubject.next(status);
    if (wasOffline && status.connected) {
      void this.injector.get(OfflineService).syncPendingOperations();
    }
  }

  ngOnDestroy() {
    void this.listener?.remove();
    this.listener = undefined;
    this.initialized = false;
  }
}
