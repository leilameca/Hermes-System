import { test, expect } from '@playwright/test';

import { login } from './helpers';

test('bitácora crea, edita, persiste al recargar, completa y elimina sin red', async ({ page, context }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await login(page);
  await page.getByRole('button', { name: 'Más', exact: true }).click();
  await page.getByRole('link', { name: 'Mi bitácora', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mi bitácora', exact: true })).toBeVisible();
  await page.getByLabel('Título', { exact: true }).fill('Revisar neumáticos');
  await page.getByLabel('Detalle de la operación').fill('Entrega del vehículo');
  await page.getByRole('button', { name: 'Guardar nota', exact: true }).click();
  await expect(page.locator('ion-item h2', { hasText: 'Revisar neumáticos' })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/bitacora.png' });
  await page.reload();
  await expect(page.locator('ion-item h2', { hasText: 'Revisar neumáticos' })).toBeVisible();
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Título', { exact: true }).fill('Neumáticos revisados');
  await page.getByRole('button', { name: 'Guardar nota', exact: true }).click();
  await expect(page.locator('ion-item h2', { hasText: 'Neumáticos revisados' })).toBeVisible();
  await page.getByRole('checkbox').click();
  await expect(page.locator('ion-item small')).toContainText('Completada');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(page.getByText('Aún no tienes notas.', { exact: false })).toBeVisible();
  expect(errors).toEqual([]);
});

test('audio local reproduce, pausa, cambia de pista y se detiene al navegar', async ({ page }) => {
  await login(page);
  await page.goto('/admin/multimedia');
  await expect(page.getByText('Ruta urbana', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/multimedia.png' });
  await expect.poll(() => page.locator('audio').evaluate((a: HTMLAudioElement) => a.currentTime)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await expect.poll(() => page.locator('audio').evaluate((a: HTMLAudioElement) => a.paused)).toBe(true);
  await page.getByRole('button', { name: 'Pista siguiente', exact: true }).click();
  await expect(page.locator('ion-card-title').first()).toHaveText('Viaje tranquilo');
  await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Más', exact: true }).click();
  await page.getByRole('link', { name: 'Mi bitácora', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mi bitácora', exact: true })).toBeVisible();
  for (const audio of await page.locator('audio').all()) expect(await audio.evaluate((a: HTMLAudioElement) => a.paused)).toBe(true);
});

test('tabs navegan y cliente y agente acceden a multimedia y bitácora', async ({ page }) => {
  await login(page, 'agent');
  await page.locator('ion-tab-button', { hasText: 'Operaciones' }).click();
  await expect(page).toHaveURL(/\/agente\/operaciones/);
  await page.getByRole('button', { name: 'Más', exact: true }).click();
  await page.getByRole('link', { name: 'Multimedia', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reproducir', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Más', exact: true }).click();
  await page.getByRole('link', { name: 'Mi bitácora', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mi bitácora', exact: true })).toBeVisible();
});

test('cámara web presenta captura con dispositivo virtual de pruebas', async ({ page }) => {
  await login(page); await page.goto('/admin/bitacora');
  await page.getByRole('button', { name: 'Tomar fotografía', exact: true }).click();
  await expect(page.locator('pwa-camera-modal')).toBeVisible();
  // La prueba usa una cámara virtual de Chromium, no acredita una captura Android física.
  const shutter = page.locator('pwa-camera').locator('.shutter-button');
  await expect(shutter).toBeVisible(); await shutter.click();
  await expect(page.locator('pwa-camera').locator('.accept-use')).toBeVisible();
  await page.locator('pwa-camera').locator('.accept-use').click();
  await expect(page.getByAltText('Fotografía adjunta a la nota')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/camara.png' });
  await page.getByLabel('Título', { exact: true }).fill('Captura virtual');
  await page.getByRole('button', { name: 'Guardar nota', exact: true }).click();
  await expect(page.getByText('Nota guardada en este dispositivo.', { exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByAltText('Evidencia de la nota')).toBeVisible();
});

test('cliente usa GPS, geocerca y API GET y POST con caché offline', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']); await context.setGeolocation({ latitude: 19.4517, longitude: -70.6970, accuracy: 10 });
  let gets = 0, posts = 0;
  await page.route('https://nominatim.openstreetmap.org/**', async route => {
    expect(route.request().method()).toBe('GET'); gets++;
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ place_id: 1, display_name: 'Monumento de Santiago', lat: '19.4500', lon: '-70.7000' }]) });
  });
  await page.route('https://overpass-api.de/**', async route => {
    expect(route.request().method()).toBe('POST'); expect(route.request().postData()).toContain('data='); posts++;
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ elements: [{ type: 'node', id: 1, lat: 19.4520, lon: -70.6975, tags: { name: 'Café de prueba', amenity: 'cafe' } }] }) });
  });
  await login(page, 'customer'); await page.goto('/cliente/gps');
  await page.getByRole('button', { name: 'Mi ubicación', exact: true }).click();
  await expect(page.getByText('19.451700', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Definir zona aquí', exact: true }).click();
  await expect(page.getByText('Dentro de la zona', { exact: true })).toBeVisible();
  await page.getByLabel('Lugar que deseas buscar').fill('Monumento');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.getByRole('button', { name: /Monumento de Santiago/ })).toBeVisible();
  await page.getByRole('button', { name: 'Lugares cercanos', exact: true }).click();
  await expect(page.getByRole('button', { name: /Café de prueba/ })).toBeVisible();
  expect(gets).toBe(1); expect(posts).toBe(1);
  await page.screenshot({ path: 'docs/screenshots/gps.png' });
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.getByText('Resultados guardados en este dispositivo.', { exact: false })).toBeVisible();
  expect(gets).toBe(1);
  await page.getByRole('button', { name: 'Más', exact: true }).click();
  await page.getByRole('link', { name: 'Multimedia', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reproducir', exact: true })).toBeVisible();
});

test('multimedia muestra un error controlado si el archivo no está disponible', async ({ page }) => {
  await login(page);
  await page.route('**/assets/audio/**', route => route.fulfill({ status: 404, body: 'No disponible' }));
  await page.goto('/admin/multimedia');
  await expect(page.getByRole('alert')).toContainText('No se pudo cargar');
  await expect(page.getByText('Cargando audio…', { exact: false })).not.toBeVisible();
});

test('deslizar una nota abre opciones y arrastrar hacia abajo actualiza', async ({ page }) => {
  await login(page); await page.goto('/admin/bitacora');
  await page.getByLabel('Título', { exact: true }).fill('Nota de gestos');
  await page.getByRole('button', { name: 'Guardar nota', exact: true }).click();
  const sliding = page.locator('ion-item-sliding'); await expect(sliding).toBeVisible();
  await sliding.scrollIntoViewIfNeeded(); const box = (await sliding.boundingBox())!;
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width - 40, y: box.y + box.height / 2 }] });
  for (let step = 1; step <= 8; step++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + box.width - 40 - step * 20, y: box.y + box.height / 2 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => sliding.evaluate((el: any) => el.getSlidingRatio())).toBeGreaterThan(0.5);
  await sliding.evaluate((el: any) => el.close());
  await page.locator('app-notes ion-content').evaluate((el: any) => el.scrollToTop(0));
  await page.locator('ion-refresher').evaluate(el => el.addEventListener('ionRefresh', () => { (window as any).refreshObserved = true; }, { once: true }));
  const content = (await page.locator('app-notes ion-content').boundingBox())!;
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: content.x + 190, y: content.y + 30 }] });
  for (let step = 1; step <= 12; step++) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: content.x + 190, y: content.y + 30 + step * 15 }] });
    await page.waitForTimeout(16);
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => (window as any).refreshObserved)).toBe(true);
  await expect(sliding.locator('h2')).toHaveText('Nota de gestos');
});
