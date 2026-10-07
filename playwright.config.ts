import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', testMatch: 'final-project.spec.ts', timeout: 45000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:4210', viewport: { width: 390, height: 844 }, screenshot: 'only-on-failure', trace: 'retain-on-failure',
    launchOptions: { executablePath: process.env['CHROME_EXECUTABLE'], args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } },
  webServer: { command: 'npm start -- --host 127.0.0.1 --port 4210', url: 'http://127.0.0.1:4210', reuseExistingServer: !process.env['CI'], timeout: 120000 },
});
