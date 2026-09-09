// Smoke test local: sirve unicamente los archivos compilados y usa Chrome headless.
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const root = resolve('www');
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const users = [
  ['cliente@hermes.app', '/cliente/inicio', ['Inicio', 'Explorar', 'Reservas', 'Perfil']],
  ['agente@hermes.app', '/agente/inicio', ['Inicio', 'Operaciones', 'Escanear', 'Incidentes', 'Perfil']],
  ['admin@hermes.app', '/admin/dashboard', ['Resumen', 'Flota', 'Reservas', 'Operaciones', 'Más']],
  ['superadmin@hermes.app', '/super-admin/dashboard', ['Resumen', 'Empresas', 'Planes', 'Suscripciones', 'Plataforma']],
];
const routes = {
  cliente: ['inicio', 'explorar', 'resultados', 'vehiculos/vehicle-001', 'reservas/nueva', 'reservas', 'reservas/reservation-001', 'contratos', 'facturas', 'incidentes', 'perfil'],
  agente: ['inicio', 'operaciones', 'escanear', 'vehiculos/vehicle-001', 'entrega/vehicle-001', 'entrega/vehicle-001/checklist', 'entrega/vehicle-001/evidencias', 'entrega/vehicle-001/firma', 'devolucion/vehicle-001', 'devolucion/vehicle-001/checklist', 'devolucion/vehicle-001/evidencias', 'devolucion/vehicle-001/firma', 'incidentes', 'perfil'],
  admin: ['dashboard', 'flota', 'flota/vehicle-001', 'reservas', 'operaciones', 'clientes', 'inspecciones', 'contratos', 'facturacion', 'mantenimiento', 'configuracion', 'perfil'],
  'super-admin': ['dashboard', 'empresas', 'empresas/tenant-001', 'planes', 'suscripciones', 'plataforma', 'perfil'],
};
const utilityRoutes = ['/sistema-visual', '/conectividad'];

const server = createServer(async (req, res) => {
  const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try {
    const data = await readFile(path);
    res.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream');
    res.end(data);
  } catch {
    res.setHeader('Content-Type', 'text/html');
    res.end(await readFile(resolve(root, 'index.html')));
  }
});

