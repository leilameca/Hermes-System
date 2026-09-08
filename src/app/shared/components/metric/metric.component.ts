import { Component, Input } from '@angular/core';

@Component({
  selector: 'hermes-metric',
  standalone: true,
  template: `
    <dl>
      <dt>{{ label }}</dt>
      <dd>{{ value }}</dd>
    </dl>
    @if (description) { <p>{{ description }}</p> }
  `,
  styles: [`
    :host { display: block; padding: var(--hermes-space-6); min-width: 0; }
    dt { color: var(--hermes-text-secondary); font-size: var(--hermes-text-sm); }
    dd { margin: var(--hermes-space-2) 0; color: var(--hermes-navy); font-size: clamp(2rem, 3vw, 2.75rem); font-weight: 500; line-height: 1.2; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
    p { font-size: var(--hermes-text-xs); color: var(--hermes-text-secondary); }
    @media (max-width: 767px) { :host { padding: var(--hermes-space-5) var(--hermes-space-3); } }
  `],
})
export class MetricComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value: string | number = 0;
  @Input() description = '';
}
