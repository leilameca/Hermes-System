import { test, expect } from '@playwright/test';
import { login } from './helpers';

test('versión publicada recarga bitácora y abre multimedia sin conexión', async ({ page, context }) => {
  await login(page);
  await page.goto('/admin/bitacora');
  await page.getByLabel('Título', { exact: true }).fill('Nota persistente sin red');
  await page.getByRole('button', { name: 'Guardar nota', exact: true }).click();
  await expect(page.locator('ion-item h2')).toHaveText('Nota persistente sin red');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 20000 }).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mi bitácora', exact: true })).toBeVisible();
  await expect(page.locator('ion-item h2')).toHaveText('Nota persistente sin red');
  await page.getByRole('button', { name: 'Más', exact: true }).click();
  await page.getByRole('link', { name: 'Multimedia', exact: true }).click();
  await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await expect.poll(() => page.locator('audio').evaluate((a: HTMLAudioElement) => a.currentTime)).toBeGreaterThan(0);
});
