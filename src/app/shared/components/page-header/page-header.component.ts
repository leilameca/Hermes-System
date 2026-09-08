import { Component, Input } from '@angular/core';

@Component({
  selector: 'hermes-page-header',
  standalone: true,
  template: `
    <header class="page-heading">
      <div>
        @if (eyebrow) { <p class="eyebrow">{{ eyebrow }}</p> }
        <h1>{{ title }}</h1>
        @if (description) { <p class="description">{{ description }}</p> }
      </div>
      <div class="heading-actions"><ng-content /></div>
    </header>
  `,
  styles: [`
    :host { display: block; margin-bottom: var(--hermes-space-8); }
    .page-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--hermes-space-6); }
    h1 { margin-top: var(--hermes-space-3); }
    .description { margin-top: var(--hermes-space-4); max-width: 620px; color: var(--hermes-text-secondary); font-size: var(--hermes-text-sm); line-height: 1.7; }
    .heading-actions { display: flex; flex-shrink: 0; gap: var(--hermes-space-3); }
    .heading-actions:empty { display: none; }
    @media (max-width: 767px) { .page-heading { align-items: flex-start; flex-direction: column; } }
  `],
})
export class PageHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() eyebrow = '';
  @Input() description = '';
}
