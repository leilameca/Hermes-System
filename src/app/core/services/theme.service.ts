import { Injectable, signal } from '@angular/core';

export type HermesTheme = 'light' | 'dark';

const STORAGE_KEY = 'hermes.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<HermesTheme>(this.restore());

  constructor() {
    this.apply(this.theme());
  }

  toggle() {
    this.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  set(theme: HermesTheme) {
    this.theme.set(theme);
    localStorage.setItem(STORAGE_KEY, theme);
    this.apply(theme);
  }

  private restore(): HermesTheme {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private apply(theme: HermesTheme) {
    document.documentElement.dataset['theme'] = theme;
    document.documentElement.style.colorScheme = theme;
  }
}