await new Promise(done => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}`;
const profile = await mkdtemp(resolve(tmpdir(), 'hermes-navigation-'));
const chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-pipe', `--user-data-dir=${profile}`], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'], windowsHide: true });
let sequence = 0, buffer = '';
const pending = new Map();
const errors = [];

chrome.stdio[4].on('data', chunk => {
  buffer += chunk.toString();
  let boundary;
  while ((boundary = buffer.indexOf('\0')) >= 0) {
    const message = JSON.parse(buffer.slice(0, boundary));
    buffer = buffer.slice(boundary + 1);
    if (message.id) {
      const handler = pending.get(message.id);
      if (handler) {
        pending.delete(message.id);
        message.error ? handler.reject(message.error) : handler.resolve(message.result);
      }
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text + ' ' + (message.params.exceptionDetails.exception?.description || ''));
  }
});

function send(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 15000);
    pending.set(id, { resolve: value => { clearTimeout(timeout); resolve(value); }, reject: error => { clearTimeout(timeout); reject(error); } });
    chrome.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + '\0');
  });
}

let session;
const evaluate = async expression => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, session);
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || 'Evaluation failed');
  return result.result.value;
};
async function until(expression) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate(expression)) return;
    await new Promise(done => setTimeout(done, 50));
  }
  throw new Error('Timed out: ' + expression);
}
async function open(path) {
  await send('Page.navigate', { url: base + path }, session);
  const expected = path === '/' ? 'true' : `location.pathname === ${JSON.stringify(path.split('?')[0])}`;
  await until(`${expected} && !!document.querySelector('h1, app-not-found')`);
}
const clickText = text => evaluate(`(() => { const el = [...document.querySelectorAll('a,button')].find(el => el.textContent.trim() === ${JSON.stringify(text)} && el.getBoundingClientRect().height); if (!el) throw Error('Missing control: ' + ${JSON.stringify(text)}); el.click(); })()`);

try {
  const target = await send('Target.createTarget', { url: 'about:blank' });
  session = (await send('Target.attachToTarget', { targetId: target.targetId, flatten: true })).sessionId;
  await send('Runtime.enable', {}, session);
  await send('Page.enable', {}, session);
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }, session);

  await open('/');
  await until("location.pathname === '/login'");
  assert.equal(await evaluate("document.body.innerText.includes('Demo Role Selector')"), false);
  assert.equal(await evaluate("document.querySelector('h1')?.textContent.trim() === 'Movilidad bajo control.'"), true);
  assert.equal(await evaluate("document.querySelector('#login-title')?.textContent.trim() === 'Bienvenido a Hermes'"), true);
  assert.equal(await evaluate("document.querySelector('.logo')?.naturalWidth > 0"), true);
  assert.equal(await evaluate("document.querySelectorAll('.profiles button').length"), 4);
  await evaluate("document.querySelector('.profiles button').click()");
  assert.equal(await evaluate("document.querySelector('input[name=email]').value === 'cliente@hermes.app' && document.querySelector('input[name=password]').value === 'Hermes123' && document.querySelector('input[name=password]').type === 'text' && location.pathname === '/login'"), true);

  await evaluate("(() => { const form = document.querySelector('form'); form.querySelector('input[name=email]').value='nadie@hermes.demo'; form.querySelector('input[name=email]').dispatchEvent(new Event('input',{bubbles:true})); form.querySelector('input[name=password]').value='mal'; form.querySelector('input[name=password]').dispatchEvent(new Event('input',{bubbles:true})); form.querySelector('button[type=submit]').click(); })()");
  await until("document.body.innerText.includes('El correo o la contraseña no coinciden.')");

  for (const [email, home] of users) {
    await evaluate("localStorage.clear()");
    await open('/login');
    await evaluate(`(() => { const form = document.querySelector('form'); form.querySelector('input[name=email]').value=${JSON.stringify(email)}; form.querySelector('input[name=email]').dispatchEvent(new Event('input',{bubbles:true})); form.querySelector('input[name=password]').value='Hermes123'; form.querySelector('input[name=password]').dispatchEvent(new Event('input',{bubbles:true})); form.querySelector('button[type=submit]').click(); })()`);
    await until(`location.pathname === ${JSON.stringify(home)} && !!document.querySelector('.account-trigger')`);
    await evaluate("document.querySelector('.account-trigger').click()");
    await until("document.body.innerText.includes('Cerrar sesión')");
    await clickText('Cerrar sesión');
    await until("location.pathname === '/login'");
  }

  let count = 0;
  for (const [role, paths] of Object.entries(routes)) {
    await evaluate(`localStorage.setItem('hermes.mock.session', ${JSON.stringify(role === 'super-admin' ? 'superadmin@hermes.app' : role + '@hermes.app')})`);
    for (const path of paths) {
      await open(`/${role}/${path}`);
      assert.ok(await evaluate("document.querySelector('main').innerText.length > 140"), path);
      assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false, path);
      count++;
    }
  }
  await evaluate("localStorage.setItem('hermes.mock.session', 'cliente@hermes.app')");
  await open('/cliente/inicio');
  assert.ok(await evaluate("document.querySelector('.mobile-space').getBoundingClientRect().width > 700"), 'La vista de cliente debe aprovechar el escritorio');

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }, session);
  for (const [email, home, tabs] of users) {
    await evaluate(`localStorage.setItem('hermes.mock.session', ${JSON.stringify(email)})`);
    await open(home);
    const bottomText = await evaluate("document.querySelector('.bottom').innerText");
    for (const tab of tabs) assert.ok(bottomText.includes(tab), `${email}: ${tab}`);
    assert.equal(await evaluate("document.body.innerText.includes('Cambiar rol') || document.body.innerText.includes('DEMO') || document.body.innerText.includes('Datos ficticios')"), false);
    assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false);
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.user-name')).display"), 'none');
  }

  for (const width of [768, 390]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: width === 390 ? 844 : 1024, deviceScaleFactor: 1, mobile: width < 600 }, session);
    for (const [role, paths] of Object.entries(routes)) {
      await evaluate(`localStorage.setItem('hermes.mock.session', ${JSON.stringify(role === 'super-admin' ? 'superadmin@hermes.app' : role + '@hermes.app')})`);
      for (const path of paths) {
        await open(`/${role}/${path}`);
        assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false, `${width}px: ${role}/${path}`);
      }
    }
    for (const path of utilityRoutes) {
      await open(path);
      assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false, `${width}px: ${path}`);
    }
  }

  assert.deepEqual(errors, []);
  console.log(`OK: login inicial, 4 usuarios, logout desde perfil, ${count} rutas y responsive a 1440, 768 y 390 px.`);
} finally {
  chrome.kill('SIGKILL');
  chrome.stdio[3]?.destroy();
  chrome.stdio[4]?.destroy();
  await new Promise(done => server.close(done));
  if (profile.startsWith(resolve(tmpdir()) + sep) && profile.includes('hermes-navigation-')) await rm(profile, { recursive: true, force: true, maxRetries: 5 }).catch(() => {});
}
