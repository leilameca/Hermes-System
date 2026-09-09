import { Component, OnDestroy, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { NetworkService } from '../../../core/services/network.service';
import { OfflineService } from '../../../core/services/offline.service';

@Component({
  selector: 'hermes-offline-banner',
  standalone: true,
  template: `
    @if (visible()) {
      <aside class="offline-banner" [class.recovered]="mode() === 'recovered'" role="status" aria-live="polite">
        <strong>{{ mode() === 'offline' ? 'Sin conexión' : 'Conexión recuperada' }}</strong>
        <span>{{ mode() === 'offline' ? 'Tus cambios se guardarán en este dispositivo.' : 'Sincronizando cambios pendientes...' }}</span>
        @if (pendingCount()) { <small>{{ pendingCount() }} pendientes</small> }
      </aside>
    }
  `,
  styles: [`
    :host { display: block; }
    .offline-banner { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; min-height: 42px; padding: 9px 28px; border-bottom: 1px solid rgba(208,138,50,.35); background: var(--hermes-amber-light); color: var(--hermes-navy); font-size: 13px; }
    .offline-banner strong { font-weight: 800; }
    .offline-banner span { color: var(--hermes-graphite); }
    .offline-banner small { font-weight: 800; color: var(--hermes-blue); }
    .offline-banner.recovered { border-color: var(--hermes-border); background: var(--hermes-blue-light); }
    @media(max-width:767px) {
      .offline-banner { grid-template-columns: 1fr auto; padding-inline: 16px; }
      .offline-banner span { grid-column: 1 / -1; font-size: 12px; }
    }
  `],
})
export class OfflineBannerComponent implements OnDestroy {
  private readonly network = inject(NetworkService);
  private readonly offline = inject(OfflineService);
  private readonly subscription = new Subscription();
  private hideTimer?: number;
  private hasBeenOffline = false;

  readonly visible = signal(false);
  readonly mode = signal<'offline' | 'recovered'>('offline');
  readonly pendingCount = signal(0);

  constructor() {
    this.subscription.add(this.offline.pendingCount$.subscribe(count => this.pendingCount.set(count)));
    this.subscription.add(this.network.connected$.subscribe(connected => {
      window.clearTimeout(this.hideTimer);
      if (!connected) {
        this.hasBeenOffline = true;
        this.mode.set('offline');
        this.visible.set(true);
        return;
      }
      if (!this.hasBeenOffline) return;
      this.mode.set('recovered');
      this.visible.set(true);
      this.hideTimer = window.setTimeout(() => this.visible.set(false), 3200);
    }));
  }

  ngOnDestroy() {
    window.clearTimeout(this.hideTimer);
    this.subscription.unsubscribe();
  }
}
