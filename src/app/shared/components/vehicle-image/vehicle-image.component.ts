import { Component, Input, OnChanges } from '@angular/core';

@Component({
  selector: 'hermes-vehicle-image',
  standalone: true,
  template: `
    @if (src && !failed) {
      <img [src]="src" [alt]="alt" width="1536" height="1024"
        [attr.loading]="priority ? 'eager' : 'lazy'"
        [attr.fetchpriority]="priority ? 'high' : 'auto'"
        decoding="async" (error)="failed = true">
    } @else {
      <div class="fallback" role="img" [attr.aria-label]="alt || 'Vehículo sin fotografía'">
        <span>HERMES / FLOTA</span>
        <p>Fotografía no disponible</p>
      </div>
    }
  `,
  styles: [`
    :host { display: block; aspect-ratio: 3 / 2; overflow: hidden; background: #EDEBE5; }
    img { width: 100%; height: 100%; object-fit: cover; }
    .fallback { height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: var(--hermes-space-6); text-align: center; gap: var(--hermes-space-3); color: var(--hermes-text-secondary); }
    .fallback span { font-size: var(--hermes-text-xs); letter-spacing: 0.15em; }
    .fallback p { font-size: var(--hermes-text-sm); }
  `],
})
export class VehicleImageComponent implements OnChanges {
  @Input() src?: string;
  @Input() alt = '';
  @Input() priority = false;
  failed = false;

  // Se vuelve a intentar si la ficha recibe otra imagen.
  ngOnChanges(): void { this.failed = false; }
}
