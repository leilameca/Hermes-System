import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({
  ...base, testMatch: 'pwa.spec.ts',
  webServer: { command: 'node scripts/preview.mjs', url: 'http://127.0.0.1:4210', reuseExistingServer: false, timeout: 30000 },
});
