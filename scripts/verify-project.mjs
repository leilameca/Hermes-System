// Revision rapida de los archivos importantes del proyecto.
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');

const [routes, demoRoutes, manifest, packageFile] = await Promise.all([
  read('src/app/app.routes.ts'),
  read('src/app/features/demo/demo.routes.ts'),
  read('android/app/src/main/AndroidManifest.xml'),
  read('package.json'),
]);

for (const route of ['login', 'registro/:empresa', 'cliente', 'agente', 'admin', 'super-admin']) {
  assert.ok(routes.includes(`path: '${route}'`), `Falta la ruta ${route}`);
}

for (const route of ['escanear', 'gps', 'flota', 'multimedia', 'bitacora']) {
  assert.ok(demoRoutes.includes(`'${route}'`), `Falta la ruta ${route}`);
}

for (const permission of ['android.permission.INTERNET', 'android.permission.NFC', 'android.permission.ACCESS_FINE_LOCATION']) {
  assert.ok(manifest.includes(permission), `Falta el permiso ${permission}`);
}

for (const dependency of ['@capgo/capacitor-nfc', '@capacitor/geolocation', '@capacitor/network', '@capacitor/camera']) {
  assert.ok(packageFile.includes(`"${dependency}"`), `Falta la dependencia ${dependency}`);
}

await access('src/assets/brand/hermes-logo.jpeg');
await access('supabase/migrations/202609220004_customer_registration.sql');
await access('src/assets/audio/ruta-urbana.mp3');
await access('src/assets/audio/viaje-tranquilo.mp3');
await access('src/app/features/notes/notes.page.ts');

console.log('OK: estructura, rutas, permisos, plugins y medios locales. No sustituye las pruebas funcionales o físicas.');
