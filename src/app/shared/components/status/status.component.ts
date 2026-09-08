import { Component, Input } from '@angular/core';

export type StatusTone = 'neutral' | 'info' | 'warning' | 'critical';

@Component({
  selector: 'hermes-status',
  standalone: true,
  template: '<span class="status" [attr.data-tone]="tone">{{ label }}</span>',
  styles: [`
    :host { display: inline-flex; }
    .status { display: inline-flex; align-items: center; gap: var(--hermes-space-2); color: var(--hermes-graphite); font-size: var(--hermes-text-xs); font-weight: 600; line-height: 1.5; }
    .status::before { content: ''; width: 2px; height: 14px; flex-shrink: 0; background: var(--hermes-muted); }
    .status[data-tone='info']::before { background: var(--hermes-blue); }
    .status[data-tone='warning']::before { background: var(--hermes-amber); }
    .status[data-tone='critical']::before { background: var(--hermes-critical); }
  `],
})
export class StatusComponent {
  // El texto comunica el estado aunque no se distinga el color.
  @Input({ required: true }) label = '';
  @Input() tone: StatusTone = 'neutral';
}
